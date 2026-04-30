import { renderDashboardLayout } from '../layouts/dashboard-layout.js';

const root = document.querySelector('#app');

await renderDashboardLayout(root, {
  sidebar: '<h1>Welcome</h1><p>Sign in to continue.</p>',
  topbar: 'Login',
  content: '<section class="auth-page"><main class="panel"><h1>Login</h1><form id="login-form" class="stack"><input name="username" placeholder="Username" required /><input name="password" type="password" placeholder="Password" required /><button type="submit">Login</button></form><p id="msg"></p></main></section>'
});

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
