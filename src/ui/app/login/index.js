import { bindThemeToggle } from '../../reuse/theme-toggle.js';
import { applyDocumentTitle, applyStaticTranslations, createI18n } from '../../reuse/i18n.js';

const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.login');
applyStaticTranslations(i18n);

const typingSamples = [
  i18n.t('ui.app.login.typing.sample.1'),
  i18n.t('ui.app.login.typing.sample.2'),
  i18n.t('ui.app.login.typing.sample.3'),
  i18n.t('ui.app.login.typing.sample.4'),
  i18n.t('ui.app.login.typing.sample.5'),
  i18n.t('ui.app.login.typing.sample.6')
];

bindThemeToggle();

const typingTarget = document.querySelector('#typing-text');
const typingCursor = document.querySelector('.typing-cursor');

const startIndex = Math.floor(Math.random() * typingSamples.length);
const orderedSamples = typingSamples.map((_, index) => typingSamples[(startIndex + index) % typingSamples.length]);

async function runTypingShowcase() {
  if (!typingTarget) return;

  for (let sampleIndex = 0; sampleIndex < orderedSamples.length; sampleIndex += 1) {
    const sample = orderedSamples[sampleIndex];

    for (let charIndex = 0; charIndex <= sample.length; charIndex += 1) {
      typingTarget.textContent = sample.slice(0, charIndex);
      await new Promise((resolve) => window.setTimeout(resolve, 85));
    }

    await new Promise((resolve) => window.setTimeout(resolve, 60_000));

    const isLastSample = sampleIndex === orderedSamples.length - 1;
    if (!isLastSample) {
      for (let charIndex = sample.length; charIndex >= 0; charIndex -= 1) {
        typingTarget.textContent = sample.slice(0, charIndex);
        await new Promise((resolve) => window.setTimeout(resolve, 42));
      }
    }
  }

  if (typingCursor) typingCursor.textContent = '';
}

runTypingShowcase();

document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = { username: form.username.value, password: form.password.value };
  const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await response.json();
  if (response.ok) {
    localStorage.setItem('cognis_token', body.data.token);
    localStorage.setItem('cognis_account', body.data.accountId);
    localStorage.setItem('cognis_display_name', body.data.displayName || body.data.accountId);
    localStorage.setItem('cognis_role', body.data.role || 'user');
    localStorage.setItem('cognis_login_time', new Date().toISOString());
    window.location.href = '/dashboard';
    return;
  }
  document.querySelector('#msg').textContent = body.error.message;
});
