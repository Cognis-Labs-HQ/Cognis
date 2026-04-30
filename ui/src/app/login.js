const typingSamples = ['Template'];

function applyTheme(mode) {
  const normalized = mode === 'light' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', normalized);
  document.body.classList.toggle('binary-theme--dark', normalized === 'dark');
  document.body.classList.toggle('binary-theme--light', normalized === 'light');

  const toggle = document.querySelector('#theme-toggle');
  if (toggle) {
    toggle.dataset.mode = normalized;
    toggle.textContent = normalized === 'dark' ? '🌙' : '☀️';
  }
}

function bindThemeToggle() {
  const local = localStorage.getItem('cognis_theme') || 'dark';
  applyTheme(local);

  document.querySelector('#theme-toggle')?.addEventListener('click', () => {
    const next = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('cognis_theme', next);
  });
}

const typingTarget = document.querySelector('#typing-text');
const selectedPhrase = typingSamples[Math.floor(Math.random() * typingSamples.length)] ?? '';
let typeIndex = 0;

function tickTyping() {
  if (!typingTarget) return;
  typingTarget.textContent = selectedPhrase.slice(0, typeIndex);
  if (typeIndex < selectedPhrase.length) {
    typeIndex += 1;
    window.setTimeout(tickTyping, 110);
  }
}

bindThemeToggle();
window.setTimeout(tickTyping, 250);

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
    window.location.href = '/dashboard';
    return;
  }
  document.querySelector('#msg').textContent = body.error.message;
});
