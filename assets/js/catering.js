(() => {
  const form = document.getElementById('cateringForm');
  if (!form) return;

  const date = form.elements.event_date;
  const sandwiches = form.elements.sandwich_amount;
  const sweets = form.elements.sweet_treat_amount;
  const errorBox = document.getElementById('cateringFormError');
  const button = form.querySelector('button[type="submit"]');
  const buttonText = button.textContent;
  let sending = false;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type).value;
  date.min = `${value('year')}-${value('month')}-${value('day')}`;

  function validateQuantities() {
    sandwiches.setCustomValidity(Number(sandwiches.value) === 0 && Number(sweets.value) === 0
      ? 'Please request at least one sandwich or sweet treat.' : '');
  }
  sandwiches.addEventListener('input', validateQuantities);
  sweets.addEventListener('input', validateQuantities);
  validateQuantities();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    validateQuantities();
    if (!form.reportValidity()) return;

    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    errorBox.classList.add('d-none');

    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form) });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || 'We could not send your enquiry. Please try again or email feedthecrew@loomdeli.com.');
      }
      bootstrap.Modal.getOrCreateInstance(document.getElementById('cateringSuccessModal')).show();
      form.reset();
      validateQuantities();
    } catch (error) {
      errorBox.textContent = error.message || 'We could not send your enquiry. Please try again.';
      errorBox.classList.remove('d-none');
      errorBox.focus();
    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = buttonText;
      form.removeAttribute('aria-busy');
    }
  });
})();
