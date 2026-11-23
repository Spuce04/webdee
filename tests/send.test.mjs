import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/send.js';

const env = { RESEND_API_KEY: 'test-placeholder' };
const catering = {
  form_type: 'catering', email: 'customer@example.test', phone: '01382 123456',
  postcode: 'dd15eg', event_date: '2099-11-02', sandwich_amount: '12', sweet_treat_amount: '6',
  message: 'A team lunch.\nPlease discuss our requirements.',
};

function request(fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request('https://webdee.co.uk/api/send', { method: 'POST', body: form });
}

function send(fields, bindings = env) {
  return onRequestPost({ request: request(fields), env: bindings });
}

function captureResend(t) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return new Response('{"id":"mock-email-id"}', { status: 200 });
  });
  return calls;
}

test('catering enquiry sends every field through Resend with the visitor as reply-to', async t => {
  const calls = captureResend(t);
  const response = await send(catering);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(calls.length, 1);
  const { url, options, body } = calls[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(options.headers.Authorization, 'Bearer test-placeholder');
  assert.equal(body.from, 'enquiries@webdee.co.uk');
  assert.equal(body.to, 'feedthecrew@loomdeli.com');
  assert.equal(body.reply_to, catering.email);
  assert.equal(body.subject, 'Catering enquiry – 2099-11-02 – DD1 5EG');
  for (const value of [catering.email, catering.phone, 'DD1 5EG', '2 November 2099', 'Sandwich amount: 12', 'Sweet treat amount: 6', catering.message]) {
    assert.ok(body.text.includes(value), `Missing email field: ${value}`);
  }
  assert.match(body.html, /<br>/);
});

test('phone is optional and either food quantity may be zero', async t => {
  const calls = captureResend(t);
  assert.equal((await send({ ...catering, phone: '', sandwich_amount: '0' })).status, 200);
  assert.match(calls[0].body.text, /Phone: Not provided/);
  assert.equal((await send({ ...catering, sweet_treat_amount: '0' })).status, 200);
});

test('submitted HTML is escaped and plain-text email retains the original message', async t => {
  const calls = captureResend(t);
  const message = '<script>alert("test")</script> & a\nb';
  assert.equal((await send({ ...catering, message })).status, 200);
  assert.ok(!calls[0].body.html.includes('<script>'));
  assert.ok(calls[0].body.html.includes('&lt;script&gt;'));
  assert.ok(calls[0].body.text.includes(message));
});

test('existing contact form, including its catering interest, keeps working', async t => {
  const calls = captureResend(t);
  for (const interest of ['general', 'catering', 'feedback', 'other']) {
    const response = await send({ name: 'Alex Example', email: catering.email, phone: '', interest, message: 'A contact enquiry.' });
    assert.equal(response.status, 200);
  }
  assert.equal(calls.length, 4);
  assert.equal(calls[0].body.subject, 'New Enquiry from Alex Example');
  assert.match(calls[1].body.text, /Interest: catering/);
});

test('invalid catering submissions never call Resend', async t => {
  const calls = captureResend(t);
  for (const fields of [
    { email: '' }, { email: 'not-an-email' }, { email: 'x@example.test\r\nBcc: x@example.test' },
    { postcode: 'nowhere' }, { postcode: '' }, { event_date: '2000-01-01' },
    { event_date: '2099-02-30' }, { event_date: '' }, { phone: '01382\n123456' },
    { sandwich_amount: '-1' }, { sweet_treat_amount: '2.5' }, { sandwich_amount: '' },
    { sandwich_amount: '9007199254740992' }, { sandwich_amount: '0', sweet_treat_amount: '0' },
    { message: '' }, { message: 'x'.repeat(5001) }, { form_type: 'unknown' },
    { email: new File(['not an email'], 'email.txt') },
  ]) {
    const response = await send({ ...catering, ...fields });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(calls.length, 0);
});

test('date validation uses the London date across the summer midnight boundary', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-07-01T23:30:00Z') });
  const calls = captureResend(t);
  assert.equal((await send({ ...catering, event_date: '2026-07-01' })).status, 400);
  assert.equal((await send({ ...catering, event_date: '2026-07-02' })).status, 200);
  assert.equal(calls.length, 1);
});

test('honeypot submissions are quietly ignored without sending email', async t => {
  const calls = captureResend(t);
  assert.equal((await send({ ...catering, website: 'automated submission' })).status, 200);
  assert.equal(calls.length, 0);
});

test('missing runtime key returns an actionable error without sending email', async t => {
  const calls = captureResend(t);
  const response = await send(catering, {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /feedthecrew@loomdeli.com/);
  assert.equal(calls.length, 0);
});

test('Resend failure does not expose provider diagnostics', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('private provider diagnostics', { status: 422 }));
  const response = await send(catering);
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('private provider diagnostics'));
});

test('network failure returns an error instead of success', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('private network diagnostics'); });
  const response = await send(catering);
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes('private network diagnostics'));
});

test('malformed and oversized requests are rejected before email delivery', async t => {
  const calls = captureResend(t);
  const malformed = new Request('https://webdee.co.uk/api/send', { method: 'POST', body: 'invalid', headers: { 'Content-Type': 'application/json' } });
  assert.equal((await onRequestPost({ request: malformed, env })).status, 400);
  const oversized = request(catering);
  oversized.headers.set('Content-Length', '40000');
  assert.equal((await onRequestPost({ request: oversized, env })).status, 413);
  assert.equal(calls.length, 0);
});
