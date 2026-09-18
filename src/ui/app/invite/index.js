import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { showToast } from "../../reuse/toast.js";
import { copyTextToClipboard } from "../../reuse/clipboard.js";
import { openPopup } from "../../reuse/popup.js";
import { ensurePageStylesheet } from "../../reuse/page-styles.js";
import {
    bindSecretVisibilityToggles,
    renderSecretVisibilityField,
} from "../../reuse/secret-visibility-toggle.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { createRepromptGuard } from "/static/gateways/auth/reuse/password-confirmation.js";
import { formatDateTime } from "../../reuse/timestamp.js";
import {
    createRegistrationToken,
    listRegistrationTokens,
    loadRegistrationInviteUi,
    loadRegistrationState,
    revokeRegistrationToken,
} from "/static/gateways/registration/client.js";

async function loadTokens() {
    const response = await listRegistrationTokens(apiFetch, {
        includeClosed: true,
    });
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

async function loadInviteState() {
    const response = await loadRegistrationState(apiFetch);
    if (!response.ok) return { inviteEnabled: false };
    const payload = await response.json();
    return payload?.data ?? { inviteEnabled: false };
}

function renderTokenRow(row, i18n, issuedTokens) {
    const isPending = !row.status || row.status === "pending";
    const revokeHtml = isPending
        ? `<button class="invite-revoke-btn btn-cancel btn-animated" data-token-id="${escapeHtml(row.id)}">${escapeHtml(i18n.t("ui.app.invite.revoke"))}</button>`
        : "";
    const expiresAt = row.expiresAt
        ? escapeHtml(formatDateTime(row.expiresAt))
        : "—";
    const issuerUsername = String(row.inviterAccountId ?? "");
    const redeemedUsername = String(row.redeemedAccountId ?? "");
    const registrationToken = isPending ? (issuedTokens.get(row.id) ?? "") : "";
    const inviteTarget = row.inviteeEmail
        ? escapeHtml(row.inviteeEmail)
        : registrationToken
          ? `<div class="invite-token-target">${renderSecretVisibilityField({
                id: `invite-token-${row.id}`,
                value: registrationToken,
                toggleLabel: i18n.t("ui.reuse.toggle_secret_visibility"),
                escapeHtml,
            })}<button class="invite-copy-btn btn-neutral btn-animated" type="button" data-invite-token="${escapeHtml(registrationToken)}">${escapeHtml(i18n.t("ui.reuse.copy"))}</button></div>`
          : "—";
    return `
      <tr>
        <td>${escapeHtml(i18n.t(row.inviteeEmail ? "gateway.registration.email_tab" : "gateway.registration.token_tab"))}</td>
        <td>${inviteTarget}</td>
        <td>${escapeHtml(issuerUsername)}</td>
        <td>${redeemedUsername ? escapeHtml(redeemedUsername) : "—"}</td>
        <td>${escapeHtml(i18n.t(`ui.app.invite.status_${row.status ?? "pending"}`))}</td>
        <td>${expiresAt}</td>
        <td>${revokeHtml}</td>
      </tr>
    `;
}

/**
 * Mounts the invite management page into the provided root element.
 *
 * @param {HTMLElement} root - Target app container.
 * @param {{ signal?: AbortSignal }} [options] - Optional lifecycle controls.
 * @returns {Promise<void>} Resolves when the page has finished initialising.
 */
export async function mount(root, { signal } = {}) {
    ensurePageStylesheet("/static/styles/invite.css");
    let i18n = await createI18n();
    i18n = await loadRegistrationInviteUi(i18n, extendI18n);
    applyDocumentTitle(i18n, "ui.page.title.invite");
    const reprompt = createRepromptGuard({ i18n });

    const inviteState = await loadInviteState();
    let tokens = inviteState.inviteEnabled ? await loadTokens() : [];
    const issuedTokens = new Map();
    let composer = null;
    const elements = [
        {
            id: "invite-tokens",
            label: i18n.t("ui.reuse.invite"),
            pinned: true,
            gridSize: { default: [12, 4], min: [6, 4], max: "full" },
            render: () => `
        <div class="controls invite-actions">
          ${
              inviteState.inviteEnabled
                  ? `<button id="invite-email-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(i18n.t("gateway.registration.send_invite_email"))}</button>
                     ${inviteState.canGenerateToken ? `<button id="invite-token-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(i18n.t("gateway.registration.generate_registration_token"))}</button>` : ""}`
                  : `<em>${escapeHtml(i18n.t("ui.app.register.closed"))}</em>`
          }
        </div>
        <div class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t("ui.app.invite.method"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.target"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.issuer"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.username"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.status"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.expires_at"))}</th>
              <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
            </tr>
          </thead>
          <tbody>
            ${tokens.map((tokenRow) => renderTokenRow(tokenRow, i18n, issuedTokens)).join("")}
          </tbody>
        </table>
        </div>
      `,
        },
    ];

    composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "invite-layout",
        pageContext: {
            title: i18n.t("ui.reuse.invite"),
            subtitle: i18n.t("ui.app.invite.page_subtitle"),
        },
        toolbar: [],
        elements,
        enableDomParking: false,
    });

    await composer.init();

    const pageInteractionController = new AbortController();
    signal?.addEventListener("abort", () => pageInteractionController.abort(), {
        once: true,
    });
    bindSecretVisibilityToggles({
        root,
        signal: pageInteractionController.signal,
    });

    root.addEventListener(
        "click",
        async (event) => {
            const targetElement = event.target;
            if (!(targetElement instanceof Element)) return;
            const refreshTokens = async () => {
                tokens = await loadTokens();
                composer.refreshElements(["invite-tokens"]);
            };
            const emailButton = targetElement.closest("#invite-email-btn");
            if (emailButton) {
                let inviteEmail = "";
                const action = await openPopup({
                    title: i18n.t("gateway.registration.send_invite_email"),
                    body: `<label class="stack"><span>${escapeHtml(i18n.t("ui.app.invite.email"))}</span><input id="invite-email" type="email" placeholder="${escapeHtml(i18n.t("ui.reuse.email_placeholder"))}" required /></label>`,
                    actions: [
                        {
                            id: "create",
                            label: i18n.t("gateway.registration.create_invite"),
                            variant: "confirm",
                        },
                    ],
                    onAction: (actionId, overlay) => {
                        if (actionId !== "create") return true;
                        inviteEmail =
                            overlay
                                .querySelector("#invite-email")
                                ?.value?.trim() ?? "";
                        return Boolean(inviteEmail);
                    },
                });
                if (action !== "create") return;
                try {
                    await reprompt.runWithReprompt(async () => {
                        const response = await createRegistrationToken(
                            apiFetch,
                            {
                                email: inviteEmail,
                                delivery: "email",
                            },
                        );
                        if (!response.ok) {
                            const payload = await response
                                .json()
                                .catch(() => null);
                            const code = String(
                                payload?.error?.code ?? "invite_failed",
                            );
                            showToast(
                                i18n.t(
                                    code === "email_domain_not_allowed"
                                        ? "ui.app.invite.email_domain_not_allowed"
                                        : "ui.reuse.invite_failed",
                                ),
                                { variant: "error" },
                            );
                            return;
                        }
                        showToast(i18n.t("ui.reuse.invite_sent"), {
                            variant: "success",
                        });
                    });
                } finally {
                    await refreshTokens();
                }
                return;
            }
            const tokenButton = targetElement.closest("#invite-token-btn");
            if (tokenButton) {
                try {
                    await reprompt.runWithReprompt(async () => {
                        const response = await createRegistrationToken(
                            apiFetch,
                            {
                                delivery: "manual",
                            },
                        );
                        if (!response.ok) {
                            showToast(i18n.t("ui.reuse.invite_failed"), {
                                variant: "error",
                            });
                            return;
                        }
                        const payload = await response.json().catch(() => null);
                        const tokenId = String(payload?.data?.tokenId ?? "");
                        const registrationToken = String(
                            payload?.data?.registrationToken ?? "",
                        );
                        if (tokenId && registrationToken)
                            issuedTokens.set(tokenId, registrationToken);
                        await refreshTokens();
                        await openPopup({
                            title: i18n.t(
                                "gateway.registration.generate_registration_token",
                            ),
                            body: renderSecretVisibilityField({
                                id: "generated-registration-token",
                                value: registrationToken,
                                label: i18n.t("ui.app.invite.target"),
                                toggleLabel: i18n.t(
                                    "ui.reuse.toggle_secret_visibility",
                                ),
                                escapeHtml,
                            }),
                            actions: [
                                {
                                    id: "copy",
                                    label: i18n.t("ui.reuse.copy"),
                                },
                                {
                                    id: "close",
                                    label: i18n.t("ui.reuse.done"),
                                    variant: "confirm",
                                },
                            ],
                            onOpen: (overlay) => {
                                bindSecretVisibilityToggles({ root: overlay });
                            },
                            onAction: async (actionId, overlay) => {
                                if (actionId !== "copy") return true;
                                const copied =
                                    await copyTextToClipboard(
                                        registrationToken,
                                    );
                                const copyButton = overlay.querySelector(
                                    '[data-popup-action="copy"]',
                                );
                                copyButton?.classList.toggle(
                                    "popup-action-btn--copied",
                                    copied,
                                );
                                showToast(
                                    i18n.t(
                                        copied
                                            ? "gateway.registration.token_copied"
                                            : "ui.reuse.markdown_code_copy_failed",
                                    ),
                                    {
                                        variant: copied ? "success" : "error",
                                    },
                                );
                                return false;
                            },
                        });
                    });
                } finally {
                    await refreshTokens();
                }
                return;
            }
            const copyButton = targetElement.closest(".invite-copy-btn");
            if (copyButton) {
                const copied = await copyTextToClipboard(
                    copyButton.dataset.inviteToken ?? "",
                );
                showToast(
                    i18n.t(
                        copied
                            ? "gateway.registration.token_copied"
                            : "ui.reuse.markdown_code_copy_failed",
                    ),
                    { variant: copied ? "success" : "error" },
                );
                return;
            }

            const revokeButton = targetElement.closest(".invite-revoke-btn");
            if (!revokeButton) return;
            const tokenId = revokeButton.dataset.tokenId;
            if (!tokenId) return;
            try {
                const response = await revokeRegistrationToken(
                    apiFetch,
                    tokenId,
                );
                if (response.ok) issuedTokens.delete(tokenId);
                showToast(
                    i18n.t(
                        response.ok
                            ? "ui.app.invite.revoke_success"
                            : "ui.app.invite.revoke_failed",
                    ),
                    { variant: response.ok ? "success" : "error" },
                );
            } finally {
                tokens = await loadTokens();
                composer.refreshElements(["invite-tokens"]);
            }
        },
        { signal: pageInteractionController.signal },
    );
}

await mountWhenDirect(mount);
