import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { showToast } from "../../reuse/toast.js";
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

function renderTokenRow(row, i18n) {
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
        <td>${escapeHtml(i18n.t(row.inviteeEmail ? "gateway.registration.email_tab" : "gateway.registration.token_tab"))}</td>
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

/**
 * Mounts the invite management page into the provided root element.
 *
 * @param {HTMLElement} root - Target app container.
 * @param {{ signal?: AbortSignal }} [options] - Optional lifecycle controls.
 * @returns {Promise<void>} Resolves when the page has finished initialising.
 */
export async function mount(root, { signal } = {}) {
    let i18n = await createI18n();
    i18n = await loadRegistrationInviteUi(i18n, extendI18n);
    applyDocumentTitle(i18n, "ui.page.title.invite");
    const reprompt = createRepromptGuard({ i18n });

    const inviteState = await loadInviteState();
    let tokens = inviteState.inviteEnabled ? await loadTokens() : [];
    let delivery = "email";
    let composer = null;
    const elements = [
        {
            id: "invite-tokens",
            label: i18n.t("ui.reuse.invite"),
            pinned: true,
            gridSize: { default: [12, 4], min: [6, 4], max: "full" },
            render: () => `
        <div class="controls">
          ${
              inviteState.inviteEnabled
                  ? `<div class="share-method-tabs" role="tablist" aria-label="${escapeHtml(i18n.t("gateway.registration.invite_methods"))}">
                       <button class="share-method-tab${delivery === "email" ? " is-active" : ""}" type="button" data-invite-delivery="email" aria-pressed="${delivery === "email"}">${escapeHtml(i18n.t("gateway.registration.email_tab"))}</button>
                       <button class="share-method-tab${delivery === "manual" ? " is-active" : ""}" type="button" data-invite-delivery="manual" aria-pressed="${delivery === "manual"}">${escapeHtml(i18n.t("gateway.registration.token_tab"))}</button>
                     </div>
                     <div data-invite-method-panel>
                       ${delivery === "email" ? `<label class="stack"><span>${escapeHtml(i18n.t("ui.app.invite.email"))}</span><input id="invite-email" type="email" placeholder="${escapeHtml(i18n.t("ui.reuse.email_placeholder"))}" required /></label>` : `<p class="share-method-description">${escapeHtml(i18n.t("gateway.registration.token_description"))}</p>`}
                     </div>
                     ${delivery === "email" ? `<button id="invite-create-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(i18n.t("gateway.registration.create_invite"))}</button>` : `<button id="invite-create-token-btn" class="btn-confirm btn-animated" type="button">${escapeHtml(i18n.t("gateway.registration.generate_token"))}</button>`}`
                  : `<em>${escapeHtml(i18n.t("ui.app.register.closed"))}</em>`
          }
        </div>
        <div class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t("ui.app.invite.method"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.email"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.issuer"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.username"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.status"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.invite.expires_at"))}</th>
              <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
            </tr>
          </thead>
          <tbody>
            ${tokens.map((tokenRow) => renderTokenRow(tokenRow, i18n)).join("")}
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
    });

    await composer.init();

    const pageInteractionController = new AbortController();
    signal?.addEventListener("abort", () => pageInteractionController.abort(), {
        once: true,
    });

    root.addEventListener(
        "click",
        async (event) => {
            const targetElement = event.target;
            if (!(targetElement instanceof Element)) return;
            const deliveryButton = targetElement.closest(
                "[data-invite-delivery]",
            );
            if (deliveryButton) {
                delivery = deliveryButton.dataset.inviteDelivery;
                composer.refresh(elements);
                return;
            }
            const createButton = targetElement.closest(
                "#invite-create-btn, #invite-create-token-btn",
            );
            if (createButton) {
                await reprompt.runWithReprompt(async () => {
                    const email =
                        delivery === "email"
                            ? root.querySelector("#invite-email")?.value?.trim()
                            : "";
                    if (delivery === "email" && !email) return;
                    const response = await createRegistrationToken(apiFetch, {
                        ...(email ? { email } : {}),
                        delivery,
                    });
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
                            return;
                        }
                        showToast(i18n.t("ui.reuse.invite_failed"), {
                            variant: "error",
                        });
                        return;
                    }
                    const payload = await response.json().catch(() => null);
                    if (delivery === "manual" && payload?.data?.inviteUrl) {
                        await navigator.clipboard.writeText(
                            payload.data.inviteUrl,
                        );
                    }
                    showToast(
                        i18n.t(
                            delivery === "manual"
                                ? "gateway.registration.token_copied"
                                : "ui.reuse.invite_sent",
                        ),
                        {
                            variant: "success",
                        },
                    );
                    tokens = await loadTokens();
                    composer.refresh(elements);
                    return;
                });
                return;
            }

            const revokeButton = targetElement.closest(".invite-revoke-btn");
            if (!revokeButton) return;
            const tokenId = revokeButton.dataset.tokenId;
            if (!tokenId) return;
            const response = await revokeRegistrationToken(apiFetch, tokenId);
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
        },
        { signal: pageInteractionController.signal },
    );
}

await mountWhenDirect(mount);
