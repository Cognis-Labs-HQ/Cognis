const root = document.querySelector('#app');
root.innerHTML = `
<section class="shell"><main class="workspace"><h1>Login</h1>
<form id="login-form"><input name="username" placeholder="Username" required />
<input name="password" type="password" placeholder="Password" required />
<button type="submit">Login</button></form><p id="msg"></p></main></section>`;

document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const payload = { username: form.username.value, password: form.password.value };
  const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await response.json();
  document.querySelector('#msg').textContent = response.ok ? `Welcome ${body.data.username}` : body.error.message;
});
