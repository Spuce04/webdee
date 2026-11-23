class ValidationError extends Error {}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function field(formData, name, label, maxLength, required = false) {
  const value = formData.get(name) ?? '';
  if (typeof value !== 'string') {
    throw new ValidationError(`Please check your ${label}.`);
  }
  const normalized = value.replace(/\r\n?/g, '\n');
  if (normalized.length > maxLength) throw new ValidationError(`Please check your ${label}.`);
  const trimmed = normalized.trim();
  if (required && !trimmed) throw new ValidationError(`Please enter your ${label}.`);
  return trimmed;
}

function todayInLondon() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function quantity(formData, name, label) {
  const value = field(formData, name, label, 20, true);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new ValidationError(`Please enter a whole number of zero or more for ${label}.`);
  }
  return number;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function emailContent(heading, fields) {
  return {
    html: `<h2>${escapeHTML(heading)}</h2>` + fields.map(([label, value]) =>
      `<p><strong>${escapeHTML(label)}:</strong> ${escapeHTML(value).replace(/\r\n|\r|\n/g, '<br>')}</p>`
    ).join(''),
    text: heading + '\n\n' + fields.map(([label, value]) => `${label}: ${value}`).join('\n\n'),
  };
}

export async function onRequestPost({ request, env }) {
  try {
    if (Number(request.headers.get('Content-Length')) > 32768) {
      return json({ error: 'Your message is too long. Please shorten it and try again.' }, 413);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: 'Please submit the enquiry form again.' }, 400);
    }

    // A hidden field catches basic automated submissions without adding a CAPTCHA.
    if (formData.get('website')) return json({ success: true });

    const formType = field(formData, 'form_type', 'enquiry type', 20);
    if (formType && formType !== 'catering') {
      throw new ValidationError('Please submit a supported enquiry form.');
    }
    const email = field(formData, 'email', 'email address', 254, true);
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
      throw new ValidationError('Please enter a valid email address.');
    }
    const phone = field(formData, 'phone', 'phone number', 40);
    if (/[\r\n]/.test(phone)) throw new ValidationError('Please check your phone number.');
    const message = field(formData, 'message', 'message', 5000, true);
    let subject;
    let content;

    if (formType === 'catering') {
      const postcode = field(formData, 'postcode', 'postcode', 12, true).toUpperCase().replace(/\s/g, '');
      if (!/^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/.test(postcode)) {
        throw new ValidationError('Please enter a UK postcode, for example DD1 5EG.');
      }
      const formattedPostcode = `${postcode.slice(0, -3)} ${postcode.slice(-3)}`;
      const eventDate = field(formData, 'event_date', 'event date', 10, true);
      const parsedDate = new Date(`${eventDate}T12:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== eventDate || eventDate < todayInLondon()) {
        throw new ValidationError('Please choose today or a future date for your event.');
      }
      const sandwiches = quantity(formData, 'sandwich_amount', 'sandwiches');
      const sweets = quantity(formData, 'sweet_treat_amount', 'sweet treats');
      if (sandwiches === 0 && sweets === 0) {
        throw new ValidationError('Please request at least one sandwich or sweet treat.');
      }
      const displayDate = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric',
      }).format(parsedDate);
      subject = `Catering enquiry – ${eventDate} – ${formattedPostcode}`;
      content = emailContent('New catering enquiry', [
        ['Email', email], ['Phone', phone || 'Not provided'], ['Postcode', formattedPostcode],
        ['Event date', displayDate], ['Sandwich amount', sandwiches], ['Sweet treat amount', sweets],
        ['Message', message],
      ]);
    } else {
      // Preserve the existing contact form, including interest=catering enquiries.
      const name = field(formData, 'name', 'name', 120, true);
      const interest = field(formData, 'interest', 'enquiry type', 20, true);
      if (!['general', 'catering', 'feedback', 'other'].includes(interest)) {
        throw new ValidationError('Please select an enquiry type.');
      }
      subject = `New Enquiry from ${name.replace(/[\r\n]+/g, ' ')}`;
      content = emailContent('New contact enquiry', [
        ['Name', name], ['Email', email], ['Phone', phone || 'Not provided'],
        ['Interest', interest], ['Message', message],
      ]);
    }

    if (!env?.RESEND_API_KEY) {
      return json({ error: 'We could not send your enquiry. Please email feedthecrew@loomdeli.com.' }, 503);
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'enquiries@webdee.co.uk', to: 'feedthecrew@loomdeli.com',
        reply_to: email, subject, ...content,
      }),
    });
    if (!response.ok) {
      return json({ error: 'We could not send your enquiry. Please try again or email feedthecrew@loomdeli.com.' }, 502);
    }
    return json({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) return json({ error: error.message }, 400);
    return json({ error: 'We could not send your enquiry. Please try again or email feedthecrew@loomdeli.com.' }, 500);
  }
}
