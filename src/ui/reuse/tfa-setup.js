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
 *     ensureRequiredEmailSetup,
 *   });
 *
 * @param {{
 *   i18n: { t: (key: string) => string },
 *   accountId: string,
 *   authToken?: string,
 *   openPopup: (options: Record<string, unknown>) => Promise<string | null | undefined>,
 *   showToast: (message: string, options?: Record<string, unknown>) => void,
 *   escapeHtml: (value: string) => string,
 *   ensureRequiredEmailSetup?: (accountId: string, authToken?: string) => Promise<void>,
 * }} deps
 * @returns {Promise<void>}
 */
export async function enforceRequiredTfaSetup({
    i18n,
    accountId,
    authToken,
    openPopup,
    showToast,
    escapeHtml,
    ensureRequiredEmailSetup,
}) {
    async function request(path, init = {}) {
        const headers = new Headers(init.headers || {});
        if (authToken) {
            headers.set("authorization", `Bearer ${authToken}`);
        }
        const requestInit = { ...init, headers };
        return fetch(path, requestInit);
    }

    async function readSetupStatus() {
        const response = await request("/api/v1/auth/tfa/setup-status");
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
        const selectedMethod = availableMethods[0];
        const action = await openPopup({
            title: i18n.t("ui.reuse.tfa_setup_title"),
            body: `
        <p>${escapeHtml(i18n.t("ui.reuse.tfa_setup_required"))}</p>
        <p><strong>${escapeHtml(selectedMethod.name)}</strong></p>
      `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.tfa_setup_confirm"),
                    variant: "confirm",
                },
            ],
        });
        if (action !== "confirm") {
            continue;
        }
        if (selectedMethod.requiresVerifiedEmail === true) {
            await ensureRequiredEmailSetup?.(accountId, authToken);
        }
        const saveResponse = await request(selectedMethod.settingsPath, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ enabled: true }),
        });
        if (!saveResponse.ok) {
            showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                variant: "error",
            });
            continue;
        }
        showToast(i18n.t("ui.reuse.tfa_setup_saved"), { variant: "success" });
    }
}
