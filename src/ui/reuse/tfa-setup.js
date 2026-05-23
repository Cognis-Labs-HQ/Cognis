/**
 * Handles mandatory TFA setup flows for authenticated sessions.
 *
 * Public exports:
 * - enforceRequiredTfaSetup: loops until required TFA setup is completed.
 *
 * Usage:
 *   await enforceRequiredTfaSetup({
 *     i18n,
 *     accountId: 'alice',
 *     authToken,
 *     openPopup,
 *     showToast,
 *     escapeHtml,
 *     enforceRequiredEmailSetup,
 *   });
 *
 * @param {object} deps
 * @param {{ t: (key: string) => string }} deps.i18n
 * @param {string} deps.accountId
 * @param {string} [deps.authToken]
 * @param {(options: Record<string, unknown>) => Promise<string | null | undefined>} deps.openPopup
 * @param {(message: string, options?: Record<string, unknown>) => void} deps.showToast
 * @param {(value: string) => string} deps.escapeHtml
 * @param {(accountId: string, authToken?: string) => Promise<void>} [deps.enforceRequiredEmailSetup]
 * @returns {Promise<void>}
 */
export async function enforceRequiredTfaSetup({
    i18n,
    accountId,
    authToken,
    openPopup,
    showToast,
    escapeHtml,
    enforceRequiredEmailSetup,
}) {
    async function authenticatedRequest(path, init = {}) {
        const headers = new Headers(init.headers || {});
        if (authToken) {
            headers.set("authorization", `Bearer ${authToken}`);
        }
        const requestInit = { ...init, headers };
        return fetch(path, requestInit);
    }

    async function readSetupStatus() {
        const response = await authenticatedRequest(
            "/api/v1/auth/tfa/setup-status",
        );
        if (!response.ok) return null;
        const payload = await response.json().catch(() => null);
        return payload?.data ?? null;
    }

    while (true) {
        const setupStatus = await readSetupStatus();
        if (!setupStatus?.required) {
            return;
        }
        const availableMethods = Array.isArray(setupStatus.methods)
            ? setupStatus.methods.filter((method) => method.available === true)
            : [];
        if (availableMethods.length < 1) {
            return;
        }
        let selectedMethodId = availableMethods[0].id;
        const methodOptionsHtml = availableMethods
            .map(
                (method) =>
                    `<option value="${escapeHtml(method.id)}">${escapeHtml(method.name)}</option>`,
            )
            .join("");
        let methodSelect = null;
        const action = await openPopup({
            title: i18n.t("ui.reuse.tfa_setup_title"),
            body: `
        <p>${escapeHtml(i18n.t("ui.reuse.tfa_setup_required"))}</p>
        <label class="stack">
          <span>${escapeHtml(i18n.t("ui.reuse.tfa_setup_method_label"))}</span>
          <select id="required-tfa-method-select" class="theme-select">${methodOptionsHtml}</select>
        </label>
      `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.tfa_setup_confirm"),
                    variant: "confirm",
                },
            ],
            onOpen: (overlay) => {
                methodSelect = overlay.querySelector(
                    "#required-tfa-method-select",
                );
                if (methodSelect instanceof HTMLSelectElement) {
                    methodSelect.value = selectedMethodId;
                }
            },
        });
        if (action !== "confirm") {
            continue;
        }
        if (methodSelect instanceof HTMLSelectElement) {
            selectedMethodId = methodSelect.value;
        }
        const selectedMethod = availableMethods.find(
            (method) => method.id === selectedMethodId,
        );
        if (!selectedMethod) {
            continue;
        }
        if (selectedMethod.requiresVerifiedEmail === true) {
            try {
                await enforceRequiredEmailSetup?.(accountId, authToken);
            } catch {
                showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                    variant: "error",
                });
                continue;
            }
        }
        if (selectedMethod.setupRequestPath && selectedMethod.setupVerifyPath) {
            const requestResponse = await authenticatedRequest(
                selectedMethod.setupRequestPath,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({}),
                },
            );
            if (!requestResponse.ok) {
                showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                    variant: "error",
                });
                continue;
            }
            const requestPayload = await requestResponse
                .json()
                .catch(() => null);
            const challengeId = String(requestPayload?.data?.challengeId ?? "");
            if (!challengeId) {
                showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                    variant: "error",
                });
                continue;
            }
            let codeInput = null;
            const verifyAction = await openPopup({
                title: i18n.t("ui.reuse.tfa_setup_title"),
                body: `
          <label class="stack">
            <span>${escapeHtml(i18n.t("ui.app.login.email_tfa.code_label"))}</span>
            <input id="required-tfa-setup-code" type="text" inputmode="numeric" maxlength="6" />
          </label>
        `,
                actions: [
                    {
                        id: "confirm",
                        label: i18n.t("ui.reuse.confirm"),
                        variant: "confirm",
                    },
                ],
                onOpen: (overlay) => {
                    codeInput = overlay.querySelector(
                        "#required-tfa-setup-code",
                    );
                },
            });
            if (verifyAction !== "confirm") {
                continue;
            }
            const code =
                codeInput instanceof HTMLInputElement
                    ? codeInput.value.trim()
                    : "";
            if (!code) {
                continue;
            }
            const verifyResponse = await authenticatedRequest(
                selectedMethod.setupVerifyPath,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ challengeId, code }),
                },
            );
            if (!verifyResponse.ok) {
                showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                    variant: "error",
                });
                continue;
            }
            showToast(i18n.t("ui.reuse.tfa_setup_saved"), {
                variant: "success",
            });
            continue;
        }
        const saveResponse = await authenticatedRequest(
            selectedMethod.settingsPath,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ enabled: true }),
            },
        );
        if (!saveResponse.ok) {
            showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                variant: "error",
            });
            continue;
        }
        showToast(i18n.t("ui.reuse.tfa_setup_saved"), { variant: "success" });
    }
}
