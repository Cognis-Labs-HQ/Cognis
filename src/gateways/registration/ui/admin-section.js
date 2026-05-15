import { formatDateTime } from "/static/reuse/timestamp.js";

export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let tokens = [];
    let requests = [];
    let socialGatewayEnabled = false;

    const dataReady = Promise.all([
        apiFetch("/api/v1/registration/tokens?includeClosed=true"),
        apiFetch("/api/v1/registration/requests"),
        apiFetch("/api/v1/gateways/social"),
    ]).then(async ([tokensRes, requestsRes, profileRes]) => {
        if (tokensRes.ok) {
            const payload = await tokensRes.json();
            tokens = payload.data ?? [];
        }
        if (requestsRes.ok) {
            const payload = await requestsRes.json();
            requests = payload.data ?? [];
        }
        if (profileRes.ok) {
            const payload = await profileRes.json();
            socialGatewayEnabled = payload?.data?.status !== "disabled";
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

    function reviewStatusLabel(status) {
        const normalized =
            status === "approved" || status === "rejected" ? status : "pending";
        const key = `gateway.registration.request.status.${normalized}`;
        return escapeHtml(i18n.t(key));
    }

    function renderRequestRow(request) {
        const isPending = request.status === "pending";
        const reviewButtons = isPending
            ? `
              <button
                class="registration-request-review-btn btn-animated"
                type="button"
                data-request-id="${escapeHtml(request.id)}"
                data-next-status="approved"
              >${escapeHtml(i18n.t("gateway.registration.request.approve"))}</button>
              <button
                class="registration-request-review-btn btn-animated"
                type="button"
                data-request-id="${escapeHtml(request.id)}"
                data-next-status="rejected"
              >${escapeHtml(i18n.t("gateway.registration.request.reject"))}</button>
            `
            : "";
        const requestedAccountId = String(request.requestedAccountId ?? "");
        const accountCell = socialGatewayEnabled
            ? `<a href="/profile/${encodeURIComponent(requestedAccountId)}">${escapeHtml(requestedAccountId)}</a>`
            : escapeHtml(requestedAccountId);
        const requestedAt = request.createdAt
            ? escapeHtml(formatDateTime(request.createdAt))
            : "";
        return `
        <tr>
          <td>${escapeHtml(request.provider ?? "")}</td>
          <td>${escapeHtml(request.externalUserId ?? "")}</td>
          <td>${accountCell}</td>
          <td>${escapeHtml(request.requestedDisplayName ?? "")}</td>
          <td>${escapeHtml(request.requestedEmail ?? "—")}</td>
          <td>${reviewStatusLabel(request.status)}</td>
          <td>${requestedAt}</td>
          <td class="users-actions-cell">${reviewButtons}</td>
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
        const requestsTableHtml =
            requests.length === 0
                ? `<p class="registration-no-tokens"><em>${escapeHtml(i18n.t("gateway.registration.no_requests"))}</em></p>`
                : `
        <div class="users-table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>${escapeHtml(i18n.t("gateway.registration.request.provider"))}</th>
                <th>${escapeHtml(i18n.t("gateway.registration.request.external_user_id"))}</th>
                <th>${escapeHtml(i18n.t("gateway.registration.request.account_id"))}</th>
                <th>${escapeHtml(i18n.t("gateway.registration.request.display_name"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.email"))}</th>
                <th>${escapeHtml(i18n.t("ui.app.invite.status"))}</th>
                <th>${escapeHtml(i18n.t("gateway.registration.request.created_at"))}</th>
                <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
              </tr>
            </thead>
            <tbody>
              ${requests.map(renderRequestRow).join("")}
            </tbody>
          </table>
        </div>`;

        return `
      <div class="security-settings-form">
        <p class="security-field-hint">${escapeHtml(i18n.t("ui.app.invite.page_subtitle"))}</p>
        <div class="security-field-row">
          <a class="btn-confirm btn-animated" href="/users?action=invite">${escapeHtml(i18n.t("ui.reuse.invite"))}</a>
        </div>
      </div>
      ${tableHtml}
      <div class="security-settings-form">
        <p class="security-field-hint">${escapeHtml(i18n.t("gateway.registration.request.page_subtitle"))}</p>
      </div>
      ${requestsTableHtml}
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
                root.querySelectorAll(".registration-request-review-btn").forEach((btn) => {
                    btn.addEventListener("click", async () => {
                        const requestId = btn.dataset.requestId;
                        const status = btn.dataset.nextStatus;
                        if (!requestId || !status) return;
                        const res = await apiFetch(
                            `/api/v1/registration/requests/${encodeURIComponent(requestId)}/review`,
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ status }),
                            },
                        );
                        if (!res.ok) {
                            showToast(
                                i18n.t("gateway.registration.request.review_failed"),
                                {
                                    variant: "error",
                                },
                            );
                            return;
                        }
                        const idx = requests.findIndex((r) => r.id === requestId);
                        if (idx >= 0) {
                            requests[idx] = {
                                ...requests[idx],
                                status,
                            };
                        }
                        const row = btn.closest("tr");
                        const statusCell = row?.cells[5];
                        if (statusCell) {
                            statusCell.textContent = reviewStatusLabel(status);
                        }
                        row?.querySelectorAll(".registration-request-review-btn").forEach((actionBtn) => actionBtn.remove());
                        showToast(
                            i18n.t("gateway.registration.request.review_saved"),
                            {
                                variant: "success",
                            },
                        );
                    });
                });
            },
        },
    };
}
