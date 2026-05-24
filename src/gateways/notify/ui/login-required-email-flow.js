import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

async function loadUserEmails(accountId) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
    );
    if (!response.ok) {
        throw new Error("load_failed");
    }
    const payload = await response.json().catch(() => null);
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function promptRequiredEmailAddress(i18n) {
    let inputElement = null;
    const action = await openPopup({
        title: i18n.t("ui.app.settings.emails_add"),
        body: () => `
      <label class="stack">
        <span>${i18n.t("ui.reuse.invite_email")}</span>
        <input id="required-email-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
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
            inputElement = overlay.querySelector("#required-email-input");
        },
    });
    if (action !== "confirm" || !(inputElement instanceof HTMLInputElement)) {
        return null;
    }
    return inputElement.value.trim().toLowerCase();
}

async function promptVerificationCode(i18n, emailAddress) {
    let inputElement = null;
    const action = await openPopup({
        title: i18n.t("ui.app.settings.emails_verify_title"),
        body: `
      <p>${escapeHtml(formatTemplate(i18n.t("ui.app.settings.emails_verify_prompt"), { email: emailAddress }))}</p>
      <label class="stack">
        <span>${i18n.t("ui.app.settings.emails_verify_submit")}</span>
        <input id="required-email-code-input" type="text" inputmode="numeric" maxlength="6" />
      </label>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.app.settings.emails_verify_submit"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            inputElement = overlay.querySelector("#required-email-code-input");
        },
    });
    if (action !== "confirm" || !(inputElement instanceof HTMLInputElement)) {
        return null;
    }
    return inputElement.value.trim();
}

async function verifyRequiredEmailLoop({ accountId, emailAddress, i18n }) {
    while (true) {
        const code = await promptVerificationCode(i18n, emailAddress);
        if (!code) continue;
        const verifyResponse = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails/${encodeURIComponent(emailAddress)}/verify`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ code }),
            },
        );
        if (verifyResponse.ok) return;
        if (verifyResponse.status === 422) {
            showToast(i18n.t("ui.app.settings.emails_verify_invalid"), {
                variant: "error",
            });
            continue;
        }
        showToast(i18n.t("ui.app.settings.emails_verify_failed"), {
            variant: "error",
        });
    }
}

async function addRequiredEmail({ accountId, emailAddress }) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: emailAddress }),
        },
    );
    if (response.ok) {
        return { ok: true, code: null };
    }
    const payload = await response.json().catch(() => null);
    return {
        ok: false,
        code: String(payload?.error?.code ?? "add_failed"),
    };
}

function showAddEmailFailure({ code, i18n }) {
    if (code === "email_taken") {
        showToast(i18n.t("ui.app.settings.emails_email_taken"), {
            variant: "error",
        });
        return;
    }
    if (code === "rate_limited") {
        showToast(i18n.t("ui.app.settings.emails_verify_rate_limited"), {
            variant: "error",
        });
        return;
    }
    if (code === "smtp_unavailable") {
        showToast(i18n.t("ui.app.settings.emails_verify_unavailable"), {
            variant: "error",
        });
        return;
    }
    showToast(i18n.t("ui.app.settings.emails_add_failed"), {
        variant: "error",
    });
}

export function createRequiredEmailEnforcementClient() {
    return {
        async enforceRequiredEmailSetup({ accountId, i18n }) {
            while (true) {
                const emails = await loadUserEmails(accountId);
                const hasVerifiedPrimary = emails.some(
                    (entry) =>
                        entry.primary === true && entry.verified === true,
                );
                if (hasVerifiedPrimary) return;
                const emailAddress = await promptRequiredEmailAddress(i18n);
                if (!emailAddress) continue;
                const addResult = await addRequiredEmail({
                    accountId,
                    emailAddress,
                });
                if (!addResult.ok) {
                    showAddEmailFailure({
                        code: addResult.code,
                        i18n,
                    });
                    continue;
                }
                await verifyRequiredEmailLoop({
                    accountId,
                    emailAddress,
                    i18n,
                });
            }
        },
    };
}
