import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { createRepromptGuard } from "../../reuse/reprompt.js";
import { openHamburgerMenu } from "../../reuse/hamburger-menu.js";
import { formatDate, formatDateTime } from "../../reuse/timestamp.js";

let root = null;
let i18n = null;
let reprompt = null;
let users = [];
let registrationGatewayActive = false;
let composer = null;
let elements = [];

function formatMemberSince(iso) {
    return formatDate(iso, i18n.t("ui.app.dashboard.never"));
}

function formatLastLogin(iso) {
    return formatDateTime(iso, i18n.t("ui.app.dashboard.never"));
}

function getCurrentUsername() {
    const token = localStorage.getItem("cognis_access_token");
    if (!token) return null;
    try {
        const [, payload] = token.split(".");
        const decoded = JSON.parse(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
        );
        return decoded.sub ?? null;
    } catch {
        return null;
    }
}

function getCurrentRole() {
    return (localStorage.getItem("cognis_role") ?? "user").trim();
}

function buildElements() {
    const estimatedHeight = Math.max(6, Math.ceil(users.length * 0.65 + 2));
    elements = [
        {
            id: "users-table",
            label: i18n.t("ui.reuse.users"),
            pinned: true,
            gridSize: {
                default: [12, estimatedHeight],
                min: [6, 5],
                max: ["full", "fill"],
            },
            render: () => renderUsersTable(),
        },
    ];
}

async function loadUsers() {
    const response = await apiFetch("/api/v1/users");
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

async function loadRegistrationGatewayState() {
    const response = await apiFetch("/api/v1/gateways/registration");
    if (!response.ok) return false;
    const payload = await response.json();
    if (payload?.data?.status === "disabled") return false;
    const adaptersRes = await apiFetch(
        "/api/v1/gateways/registration/adapters",
    );
    if (!adaptersRes.ok) return false;
    const adaptersPayload = await adaptersRes.json();
    const adapters = Array.isArray(adaptersPayload?.data)
        ? adaptersPayload.data
        : [];
    const inviteAdapter = adapters.find((entry) => entry.id === "invite");
    return inviteAdapter?.enabled === true;
}

async function fetchUserInfo(username) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(username)}/info`,
    );
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.data ?? null;
}

async function fetchUserEmails(username) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(username)}/emails`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return payload?.data ?? [];
}

