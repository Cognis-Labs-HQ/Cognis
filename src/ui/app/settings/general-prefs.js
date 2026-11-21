import { escapeHtml } from "../../reuse/escape-html.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import { isOffline } from "../../reuse/offline-state.js";
import { apiFetch } from "../../reuse/api-client.js";
import { openPopup } from "../../reuse/popup.js";
import { watchToken } from "../../reuse/validation-url.js";
import { showToast } from "../../reuse/toast.js";
import { matchesTrustedDomain } from "../../reuse/trusted-domains.js";
import { createEmailActions } from "./email-actions.js";

/**
 * General preferences sub-module for the Settings page.
 *
 * Manages the user's email addresses: listing, adding, removing,
 * setting a primary address, and verifying new addresses via a TFA code.
 * Clicking the "Unverified" badge on an existing email re-triggers the
 * verification flow; cancelling that flow removes the email.
 * Trusted domains (configured in Administration > Security) are checked
 * before the verification flow begins.
 *
 * Public exports:
 *   initGeneralPrefs(root, options) — initialises email management in the given root element.
 *
 * Usage:
 *   const generalPrefs = initGeneralPrefs(root, { i18n, username, signal, onRender = () => {} });
 *   await generalPrefs.init();
 *
 * @param {Element} root
 * @param {{ i18n: object, username: string }} options
 * @returns {{ init: () => Promise<void> }}
 */
