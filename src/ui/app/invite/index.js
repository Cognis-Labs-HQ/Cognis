import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { showToast } from "../../reuse/toast.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { createRepromptGuard } from "../../reuse/reprompt.js";
import { formatDateTime } from "../../reuse/timestamp.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.invite");
const reprompt = createRepromptGuard({ i18n });

async function loadTokens() {
    const response = await apiFetch(
        "/api/v1/registration/tokens?includeClosed=true",
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

async function loadInviteState() {
    const response = await apiFetch("/api/v1/registration/state");
    if (!response.ok) return { inviteEnabled: false };
    const payload = await response.json();
    return payload?.data ?? { inviteEnabled: false };
}

async function promptEmail() {
    let inputEl = null;
    const action = await openPopup({
        title: i18n.t("ui.app.invite.invite"),
        body: () => `
      <label class="stack">
        <span>${escapeHtml(i18n.t("ui.app.invite.email"))}</span>
        <input id="invite-email" type="email" />
      </label>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.reuse.generic.confirm"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.popup.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            inputEl = overlay.querySelector("#invite-email");
        },
    });
    if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim();
}

function renderTokenRow(row) {
    const isPending = !row.status || row.status === "pending";
    const revokeHtml = isPending
        ? `<button class="invite-revoke-btn btn-cancel btn-animated" data-token-id="${escapeHtml(row.id)}">${escapeHtml(i18n.t("ui.app.invite.revoke"))}</button>`
        : "";
    const expiresAt = row.expiresAt
        ? escapeHtml(formatDateTime(row.expiresAt))
        : "—";
    const issuerUsername = String(row.inviterAccountId ?? "");
    const redeemedUsername = String(row.redeemedAccountId ?? "");
    return `
      <tr>
        <td>${escapeHtml(row.inviteeEmail)}</td>
        <td>${escapeHtml(issuerUsername)}</td>
        <td>${redeemedUsername ? escapeHtml(redeemedUsername) : "—"}</td>
        <td>${escapeHtml(i18n.t(`ui.app.invite.status_${row.status ?? "pending"}`))}</td>
        <td>${expiresAt}</td>
        <td>
          ${revokeHtml}
        </td>
      </tr>
    `;
}

const inviteState = await loadInviteState();
let tokens = inviteState.inviteEnabled ? await loadTokens() : [];
let composer = null;
const elements = [
    {
        id: "invite-tokens",
        label: i18n.t("ui.reuse.menu.invite"),
        pinned: true,
        gridSize: { default: [12, 4], min: [6, 4], max: "full" },
        render: () => `
        <div class="controls">
          ${
              inviteState.inviteEnabled
                  ? `<button id="invite-create-btn" class="btn-confirm btn-animated" type="button">+ ${escapeHtml(i18n.t("ui.app.invite.invite"))}</button>`
                  : `<em>${escapeHtml(i18n.t("ui.app.register.closed"))}</em>`
          }
        </div>
        <div class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t("ui.app.invite.email"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.issuer"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.username"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.status"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.expires_at"))}</th>
              <th>${escapeHtml(i18n.t("ui.reuse.generic.actions"))}</th>
            </tr>
          </thead>
          <tbody>
            ${tokens.map(renderTokenRow).join("")}
          </tbody>
        </table>
        </div>
      `,
    },
];

function bindInviteInteractions() {
    root.querySelector("#invite-create-btn")?.addEventListener(
        "click",
        async () => {
            await reprompt.runWithReprompt(async () => {
                let email = await promptEmail();
                while (email) {
                    const response = await apiFetch(
                        "/api/v1/registration/tokens",
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({ email }),
                        },
                    );
                    if (!response.ok) {
                        const payload = await response.json().catch(() => null);
                        const code = String(
                            payload?.error?.code ?? "invite_failed",
                        );
                        if (code === "email_domain_not_allowed") {
                            showToast(
                                i18n.t(
                                    "ui.app.invite.email_domain_not_allowed",
                                ),
                                { variant: "error" },
                            );
                            email = await promptEmail();
                            continue;
                        }
                        showToast(i18n.t("ui.app.invite.invite_failed"), {
                            variant: "error",
                        });
                        return;
                    }
                    showToast(i18n.t("ui.app.invite.invite_sent"), {
                        variant: "success",
                    });
                    tokens = await loadTokens();
                    composer.refresh(elements);
                    return;
                }
            });
        },
    );

    root.querySelectorAll(".invite-revoke-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const tokenId = btn.dataset.tokenId;
            if (!tokenId) return;
            const response = await apiFetch(
                `/api/v1/registration/tokens/${encodeURIComponent(tokenId)}/revoke`,
                { method: "POST" },
            );
            if (!response.ok) {
                showToast(i18n.t("ui.app.invite.revoke_failed"), {
                    variant: "error",
                });
                return;
            }
            showToast(i18n.t("ui.app.invite.revoke_success"), {
                variant: "success",
            });
            tokens = await loadTokens();
            composer.refresh(elements);
        });
    });
}

composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "invite-layout",
    pageContext: {
        title: i18n.t("ui.app.invite.page_title"),
        subtitle: i18n.t("ui.app.invite.page_subtitle"),
    },
    toolbar: [],
    elements,
    onRender: () => {
        bindInviteInteractions();
    },
});

await composer.init();
