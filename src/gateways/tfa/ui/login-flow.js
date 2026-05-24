function setActiveTfaInputPlaceholder(i18n, activeMethodId, tfaCodeInput) {
  if (!(tfaCodeInput instanceof HTMLInputElement)) {
    return;
  }
  const placeholderKeyByMethod = {
    recovery_code: 'ui.app.login.tfa.code_placeholder_recovery',
    totp: 'ui.app.login.tfa.code_placeholder_totp',
  };
  const placeholderKey =
    placeholderKeyByMethod[activeMethodId] ??
    'ui.app.login.tfa.code_placeholder_totp';
  const placeholderText = i18n.t(placeholderKey);
  tfaCodeInput.placeholder = placeholderText;
  tfaCodeInput.setAttribute('aria-label', placeholderText);
}

export function renderTfaMethodTabs(i18n, methods, root = document) {
  const tabsEl = root.querySelector('#login-tfa-method-nav');
  const methodInput = root.querySelector('#login-tfa-method');
  const tfaCodeInput = root.querySelector('#login-tfa-code');
  if (
    !(tabsEl instanceof HTMLElement) ||
    !(methodInput instanceof HTMLInputElement)
  ) {
    return;
  }
  tabsEl.replaceChildren();
  const normalizedMethods = Array.isArray(methods) ? methods : [];
  normalizedMethods.forEach((method, index) => {
    const tabLink = document.createElement('a');
    tabLink.href = '#';
    tabLink.textContent = method.name;
    tabLink.addEventListener('click', (event) => {
      event.preventDefault();
      methodInput.value = method.id;
      tabsEl.querySelectorAll('a').forEach((entry) => {
        entry.classList.toggle('active', entry === tabLink);
      });
      setActiveTfaInputPlaceholder(i18n, method.id, tfaCodeInput);
    });
    if (index === 0) {
      tabLink.classList.add('active');
      methodInput.value = method.id;
      setActiveTfaInputPlaceholder(i18n, method.id, tfaCodeInput);
    }
    tabsEl.appendChild(tabLink);
  });
  tabsEl.hidden = normalizedMethods.length <= 1;
}

export function switchToTfaPrompt(i18n, payload, root = document) {
  const credentialFields = root.querySelector('#login-credential-fields');
  const tfaFields = root.querySelector('#login-tfa-fields');
  const usernameInput = root.querySelector('#login-username');
  const passwordInput = root.querySelector('#login-password');
  const tfaCodeInput = root.querySelector('#login-tfa-code');
  if (
    !(credentialFields instanceof HTMLElement) ||
    !(tfaFields instanceof HTMLElement)
  ) {
    return null;
  }
  credentialFields.hidden = true;
  tfaFields.hidden = false;
  if (usernameInput instanceof HTMLInputElement) {
    usernameInput.required = false;
    usernameInput.disabled = true;
  }
  if (passwordInput instanceof HTMLInputElement) {
    passwordInput.required = false;
    passwordInput.disabled = true;
  }
  if (tfaCodeInput instanceof HTMLInputElement) {
    tfaCodeInput.required = true;
    tfaCodeInput.value = '';
    tfaCodeInput.focus();
  }
  renderTfaMethodTabs(i18n, payload.methods ?? [], root);
  return payload.loginAttemptId ?? null;
}