export function initGeneralPrefs(
    root,
    { i18n, username, signal, onRender = () => {} },
) {
    let emails = [];
    let emailReadVersion = 0;
    const emailClient = () => uiCtx.capabilities.get("notify:emailClient");
    const emailActions = createEmailActions(root, {
        i18n,
        username,
        signal,
        emailClient,
        refresh: async (isCurrent, options) => {
            const snapshot = await loadEmails(isCurrent, options);
            if (snapshot && isCurrent()) renderEmailList();
            return snapshot;
        },
    });

    function updateEmailAvailability() {
        const available = Boolean(emailClient());
        const section = root
            .querySelector("#email-list")
            ?.closest(".components-section");
        if (section) section.hidden = !available;
        return available;
    }

    async function loadEmails(
        isCurrent = () => true,
        { authoritative = false } = {},
    ) {
        const readVersion = ++emailReadVersion;
        const res = await emailClient().request(
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails`,
            {
                signal,
                cache: "no-store",
                ...(authoritative ? { bufferOffline: false } : {}),
            },
        );
        signal?.throwIfAborted();
        if (!res.ok || (authoritative && res.status !== 200)) return;
        const payload = await res.json();
        signal?.throwIfAborted();
        const entries = payload?.data;
        if (
            !isCurrent() ||
            readVersion !== emailReadVersion ||
            !Array.isArray(entries) ||
            !entries.every(
                (entry) =>
                    entry &&
                    typeof entry.email === "string" &&
                    entry.email.trim() &&
                    typeof entry.primary === "boolean" &&
                    typeof entry.verified === "boolean",
            ) ||
            new Set(entries.map((entry) => entry.email)).size !== entries.length
        )
            return;
        emails = entries;
        return {
            emails,
            authoritative,
            source: res.headers.get("x-cognis-read-source"),
        };
    }

    async function isDomainAllowed(address) {
        const trustedDomains = await emailClient().trustedDomains();
        if (trustedDomains.length === 0) return true;
        const parts = address.split("@");
        if (parts.length !== 2) return false;
        return matchesTrustedDomain(parts[1], trustedDomains);
    }

    async function addEmail(address) {
        const res = await emailClient().request(
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: address }),
            },
        );
        if (res.status === 409) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload?.error?.code ?? "already_verified");
        }
        if (res.status === 429) throw new Error("rate_limited");
        if (res.status === 503) throw new Error("email_delivery_unavailable");
        if (!res.ok) throw new Error("add_failed");
        const payload = await res.json();
        return { ...payload.data, queued: payload.queued === true };
    }

    async function forceRemoveUnverifiedEmail(address) {
        await emailClient().request(
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}?force=true`,
            { method: "DELETE" },
        );
    }

    async function resendVerification(address) {
        const res = await emailClient().request(
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/resend`,
            { method: "POST" },
        );
        if (res.status === 429) throw new Error("rate_limited");
        if (res.status === 503) throw new Error("email_delivery_unavailable");
        if (!res.ok) throw new Error("resend_failed");
        const payload = await res.json();
        return { ...payload.data, queued: payload.queued === true };
    }

    async function submitAccountLifecycleAction(action, password) {
        const response = await apiFetch("/api/v1/auth/account-lifecycle", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action, password }),
        });
        if (response.status === 401) throw new Error("invalid_credentials");
        if (!response.ok) throw new Error("account_action_failed");
    }

    async function submitVerificationCode(address, code) {
        const res = await emailClient().request(
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/verify`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ code }),
            },
        );
        if (res.status === 422) throw new Error("invalid_code");
        if (!res.ok) throw new Error("verify_failed");
    }

    function renderEmailList() {
        if (signal?.aborted) return;
        const listEl = root.querySelector("#email-list");
        if (!listEl) return;
        if (!emails.length) {
            listEl.innerHTML = `<li class="email-list-item"><span class="email-address">${i18n.t("ui.app.settings.emails_none")}</span></li>`;
            emailActions.update();
            onRender();
            return;
        }
        listEl.innerHTML = emails
            .map((entry) => {
                const escaped = escapeHtml(entry.email);
                const verifiedBadge = entry.verified
                    ? `<span class="email-badge-verified">${i18n.t("ui.app.settings.emails_verified")}</span>`
                    : `<button class="email-badge-unverified" type="button" data-resend-verification="${escaped}">${i18n.t("ui.app.settings.emails_unverified")}</button>`;
                const primaryBadge = entry.primary
                    ? `<span class="email-badge-primary">${i18n.t("ui.app.settings.emails_primary")}</span>`
                    : `<button class="btn-confirm btn-animated" type="button" data-set-primary="${escaped}">${i18n.t("ui.app.settings.emails_set_primary")}</button>`;
                const removeBtn = entry.primary
                    ? ""
                    : `<button class="btn-cancel btn-animated" type="button" data-remove-email="${escaped}">${i18n.t("ui.reuse.remove")}</button>`;
                return `<li class="email-list-item"><span class="email-address">${escaped}</span>${verifiedBadge}${primaryBadge}${removeBtn}</li>`;
            })
            .join("");
        emailActions.update();
        onRender();
    }

    function showStatus(message, variant = "error") {
        showToast(message, { variant });
    }

    async function openVerifyPopup(address, watchTokenValue) {
        const escapedAddress = escapeHtml(address);
        let stopWatching = null;

        const action = await openPopup({
            title: i18n.t("ui.app.settings.emails_verify_title"),
            body: `
        <p class="email-verify-prompt">${i18n.t("ui.app.settings.emails_verify_prompt").replace("{email}", escapedAddress)}</p>
        <div class="email-verify-row">
          <input id="popup-verify-input" type="text" inputmode="numeric" maxlength="6"
            placeholder="${escapeHtml(i18n.t("ui.app.settings.emails_verify_placeholder"))}" />
          <button id="popup-verify-btn" class="btn-confirm btn-animated" type="button">
            ${escapeHtml(i18n.t("ui.app.settings.emails_verify_submit"))}
          </button>
        </div>
        <button data-popup-action="verified" type="button" style="display:none"></button>
      `,
            variant: "info",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen(overlay) {
                overlay
                    .querySelector("#popup-verify-btn")
                    .addEventListener("click", async () => {
                        const input = overlay.querySelector(
                            "#popup-verify-input",
                        );
                        const code = input.value.trim();
                        if (!code) return;
                        try {
                            await submitVerificationCode(address, code);
                            overlay
                                .querySelector('[data-popup-action="verified"]')
                                .click();
                        } catch (err) {
                            const errCode =
                                err instanceof Error
                                    ? err.message
                                    : "verify_failed";
                            showToast(
                                errCode === "invalid_code"
                                    ? i18n.t(
                                          "ui.app.settings.emails_verify_invalid",
                                      )
                                    : i18n.t(
                                          "ui.app.settings.emails_verify_failed",
                                      ),
                                { variant: "error" },
                            );
                        }
                    });

                if (watchTokenValue) {
                    stopWatching = watchToken({
                        token: watchTokenValue,
                        apiFetch,
                        onConsumed() {
                            emailClient()
                                .request(
                                    `/api/v1/notify/users/${encodeURIComponent(username)}/emails`,
                                )
                                .then((res) => (res.ok ? res.json() : null))
                                .then((payload) => {
                                    const entry = (payload?.data ?? []).find(
                                        (e) => e.email === address,
                                    );
                                    if (entry?.verified) {
                                        overlay
                                            .querySelector(
                                                '[data-popup-action="verified"]',
                                            )
                                            .click();
                                    }
                                    // If not verified, the token expired or was lost without the link being
                                    // used; stop polling silently and let the user enter the code manually
                                    // (fall through to manual code entry below).
                                })
                                .catch(() => {
                                    // Network error — polling stopped, popup remains open for manual entry.
                                });
                        },
                    });
                }
            },
        });

        stopWatching?.();
        return action;
    }

    async function checkDomainAndNotify(address) {
        let allowed;
        try {
            allowed = await isDomainAllowed(address);
        } catch (error) {
            console.error(i18n.t("ui.app.settings.emails_add_failed"), {
                operation: "loadEmailDomainPolicy",
                errorName: error.name,
            });
            showStatus(i18n.t("ui.app.settings.emails_add_failed"));
            return false;
        }
        if (!allowed) {
            showToast(i18n.t("ui.app.settings.emails_domain_blocked_body"), {
                variant: "warning",
            });
            return false;
        }
        return true;
    }

    function bindEmailAddShortcut() {
        root.addEventListener(
            "keydown",
            (evt) => {
                const target = evt.target;
                if (!(target instanceof HTMLInputElement)) return;
                if (target.id !== "email-add-input") return;
                if (evt.key !== "Enter") return;

                evt.preventDefault();
                root.querySelector("#email-add-btn")?.click();
            },
            { signal },
        );
    }

    async function openDangerActionPopup(action) {
        if (!["archive", "deactivate", "delete"].includes(action)) return;
        const actionLabels = {
            archive: i18n.t("ui.app.settings.danger_archive"),
            deactivate: i18n.t("ui.app.settings.danger_deactivate"),
            delete: i18n.t("ui.app.settings.danger_delete"),
        };
        const escapedActionLabel = escapeHtml(actionLabels[action] ?? action);
        await openPopup({
            title: i18n
                .t("ui.app.settings.danger_popup_title")
                .replace("{action}", escapedActionLabel),
            body: `
        <p class="settings-danger-warning">${escapeHtml(i18n.t(`ui.app.settings.danger_${action}_warning`))}</p>
        <label class="settings-danger-password-label">
          ${escapeHtml(i18n.t("ui.app.settings.danger_password_label"))}
          <input id="account-danger-password" type="password" autocomplete="current-password" />
        </label>
      `,
            variant: "danger",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "neutral",
                },
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.confirm"),
                    variant: "cancel",
                },
            ],
            onAction: async (result, overlay) => {
                if (result !== "confirm") return;
                const passwordInput = overlay.querySelector(
                    "#account-danger-password",
                );
                const password =
                    passwordInput instanceof HTMLInputElement
                        ? passwordInput.value
                        : "";
                if (!password) {
                    showToast(
                        i18n.t("ui.app.settings.danger_password_required"),
                        { variant: "warning" },
                    );
                    return false;
                }
                try {
                    await submitAccountLifecycleAction(action, password);
                    showToast(i18n.t("ui.app.settings.danger_completed"), {
                        variant: "success",
                    });
                    window.location.replace("/login");
                } catch (err) {
                    const code = err instanceof Error ? err.message : "failed";
                    showToast(
                        code === "invalid_credentials"
                            ? i18n.t("ui.app.settings.danger_invalid_password")
                            : i18n.t("ui.app.settings.danger_failed"),
                        { variant: "error" },
                    );
                    return false;
                }
            },
        });
    }

    function bindEmailActions() {
        root.addEventListener(
            "click",
            async (evt) => {
                const target = evt.target;
                if (!(target instanceof HTMLElement)) return;

                if (target.dataset.refreshEmails !== undefined) {
                    await emailActions.refresh();
                    return;
                }
                const removeAttr = target.dataset.removeEmail;
                const setPrimaryAttr = target.dataset.setPrimary;
                if (removeAttr || setPrimaryAttr) {
                    await emailActions.run(
                        removeAttr ? "remove" : "primary",
                        removeAttr || setPrimaryAttr,
                    );
                    return;
                }

                const resendAttr = target.dataset.resendVerification;
                if (isOffline() && (resendAttr || target.dataset.accountAction))
                    return;
                if (resendAttr) {
                    const allowed = await checkDomainAndNotify(resendAttr);
                    if (!allowed) return;
                    try {
                        const result = await resendVerification(resendAttr);
                        await openVerifyPopup(resendAttr, result.watchToken);
                        await loadEmails();
                        renderEmailList();
                    } catch (err) {
                        const code =
                            err instanceof Error
                                ? err.message
                                : "resend_failed";
                        if (code === "rate_limited") {
                            showStatus(
                                i18n.t(
                                    "ui.app.settings.emails_verify_rate_limited",
                                ),
                            );
                        } else if (code === "email_delivery_unavailable") {
                            showStatus(
                                i18n.t(
                                    "ui.app.settings.emails_verify_unavailable",
                                ),
                            );
                        } else {
                            showStatus(
                                i18n.t("ui.app.settings.emails_add_failed"),
                            );
                        }
                    }
                    return;
                }

                const accountAction = target.dataset.accountAction;
                if (accountAction) {
                    await openDangerActionPopup(accountAction);
                    return;
                }

                if (target.id === "email-add-btn") {
                    const input = root.querySelector("#email-add-input");
                    if (!(input instanceof HTMLInputElement)) return;
                    const address = input.value.trim().toLowerCase();
                    if (!address) {
                        showToast(i18n.t("ui.reuse.email_required"), {
                            variant: "warning",
                        });
                        return;
                    }
                    const allowed = await checkDomainAndNotify(address);
                    if (!allowed) return;
                    try {
                        const result = await addEmail(address);
                        input.value = "";
                        await loadEmails();
                        renderEmailList();
                        if (!result.queued && result.pendingVerification) {
                            const action = await openVerifyPopup(
                                address,
                                result.watchToken,
                            );
                            if (action !== "verified") {
                                try {
                                    await forceRemoveUnverifiedEmail(address);
                                } catch {
                                    /* ignore */
                                }
                            }
                            await loadEmails();
                            renderEmailList();
                        }
                    } catch (err) {
                        const code =
                            err instanceof Error ? err.message : "add_failed";
                        if (code === "already_verified") {
                            showStatus(
                                i18n.t(
                                    "ui.app.settings.emails_already_verified",
                                ),
                            );
                        } else if (code === "email_taken") {
                            showStatus(
                                i18n.t("ui.app.settings.emails_email_taken"),
                            );
                        } else if (code === "rate_limited") {
                            showStatus(
                                i18n.t(
                                    "ui.app.settings.emails_verify_rate_limited",
                                ),
                            );
                        } else if (code === "email_delivery_unavailable") {
                            showStatus(
                                i18n.t(
                                    "ui.app.settings.emails_verify_unavailable",
                                ),
                            );
                        } else {
                            showStatus(
                                i18n.t("ui.app.settings.emails_add_failed"),
                            );
                        }
                    }
                    return;
                }
            },
            { signal },
        );
    }

    return {
        async init() {
            bindEmailAddShortcut();
            bindEmailActions();
            if (!updateEmailAvailability()) return;
            await loadEmails();
            renderEmailList();
        },
        async refresh() {
            if (!updateEmailAvailability()) return;
            if (emailActions.busy) {
                renderEmailList();
                return;
            }
            if (emailActions.blocked) {
                await emailActions.refresh();
                return;
            }
            await loadEmails();
            renderEmailList();
        },
    };
}
