const typingSamples = ['Template'];

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
