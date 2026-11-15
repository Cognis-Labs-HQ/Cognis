import test from 'node:test';
import assert from 'node:assert/strict';
import { challenge, fixture, prompt, settle } from './login/fixture.js';

const email = () => ({ id: 'email', name: 'Email', loginUi: { supportsResend: true, challengeOnSelect: true } });

for (const recovery of [false, true]) {
  test(`initial email selection requests one challenge with ${recovery ? 'recovery codes' : 'another method'}`, async (context) => {
    const host = await fixture(context, { initialPrompt: prompt(0, { methods: [email(), { id: recovery ? 'recovery_code' : 'totp', name: 'Other' }] }) });
    assert.equal(host.resendRequests().length, 1);
    assert.equal(JSON.parse(host.resendRequests()[0].options.body).methodId, 'email');
    host.root.querySelector('#login-tfa-method-nav a').click();
    await settle();
    assert.equal(host.resendRequests().length, 1);
  });
}

test('a prepared email challenge is reused without a new delivery request', async (context) => {
  const host = await fixture(context, { initialPrompt: prompt(0, { methods: [{ ...email(), challenge: challenge(30_000) }] }) });
  assert.equal(host.resendRequests().length, 0);
});

test('selecting email after an authenticator requests its first challenge', async (context) => {
  const host = await fixture(context, { initialPrompt: prompt(0, { methods: [{ id: 'totp', name: 'Authenticator' }, email()] }) });
  assert.equal(host.resendRequests().length, 0);
  host.root.querySelectorAll('#login-tfa-method-nav a')[1].click();
  await settle();
  assert.equal(host.resendRequests().length, 1);
});

for (const failure of ['response', 'network']) {
  test(`initial challenge ${failure} failure visibly reports the unavailable result`, async (context) => {
    const host = await fixture(context, {
      initialPrompt: prompt(0, { methods: [email()] }),
      respond: () => {
        if (failure === 'network') throw new TypeError('offline');
        return Response.json({ error: { code: 'email_delivery_unavailable' } }, { status: 503 });
      },
    });
    assert.equal(host.resendRequests().length, 1);
    assert.ok(host.state.notices.some((notice) => notice.options.variant === 'error' && notice.text.length > 0));
  });
}
