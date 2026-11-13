import { beginPageLoading } from "/static/reuse/page-entry.js";

/** Creates one guarded submit handler for native login and TFA verification. */
export function createLoginSubmitHandler({
    getState,
    loadTfaLoginClient,
    finalizeAuthenticatedSession,
    handleAuthResult,
    showToast,
    i18n,
}) {
    let pending = false;
    return async (event) => {
        event.preventDefault();
        if (pending) return;
        pending = true;
        let finishLoading = () => {};
        const {
            isPasswordResetMode,
            submitPasswordReset,
            currentTfaLoginAttemptId,
            pendingKeyringPassword,
        } = getState();
        try {
            if (isPasswordResetMode) {
                try {
                    await submitPasswordReset?.();
                } catch {
                    showToast(i18n.t("ui.app.login.error.generic"), {
                        variant: "error",
                    });
                }
                return;
            }
            finishLoading = beginPageLoading();
            const form = event.target;
            const tfaFields = form.querySelector("#login-tfa-fields");
            const isTfaMode =
                tfaFields instanceof HTMLElement && !tfaFields.hidden;
            if (isTfaMode) {
                const tfaMethodEl = form.querySelector("#login-tfa-method");
                const tfaCodeEl = form.querySelector("#login-tfa-code");
                const payload = {
                    loginAttemptId: currentTfaLoginAttemptId,
                    methodId:
                        tfaMethodEl instanceof HTMLInputElement
                            ? tfaMethodEl.value
                            : "",
                    code:
                        tfaCodeEl instanceof HTMLInputElement
                            ? tfaCodeEl.value.trim()
                            : "",
                };
                const tfaLoginClient = await loadTfaLoginClient();
                if (!tfaLoginClient) {
                    showToast(i18n.t("ui.app.login.error.generic"), {
                        variant: "error",
                    });
                    return;
                }
                const { response: tfaResponse, body: tfaBody } =
                    await tfaLoginClient.verifyCode(payload);
                if (tfaResponse.ok && tfaBody?.data) {
                    finishLoading();
                    await finalizeAuthenticatedSession(
                        tfaBody.data,
                        pendingKeyringPassword,
                    );
                    return;
                }
                showToast(
                    tfaLoginClient?.resolveErrorMessage(
                        tfaBody?.error?.message,
                    ) ?? i18n.t("ui.app.login.error.generic"),
                    { variant: "error" },
                );
                return;
            }
            const usernameEl = form.querySelector("#login-username");
            const passwordEl = form.querySelector("#login-password");
            const providerEl = form.querySelector("#login-provider");
            const payload = {
                username: usernameEl?.value ?? "",
                password: passwordEl?.value ?? "",
                provider: providerEl?.value ?? "local",
            };
            const response = await fetch("/api/v1/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => null);
            if (response.ok && body?.data) {
                finishLoading();
                await handleAuthResult(body.data, payload.password);
                return;
            }
            const errorKeyByCode = {
                account_archived: "ui.app.login.reason.account_archived",
                account_deactivated: "ui.app.login.reason.account_deactivated",
            };
            const errorKey = errorKeyByCode[body?.error?.code];
            const errorMsg = errorKey
                ? i18n.t(errorKey)
                : body?.error?.message || i18n.t("ui.app.login.error.generic");
            showToast(errorMsg, { variant: "error" });
        } catch (error) {
            console.error("[auth] login submission failed", {
                component: "auth",
                operation: "submitLogin",
                errorName: error?.name,
            });
            showToast(i18n.t("ui.app.login.error.generic"), {
                variant: "error",
            });
        } finally {
            finishLoading();
            pending = false;
        }
    };
}
