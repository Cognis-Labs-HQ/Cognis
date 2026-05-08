export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let tokens = [];

    const dataReady = apiFetch(
        "/api/v1/registration/tokens?includeClosed=true",
    ).then(async (res) => {
        if (!res.ok) return;
        const payload = await res.json();
        tokens = payload.data ?? [];
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
            ? escapeHtml(new Date(token.expiresAt).toLocaleString())
            : "";
        return `
        <tr>
          <td>${escapeHtml(token.inviteeEmail)}</td>
          <td>${statusLabel(token.status)}</td>
          <td>${expiresAt}</td>
          <td class="users-actions-cell">${revokeHtml}</td>
        </tr>`;
    }

    function renderContent() {
        const tableHtml =
            tokens.length === 0
                ? `<p class="registration-no-tokens"><em>${escapeHtml(i18n.t("ui.app.admin.registration.no_tokens"))}</em></p>`
                : `
        <div class="users-table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>${escapeHtml(i18n.t("ui.app.invite.email"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.status"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.expires_at"))}</th>
                <th>${escapeHtml(i18n.t("ui.reuse.generic.actions"))}</th>
              </tr>
            </thead>
            <tbody>
              ${tokens.map(renderTokenRow).join("")}
            </tbody>
          </table>
        </div>`;

        return `
      <div class="security-settings-form">
        <p class="security-field-hint">${escapeHtml(i18n.t("ui.app.invite.page_subtitle"))}</p>
        <div class="security-field-row">
          <a class="btn-confirm btn-animated" href="/users?action=invite">${escapeHtml(i18n.t("ui.reuse.menu.invite"))}</a>
        </div>
      </div>
      ${tableHtml}
    `;
    }

    return {
        id: "registration",
        label: i18n.t("ui.reuse.menu.registration"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-registration-layout",
            heading: i18n.t("ui.reuse.menu.registration"),
            elements: [
                {
                    id: "registration-settings",
                    label: i18n.t("ui.reuse.menu.registration"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
            onRender: (root) => {
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
                            const statusCell = btn.closest("tr")?.cells[1];
                            if (statusCell) {
                                statusCell.textContent = statusLabel("revoked");
                            }
                        } else {
                            showToast(i18n.t("ui.app.invite.invite_failed"), {
                                variant: "error",
                            });
                        }
                    });
                });
            },
        },
    };
}
