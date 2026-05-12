import { escapeHtml } from "../../reuse/escape-html.js";
import { apiFetch } from "../../reuse/api-client.js";
import { openPopup } from "../../reuse/popup.js";
import { watchToken } from "../../reuse/validation-url.js";
import { showToast } from "../../reuse/toast.js";

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
 *   const generalPrefs = initGeneralPrefs(root, { i18n, username });
 *   await generalPrefs.init();
 *
 * @param {Element} root
 * @param {{ i18n: object, username: string }} options
 * @returns {{ init: () => Promise<void> }}
 */
export function initGeneralPrefs(root, { i18n, username }) {
    let emails = [];
    let trustedDomains = null;

    async function loadEmails() {
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails`,
        );
        if (!res.ok) return;
        const payload = await res.json();
        emails = payload.data ?? [];
    }

    async function loadTrustedDomains() {
        if (trustedDomains !== null) return trustedDomains;
        try {
            const res = await apiFetch("/api/v1/system/security");
            if (!res.ok) {
                trustedDomains = [];
                return trustedDomains;
            }
            const payload = await res.json();
            trustedDomains = payload.data?.trustedDomains ?? [];
        } catch {
            trustedDomains = [];
        }
        return trustedDomains;
    }

    function isDomainAllowed(address) {
        if (!trustedDomains || trustedDomains.length === 0) return true;
        const parts = address.split("@");
        if (parts.length !== 2) return false;
        const domain = parts[1].toLowerCase();
        return trustedDomains.includes(domain);
    }

    async function addEmail(address) {
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails`,
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
        if (res.status === 503) throw new Error("smtp_unavailable");
        if (!res.ok) throw new Error("add_failed");
        const payload = await res.json();
        return payload.data ?? {};
    }

    async function removeEmail(address) {
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}`,
            { method: "DELETE" },
        );
        if (res.status === 409) {
            const payload = await res.json();
            const code = payload?.error?.code ?? "remove_failed";
            throw new Error(code);
        }
        if (!res.ok) throw new Error("remove_failed");
    }

    async function forceRemoveUnverifiedEmail(address) {
        await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}?force=true`,
            { method: "DELETE" },
        );
    }

    async function resendVerification(address) {
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/resend`,
            { method: "POST" },
        );
        if (res.status === 429) throw new Error("rate_limited");
        if (res.status === 503) throw new Error("smtp_unavailable");
        if (!res.ok) throw new Error("resend_failed");
        const payload = await res.json();
        return payload.data ?? {};
    }

    async function setPrimaryEmail(address) {
        await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/primary`,
            { method: "PUT" },
        );
    }

    async function submitVerificationCode(address, code) {
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(address)}/verify`,
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
        const listEl = root.querySelector("#email-list");
        if (!listEl) return;
        if (!emails.length) {
            listEl.innerHTML = `<li class="email-list-item"><span class="email-address">${i18n.t("ui.app.settings.emails_none")}</span></li>`;
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
                    : `<button class="btn-animated" type="button" data-set-primary="${escaped}">${i18n.t("ui.app.settings.emails_set_primary")}</button>`;
                const removeBtn = entry.primary
                    ? ""
                    : `<button class="btn-animated" type="button" data-remove-email="${escaped}">${i18n.t("ui.app.settings.emails_remove")}</button>`;
                return `<li class="email-list-item"><span class="email-address">${escaped}</span>${verifiedBadge}${primaryBadge}${removeBtn}</li>`;
            })
            .join("");
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
                            apiFetch(
                                `/api/v1/users/${encodeURIComponent(username)}/emails`,
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
        await loadTrustedDomains();
        if (!isDomainAllowed(address)) {
            showToast(i18n.t("ui.app.settings.emails_domain_blocked_body"), {
                variant: "warning",
            });
            return false;
        }
        return true;
    }

    function bindEmailActions() {
        root.addEventListener("click", async (evt) => {
            const target = evt.target;
            if (!(target instanceof HTMLElement)) return;

            const removeAttr = target.dataset.removeEmail;
            if (removeAttr) {
                try {
                    await removeEmail(removeAttr);
                    await loadEmails();
                    renderEmailList();
                } catch (err) {
                    const code =
                        err instanceof Error ? err.message : "remove_failed";
                    if (code === "cannot_remove_primary_email") {
                        showToast(
                            i18n.t(
                                "ui.app.settings.emails_remove_primary_body",
                            ),
                            { variant: "warning" },
                        );
                    } else {
                        showStatus(
                            i18n.t("ui.app.settings.emails_remove_failed"),
                        );
                    }
                }
                return;
            }

            const setPrimaryAttr = target.dataset.setPrimary;
            if (setPrimaryAttr) {
                await setPrimaryEmail(setPrimaryAttr);
                await loadEmails();
                renderEmailList();
                return;
            }

            const resendAttr = target.dataset.resendVerification;
            if (resendAttr) {
                const allowed = await checkDomainAndNotify(resendAttr);
                if (!allowed) return;
                try {
                    const result = await resendVerification(resendAttr);
                    const action = await openVerifyPopup(
                        resendAttr,
                        result.watchToken,
                    );
                    if (action !== "verified") {
                        try {
                            await forceRemoveUnverifiedEmail(resendAttr);
                        } catch {
                            /* ignore */
                        }
                    }
                    await loadEmails();
                    renderEmailList();
                } catch (err) {
                    const code =
                        err instanceof Error ? err.message : "resend_failed";
                    if (code === "rate_limited") {
                        showStatus(
                            i18n.t(
                                "ui.app.settings.emails_verify_rate_limited",
                            ),
                        );
                    } else if (code === "smtp_unavailable") {
                        showStatus(
                            i18n.t("ui.app.settings.emails_verify_unavailable"),
                        );
                    } else {
                        showStatus(i18n.t("ui.app.settings.emails_add_failed"));
                    }
                }
                return;
            }

            if (target.id === "email-add-btn") {
                const input = root.querySelector("#email-add-input");
                if (!(input instanceof HTMLInputElement)) return;
                const address = input.value.trim().toLowerCase();
                if (!address) return;
                const allowed = await checkDomainAndNotify(address);
                if (!allowed) return;
                try {
                    const result = await addEmail(address);
                    input.value = "";
                    await loadEmails();
                    renderEmailList();
                    if (result.pendingVerification) {
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
                            i18n.t("ui.app.settings.emails_already_verified"),
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
                    } else if (code === "smtp_unavailable") {
                        showStatus(
                            i18n.t("ui.app.settings.emails_verify_unavailable"),
                        );
                    } else {
                        showStatus(i18n.t("ui.app.settings.emails_add_failed"));
                    }
                }
                return;
            }
        });
    }

    return {
        async init() {
            await loadEmails();
            renderEmailList();
            bindEmailActions();
        },
        async refresh() {
            await loadEmails();
            renderEmailList();
        },
    };
}
