import { formatDateTime } from "/static/reuse/timestamp.js";

export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let tokens = [];
    let socialGatewayEnabled = false;
    let invitationPolicy = null;
    const isOwner = localStorage.getItem("cognis_role") === "owner";

    const dataReady = Promise.all([
        apiFetch("/api/v1/registration/tokens?includeClosed=true"),
        apiFetch("/api/v1/gateways/social"),
        apiFetch("/api/v1/registration/policy"),
    ]).then(async ([tokensRes, profileRes, policyRes]) => {
        if (tokensRes.ok) {
            const payload = await tokensRes.json();
            tokens = payload.data ?? [];
        }
        if (profileRes.ok) {
            const payload = await profileRes.json();
            socialGatewayEnabled = payload?.data?.status !== "disabled";
        }
        if (policyRes.ok) {
            invitationPolicy = (await policyRes.json())?.data ?? null;
        }
    });

    function statusLabel(status) {
        const key = `ui.app.invite.status_${status ?? "pending"}`;
        return escapeHtml(i18n.t(key));
    }

    function renderTokenRow(token) {
        const isPending = !token.status || token.status === "pending";
        const revokeHtml = isPending
            ? `<button class="invite-revoke-btn btn-animated" type="button" data-token-id="${escapeHtml(token.id)}">${escapeHtml(i18n.t("ui.app.invite.revoke"))}</button>`
            : "";
        const expiresAt = token.expiresAt
            ? escapeHtml(formatDateTime(token.expiresAt))
            : "";
        const issuerUsername = String(token.inviterAccountId ?? "");
        const redeemedUsername = String(token.redeemedAccountId ?? "");
        const issuerCell = socialGatewayEnabled
            ? `<a href="/profile/${encodeURIComponent(issuerUsername)}">${escapeHtml(issuerUsername)}</a>`
            : escapeHtml(issuerUsername);
        const redeemedCell = redeemedUsername
            ? socialGatewayEnabled
                ? `<a href="/profile/${encodeURIComponent(redeemedUsername)}">${escapeHtml(redeemedUsername)}</a>`
                : escapeHtml(redeemedUsername)
            : "—";
        return `
        <tr>
          <td>${escapeHtml(token.inviteeEmail)}</td>
          <td>${issuerCell}</td>
          <td>${redeemedCell}</td>
          <td>${statusLabel(token.status)}</td>
          <td>${expiresAt}</td>
          <td class="users-actions-cell">${revokeHtml}</td>
        </tr>`;
    }

    function renderContent() {
        const tableHtml =
            tokens.length === 0
                ? `<p class="registration-no-tokens"><em>${escapeHtml(i18n.t("gateway.registration.no_tokens"))}</em></p>`
                : `
        <div class="users-table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>${escapeHtml(i18n.t("ui.app.invite.email"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.issuer"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.username"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.status"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.expires_at"))}</th>
                <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
              </tr>
            </thead>
            <tbody>
              ${tokens.map(renderTokenRow).join("")}
            </tbody>
          </table>
        </div>`;

        return `
      ${
          isOwner && invitationPolicy
              ? `
      <div class="security-settings-form">
        <label class="security-checkbox-row"><input id="registration-founder-invites" type="checkbox" ${invitationPolicy.founderInvitesEnabled ? "checked" : ""} /> <span>${escapeHtml(i18n.t("gateway.registration.allow_founder_invites"))}</span></label>
        <label class="security-checkbox-row"><input id="registration-admin-invites" type="checkbox" ${invitationPolicy.adminInvitesEnabled ? "checked" : ""} /> <span>${escapeHtml(i18n.t("gateway.registration.allow_admin_invites"))}</span></label>
        <button id="registration-policy-save" class="btn-confirm btn-animated" type="button">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
      </div>`
              : ""
      }
      <div class="security-settings-form">
        <p class="security-field-hint">${escapeHtml(i18n.t("ui.app.invite.page_subtitle"))}</p>
        <div class="security-field-row">
          <a class="btn-confirm btn-animated" href="/invite">${escapeHtml(i18n.t("ui.reuse.invite"))}</a>
        </div>
      </div>
      ${tableHtml}
    `;
    }

    return {
        id: "registration",
        label: i18n.t("ui.reuse.registration"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-registration-layout",
            heading: i18n.t("ui.reuse.registration"),
            elements: [
                {
                    id: "registration-settings",
                    label: i18n.t("ui.reuse.registration"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
            onRender: (root) => {
                root.querySelector(
                    "#registration-policy-save",
                )?.addEventListener("click", async () => {
                    const founderInvitesEnabled =
                        root.querySelector("#registration-founder-invites")
                            ?.checked === true;
                    const adminInvitesEnabled =
                        root.querySelector("#registration-admin-invites")
                            ?.checked === true;
                    const response = await apiFetch(
                        "/api/v1/registration/policy",
                        {
                            method: "PUT",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({
                                founderInvitesEnabled,
                                adminInvitesEnabled,
                            }),
                        },
                    );
                    showToast(
                        i18n.t(
                            response.ok
                                ? "ui.reuse.saved"
                                : "ui.reuse.save_failed",
                        ),
                        { variant: response.ok ? "success" : "error" },
                    );
                });
                root.querySelectorAll(".invite-revoke-btn").forEach((btn) => {
                    btn.addEventListener("click", async () => {
                        const tokenId = btn.dataset.tokenId;
                        if (!tokenId) return;
                        const res = await apiFetch(
                            `/api/v1/registration/tokens/${encodeURIComponent(tokenId)}/revoke`,
                            { method: "POST" },
                        );
                        if (res.ok) {
                            const idx = tokens.findIndex(
                                (t) => t.id === tokenId,
                            );
                            if (idx >= 0) {
                                tokens[idx] = {
                                    ...tokens[idx],
                                    status: "revoked",
                                };
                            }
                            btn.closest("tr")
                                ?.querySelector(".invite-revoke-btn")
                                ?.remove();
                            const statusCell = btn.closest("tr")?.cells[3];
                            if (statusCell) {
                                statusCell.textContent = statusLabel("revoked");
                            }
                        } else {
                            showToast(i18n.t("ui.reuse.invite_failed"), {
                                variant: "error",
                            });
                        }
                    });
                });
            },
        },
    };
}