async function promptInput({ title, label, type = "text" }) {
    let inputEl = null;
    const result = await openPopup({
        title,
        body: () => `
      <label class="stack">
        <span>${escapeHtml(label)}</span>
        <input id="users-input" type="${escapeHtml(type)}" />
      </label>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.reuse.confirm"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.popup_cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            inputEl = overlay.querySelector("#users-input");
        },
    });
    if (result !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim();
}

async function refreshData() {
    [users, registrationGatewayActive] = await Promise.all([
        loadUsers(),
        loadRegistrationGatewayState(),
    ]);
    buildElements();
}

function renderUsersTable() {
    const currentUsername = getCurrentUsername();
    const currentRole = getCurrentRole();
    const viewerIsAdmin = currentRole === "admin";
    const inviteButtonHtml = registrationGatewayActive
        ? `<div class="controls">
          <button id="users-invite-btn" class="btn-confirm btn-animated" type="button">+ ${escapeHtml(i18n.t("ui.app.users.invite"))}</button>
        </div>`
        : "";
    return `
    ${inviteButtonHtml}
    <div class="users-table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>${escapeHtml(i18n.t("ui.app.users.username"))}</th>
            <th>${escapeHtml(i18n.t("ui.app.users.role"))}</th>
            <th>${escapeHtml(i18n.t("ui.app.users.status"))}</th>
            <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
          </tr>
        </thead>
        <tbody>
          ${users
              .map((user) => {
                  const isProtected = user.isAdmin && user.isFounder;
                  const isSelf = user.username === currentUsername;
                  const userRole =
                      user.role ?? (user.isAdmin ? "admin" : "user");
                  const isOwner = userRole === "owner";
                  const protectAdminFromAdmin =
                      viewerIsAdmin && userRole === "admin" && !isSelf;
                  const roleDisabled =
                      isProtected || isOwner || isSelf || protectAdminFromAdmin;
                  const roleCellHtml = isOwner
                      ? escapeHtml("owner")
                      : `<select class="users-role-select theme-select" data-username="${escapeHtml(user.username)}"${roleDisabled ? " disabled" : ""}>
                            <option value="user"${userRole === "user" ? " selected" : ""}>${escapeHtml("user")}</option>
                            <option value="teacher"${userRole === "teacher" ? " selected" : ""}>${escapeHtml("teacher")}</option>
                            <option value="admin"${userRole === "admin" ? " selected" : ""}>${escapeHtml("admin")}</option>
                         </select>`;
                  const actionsHtml =
                      isProtected || isOwner || protectAdminFromAdmin
                          ? ""
                          : `
                        <button class="users-toggle-btn btn-animated" data-username="${escapeHtml(user.username)}" data-enabled="${user.enabled}"${isSelf ? " disabled" : ""}>${user.enabled ? escapeHtml(i18n.t("ui.reuse.disable")) : escapeHtml(i18n.t("ui.reuse.enable"))}</button>
                        <button class="users-menu-btn btn-animated" data-i18n-aria-label="ui.app.users.action_menu_help" aria-label="${escapeHtml(i18n.t("ui.app.users.action_menu_help"))}" data-username="${escapeHtml(user.username)}">☰</button>`;
                  return `
              <tr class="users-row" data-username="${escapeHtml(user.username)}">
                <td>${escapeHtml(user.username)}</td>
                <td>${roleCellHtml}</td>
                <td>${user.enabled ? escapeHtml(i18n.t("ui.app.users.enabled")) : escapeHtml(i18n.t("ui.app.users.disabled"))}</td>
                <td class="users-actions-cell">${actionsHtml}</td>
              </tr>
            `;
              })
              .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function runUserMenuAction(action, username) {
    if (action === "password") {
        const password = await promptInput({
            title: i18n.t("ui.app.users.reset_password"),
            label: i18n.t("ui.app.users.new_password"),
            type: "password",
        });
        if (!password) return;
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/password`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
            },
        );
        showToast(
            res.ok
                ? i18n.t("ui.app.users.password_reset_done")
                : i18n.t("ui.reuse.save_failed"),
            { variant: res.ok ? "success" : "error" },
        );
        return;
    }

    if (action === "resend") {
        const emails = await fetchUserEmails(username);
        const unverifiedEmail =
            emails.find((e) => e.isPrimary && !e.verified) ??
            emails.find((e) => !e.verified);
        if (!unverifiedEmail) {
            showToast(i18n.t("ui.app.users.no_unverified_email"), {
                variant: "error",
            });
            return;
        }
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(unverifiedEmail.email)}/resend`,
            { method: "POST" },
        );
        showToast(
            res.ok
                ? i18n.t("ui.app.users.verification_resent")
                : i18n.t("ui.reuse.save_failed"),
            { variant: res.ok ? "success" : "error" },
        );
        return;
    }

    if (action === "delete") {
        const confirmAction = await openPopup({
            title: i18n.t("ui.app.users.delete_user"),
            body: `<p>${escapeHtml(username)}</p><p>${escapeHtml(i18n.t("ui.app.users.delete_permanent_warning"))}</p>`,
            variant: "danger",
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.confirm"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.popup_cancel"),
                    variant: "cancel",
                },
            ],
        });
        if (confirmAction !== "confirm") return;
        await apiFetch(`/api/v1/users/${encodeURIComponent(username)}`, {
            method: "DELETE",
        });
        await refreshData();
        composer.refresh(elements);
        return;
    }

    if (action === "set-founder" || action === "unset-founder") {
        const isFounder = action === "set-founder";
        const res = await apiFetch(
            `/api/v1/users/${encodeURIComponent(username)}/isfounder`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ isFounder }),
            },
        );
        showToast(
            res.ok
                ? i18n.t(
                      isFounder
                          ? "ui.app.users.founder_enabled"
                          : "ui.app.users.founder_disabled",
                  )
                : i18n.t("ui.reuse.save_failed"),
            { variant: res.ok ? "success" : "error" },
        );
        if (!res.ok) return;
        await refreshData();
        composer.refresh(elements);
    }
}

