import { loadTemplate } from '../reuse/template-loader.js';

const root = document.querySelector('#app');

const animatedTexts = ['Template'];

function pickAnimatedText(options) {
  if (!Array.isArray(options) || options.length === 0) return '';
  const index = Math.floor(Math.random() * options.length);
  return options[index] || '';
}

root.innerHTML = await loadTemplate('login');


function startTypingAnimation(element, value) {
  let index = 0;
  let showCursor = true;

  const render = () => {
    const typedValue = value.slice(0, index);
    element.textContent = `${typedValue}${showCursor ? '_' : ' '}`;
  };

  const typingTimer = window.setInterval(() => {
    if (index < value.length) {
      index += 1;
      render();
      return;
    }
    window.clearInterval(typingTimer);
  }, 115);

  window.setInterval(() => {
    showCursor = !showCursor;
    render();
  }, 480);

  render();
}

const typedTextElement = document.querySelector('#typed-template');
const selectedText = pickAnimatedText(animatedTexts);
if (typedTextElement) startTypingAnimation(typedTextElement, selectedText);

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