function bindUsersInteractions() {
    root.querySelectorAll(".users-row").forEach((row) => {
        row.addEventListener("click", async (event) => {
            const target = event.target;
            if (target instanceof HTMLElement && target.closest("button"))
                return;
            const username = row.dataset.username;
            if (!username) return;
            const info = await fetchUserInfo(username);
            await openPopup({
                title: username,
                body: `
            <p>${escapeHtml(i18n.t("ui.app.users.member_since"))}: ${escapeHtml(formatMemberSince(info?.createdAt ?? null))}</p>
            <p>${escapeHtml(i18n.t("ui.app.users.last_login"))}: ${escapeHtml(formatLastLogin(info?.lastLogin ?? null))}</p>
            <p>${escapeHtml(i18n.t("ui.app.users.founder"))}: ${info?.isFounder ? "true" : "false"}</p>
          `,
            });
        });
    });

    root.querySelectorAll(".users-toggle-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const username = btn.dataset.username;
            const enabled = btn.dataset.enabled === "true";
            if (!username) return;
            const action = enabled ? "disable" : "enable";
            const res = await apiFetch(
                `/api/v1/users/${encodeURIComponent(username)}/${action}`,
                {
                    method: "POST",
                },
            );
            if (!res.ok) {
                showToast(i18n.t("ui.reuse.save_failed"), {
                    variant: "error",
                });
                return;
            }
            await refreshData();
            composer.refresh(elements);
        });
    });

    root.querySelectorAll(".users-menu-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const username = btn.dataset.username;
            if (!username || !(btn instanceof HTMLButtonElement)) return;
            const user = users.find((entry) => entry.username === username);
            const emails = await fetchUserEmails(username);
            const hasPrimaryVerified = emails.some(
                (e) => e.isPrimary && e.verified,
            );
            const menuItems = [
                {
                    id: user?.isFounder ? "unset-founder" : "set-founder",
                    label: i18n.t(
                        user?.isFounder
                            ? "ui.app.users.unmark_founder"
                            : "ui.app.users.mark_founder",
                    ),
                },
                {
                    id: "password",
                    label: i18n.t("ui.app.users.reset_password"),
                },
                ...(!hasPrimaryVerified
                    ? [
                          {
                              id: "resend",
                              label: i18n.t("ui.app.users.resend_verification"),
                          },
                      ]
                    : []),
                {
                    id: "delete",
                    label: i18n.t("ui.app.users.delete_user"),
                    variant: "danger",
                },
            ];
            const action = await openHamburgerMenu(btn, { items: menuItems });
            if (!action) return;
            await runUserMenuAction(action, username);
        });
    });

    root.querySelectorAll(".users-role-select").forEach((select) => {
        select.addEventListener("change", async () => {
            const username = select.dataset.username;
            const role = select.value;
            if (!username || !role) return;
            const res = await apiFetch(
                `/api/v1/users/${encodeURIComponent(username)}/role`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ role }),
                },
            );
            if (res.ok) {
                showToast(i18n.t("ui.app.users.role_updated"), {
                    variant: "success",
                });
                await refreshData();
                composer.refresh(elements);
            } else {
                const responseBody = await res.json().catch(() => null);
                const responseMessage =
                    responseBody?.error?.message ??
                    i18n.t("ui.reuse.save_failed");
                showToast(responseMessage, {
                    variant: "error",
                });
                await refreshData();
                composer.refresh(elements);
            }
        });
    });

    root.querySelector("#users-invite-btn")?.addEventListener(
        "click",
        async () => {
            await triggerInviteFlow();
        },
    );
}

async function triggerInviteFlow() {
    await reprompt.runWithReprompt(
        async () => {
            const email = await promptInput({
                title: i18n.t("ui.app.users.invite"),
                label: i18n.t("ui.app.users.invite_email"),
                type: "email",
            });
            if (!email) return;
            const response = await apiFetch("/api/v1/registration/tokens", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                showToast(i18n.t("ui.reuse.registration_invite_sent"), {
                    variant: "success",
                });
                return;
            }
            let errorMessage = i18n.t("ui.reuse.registration_invite_failed");
            try {
                const errorBody = await response.json();
                if (errorBody?.error?.code === "email_taken") {
                    errorMessage = i18n.t("ui.app.users.invite_email_taken");
                }
            } catch {
                // fall through to the default invite_failed message in errorMessage
            }
            showToast(errorMessage, { variant: "error" });
        },
        {
            title: i18n.t("ui.app.users.invite"),
            message: i18n.t("ui.reuse.reprompt_message"),
        },
    );
}

export async function mount(rootEl, { signal } = {}) {
    root = rootEl;
    i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.users");

    reprompt = createRepromptGuard({ i18n });
    users = [];
    registrationGatewayActive = false;

    await refreshData();

    composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "users-layout",
        pageContext: {
            title: i18n.t("ui.app.users.page_title"),
            subtitle: i18n.t("ui.app.users.page_subtitle"),
        },
        toolbar: [],
        elements,
        onRender: () => {
            bindUsersInteractions();
        },
    });

    await composer.init();

    const pageAction = new URL(location.href).searchParams.get("action");
    if (pageAction === "invite" && registrationGatewayActive) {
        await triggerInviteFlow();
    }
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
