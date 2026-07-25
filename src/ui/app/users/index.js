import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { createRepromptGuard } from "../../reuse/reprompt.js";
import { openHamburgerMenu } from "../../reuse/hamburger-menu.js";
import { formatDate, formatDateTime } from "../../reuse/timestamp.js";
import { isSmtpAdapterActive } from "/static/gateways/notify/smtp-adapter.js";
import {
    ACCESS_ROLES,
    getRoleLabel,
    hasMinAccessRole,
} from "../../reuse/access-role.js";

let root = null;
let i18n = null;
let reprompt = null;
let users = [];
let registrationGatewayActive = false;
let smtpAdapterActive = false;
let composer = null;
let elements = [];
let userQuotas = new Map();

const QUOTA_UNITS = [
    { id: "B", multiplier: 1 },
    { id: "KiB", multiplier: 1024 },
    { id: "MiB", multiplier: 1024 ** 2 },
    { id: "GiB", multiplier: 1024 ** 3 },
    { id: "TiB", multiplier: 1024 ** 4 },
];

function formatMemberSince(iso) {
    return formatDate(iso, i18n.t("ui.app.dashboard.never"));
}

function formatLastLogin(iso) {
    return formatDateTime(iso, i18n.t("ui.app.dashboard.never"));
}

function getCurrentRole() {
    return (localStorage.getItem("cognis_role") ?? "user").trim();
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
        `/api/v1/notify/users/${encodeURIComponent(username)}/emails`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return payload?.data ?? [];
}

async function promptInput({ title, label, type = "text", placeholder = "" }) {
    let inputEl = null;
    const result = await openPopup({
        title,
        body: () => `
      <label class="stack">
        <span>${escapeHtml(label)}</span>
        <input
          id="users-input"
          type="${escapeHtml(type)}"
          ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ""}
        />
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
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        closeProtection: true,
        onOpen: (overlay) => {
            inputEl = overlay.querySelector("#users-input");
        },
    });
    if (result !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim();
}

async function fetchUserQuotas(username) {
    const response = await apiFetch(
        `/api/v1/files/admin/users/${encodeURIComponent(username)}/quotas`,
    );
    if (!response.ok) return { namespaces: [], globalQuota: undefined };
    const payload = await response.json().catch(() => ({ data: {} }));
    return payload?.data ?? { namespaces: [], globalQuota: undefined };
}

function splitQuotaBytes(quotaBytes) {
    const safeBytes =
        Number.isFinite(quotaBytes) && quotaBytes > 0 ? quotaBytes : 0;
    const unit =
        [...QUOTA_UNITS]
            .reverse()
            .find(
                (entry) =>
                    safeBytes >= entry.multiplier &&
                    safeBytes % entry.multiplier === 0,
            ) ?? QUOTA_UNITS[0];
    return {
        value: safeBytes ? safeBytes / unit.multiplier : "",
        unit: unit.id,
    };
}

function quotaUnitOptions(selectedUnit) {
    return QUOTA_UNITS.map(
        (unit) =>
            `<option value="${unit.id}"${unit.id === selectedUnit ? " selected" : ""}>${unit.id}</option>`,
    ).join("");
}

function renderQuotaControl(username, namespaceId, quotaBytes) {
    const quota = splitQuotaBytes(quotaBytes);
    return `
        <div class="users-quota-control">
          <span>${escapeHtml(namespaceId === "global" ? i18n.t("ui.app.users.storage_quota_global") : namespaceId)}</span>
          <input
            class="users-quota-input"
            type="number"
            min="1"
            step="0.01"
            data-username="${escapeHtml(username)}"
            data-namespace-id="${escapeHtml(namespaceId)}"
            value="${escapeHtml(String(quota.value))}"
          />
          <select
            class="users-quota-unit-select theme-select"
            data-username="${escapeHtml(username)}"
            data-namespace-id="${escapeHtml(namespaceId)}"
          >${quotaUnitOptions(quota.unit)}</select>
        </div>`;
}

function renderQuotaCell(user) {
    const quotas = userQuotas.get(user.username);
    if (!quotas) return "";
    return `
      <div class="users-quota-list">
        ${quotas.namespaces
            .map((entry) =>
                renderQuotaControl(
                    user.username,
                    entry.namespaceId,
                    entry.quotaBytes,
                ),
            )
            .join("")}
        ${renderQuotaControl(user.username, "global", quotas.globalQuota)}
      </div>`;
}

function parseQuotaBytes(input, select) {
    const unit = QUOTA_UNITS.find((entry) => entry.id === select.value);
    const value = Number(input.value);
    const quotaBytes = unit ? value * unit.multiplier : NaN;
    return Number.isInteger(quotaBytes) && quotaBytes > 0 ? quotaBytes : null;
}

async function saveStorageQuota(username, namespaceId, quotaBytes) {
    const response = await apiFetch(
        `/api/v1/files/admin/users/${encodeURIComponent(username)}/quotas/${encodeURIComponent(namespaceId)}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ quotaBytes }),
        },
    );
    showToast(
        response.ok
            ? i18n.t("ui.app.users.storage_quotas_saved")
            : i18n.t("ui.reuse.save_failed"),
        { variant: response.ok ? "success" : "error" },
    );
}

async function refreshData() {
    [users, registrationGatewayActive, smtpAdapterActive] = await Promise.all([
        loadUsers(),
        loadRegistrationGatewayState(),
        isSmtpAdapterActive(apiFetch),
    ]);
    const quotaEntries = await Promise.all(
        users.map(async (user) => [
            user.username,
            await fetchUserQuotas(user.username),
        ]),
    );
    userQuotas = new Map(quotaEntries);
    buildElements();
}

function renderUsersTable() {
    const currentUsername = getCurrentUsername();
    const currentUser = users.find((user) => user.username === currentUsername);
    const currentRole = currentUser?.role ?? getCurrentRole();
    const viewerCanManagePrivileged = currentRole === "owner";
    const inviteButtonHtml =
        registrationGatewayActive && smtpAdapterActive
            ? `<div class="controls">
          <button id="users-invite-btn" class="btn-confirm btn-animated" type="button">+ ${escapeHtml(i18n.t("ui.reuse.invite"))}</button>
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
            <th>${escapeHtml(i18n.t("ui.app.users.storage_quotas"))}</th>
            <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
          </tr>
        </thead>
        <tbody>
          ${users
              .map((user) => {
                  const isSelf = user.username === currentUsername;
                  const userRole = user.role ?? "user";
                  const isOwner = userRole === "owner";
                  const protectPrivilegedFromViewer =
                      !viewerCanManagePrivileged &&
                      hasMinAccessRole(userRole, "admin") &&
                      !isSelf;
                  const roleDisabled =
                      isOwner || isSelf || protectPrivilegedFromViewer;
                  const roleOptions = isOwner
                      ? ["owner"]
                      : ACCESS_ROLES.filter((role) => role !== "owner");
                  const roleOptionsHtml = roleOptions
                      .map(
                          (role) =>
                              `<option value="${escapeHtml(role)}"${userRole === role ? " selected" : ""}>${escapeHtml(getRoleLabel(i18n, role))}</option>`,
                      )
                      .join("");
                  const roleCellHtml = `<select class="users-role-select theme-select" data-username="${escapeHtml(user.username)}"${roleDisabled ? " disabled" : ""}>${roleOptionsHtml}</select>`;
                  const lifecycleState = user.lifecycleState ?? "active";
                  const statusLabel =
                      lifecycleState === "archived"
                          ? i18n.t("ui.app.users.archived")
                          : lifecycleState === "deactivated"
                            ? i18n.t("ui.app.users.deactivated")
                            : user.enabled
                              ? i18n.t("ui.app.users.enabled")
                              : i18n.t("ui.app.users.disabled");
                  const deleteUserLabel = i18n.t("ui.app.users.delete_user");
                  const actionsHtml =
                      isOwner || protectPrivilegedFromViewer
                          ? ""
                          : `
                              <button class="users-toggle-btn btn-animated" data-username="${escapeHtml(user.username)}" data-enabled="${user.enabled}" data-lifecycle-state="${escapeHtml(lifecycleState)}"${isSelf ? " disabled" : ""}>${lifecycleState === "archived" || lifecycleState === "deactivated" || !user.enabled ? escapeHtml(i18n.t("ui.reuse.enable")) : escapeHtml(i18n.t("ui.reuse.disable"))}</button>
                              <button class="users-delete-btn btn-animated" data-i18n-aria-label="ui.app.users.delete_user" aria-label="${escapeHtml(deleteUserLabel)}" title="${escapeHtml(deleteUserLabel)}" data-username="${escapeHtml(user.username)}"${isSelf ? " disabled" : ""}>🗑</button>
                              <button class="users-menu-btn btn-animated" data-i18n-aria-label="ui.app.users.action_menu_help" aria-label="${escapeHtml(i18n.t("ui.app.users.action_menu_help"))}" data-username="${escapeHtml(user.username)}"${isSelf ? " disabled" : ""}>☰</button>
                          `;
                  return `
              <tr class="users-row" data-username="${escapeHtml(user.username)}">
                <td>${escapeHtml(user.username)}</td>
                <td>${roleCellHtml}</td>
                <td>${escapeHtml(statusLabel)}</td>
                <td>${renderQuotaCell(user)}</td>
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
        if (!smtpAdapterActive) return;
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
            `/api/v1/notify/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(unverifiedEmail.email)}/resend`,
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

    if (action === "tfa-reset") {
        const resetResponse = await apiFetch(
            `/api/v1/tfa/admin/users/${encodeURIComponent(username)}/reset`,
            { method: "POST" },
        );
        showToast(
            resetResponse.ok
                ? i18n.t("ui.app.users.tfa_reset_done")
                : i18n.t("ui.reuse.save_failed"),
            { variant: resetResponse.ok ? "success" : "error" },
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
                    label: i18n.t("ui.reuse.cancel"),
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
            if (
                target instanceof HTMLElement &&
                target.closest("button,input,select")
            )
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
            const lifecycleState = btn.dataset.lifecycleState ?? "active";
            if (!username) return;
            const isInactiveLifecycle =
                lifecycleState === "archived" ||
                lifecycleState === "deactivated";
            const action = isInactiveLifecycle
                ? "dearchive"
                : enabled
                  ? "disable"
                  : "enable";
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
            const emails = smtpAdapterActive
                ? await fetchUserEmails(username)
                : [];
            const hasUnverifiedEmails = emails.some((e) => !e.verified);
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
                    disabled:
                        Boolean(user?.provider) && user.provider !== "local",
                    title:
                        user?.provider && user.provider !== "local"
                            ? "External users' passwords are managed by their authentication provider."
                            : undefined,
                },
                ...(user?.hasTfaConfigured === true
                    ? [
                          {
                              id: "tfa-reset",
                              label: i18n.t("ui.app.users.reset_tfa"),
                          },
                      ]
                    : []),
                ...(hasUnverifiedEmails
                    ? [
                          {
                              id: "resend",
                              label: i18n.t("ui.app.users.resend_verification"),
                          },
                      ]
                    : []),
            ];
            const action = await openHamburgerMenu(btn, { items: menuItems });
            if (!action) return;
            await runUserMenuAction(action, username);
        });
    });

    root.querySelectorAll(".users-delete-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const username = btn.dataset.username;
            if (!username) return;
            await runUserMenuAction("delete", username);
        });
    });

    root.querySelectorAll(
        ".users-quota-input, .users-quota-unit-select",
    ).forEach((control) => {
        control.addEventListener("change", async () => {
            const username = control.dataset.username;
            const namespaceId = control.dataset.namespaceId;
            if (!username || !namespaceId) return;
            const row = control.closest(".users-quota-control");
            const input = row?.querySelector(".users-quota-input");
            const select = row?.querySelector(".users-quota-unit-select");
            if (
                !(input instanceof HTMLInputElement) ||
                !(select instanceof HTMLSelectElement)
            ) {
                return;
            }
            const quotaBytes = parseQuotaBytes(input, select);
            if (quotaBytes === null) {
                showToast(i18n.t("ui.app.users.storage_quota_invalid"), {
                    variant: "error",
                });
                return;
            }
            await saveStorageQuota(username, namespaceId, quotaBytes);
            await refreshData();
            composer.refresh(elements);
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
                title: i18n.t("ui.reuse.invite"),
                label: i18n.t("ui.reuse.invite_email"),
                type: "email",
                placeholder: i18n.t("ui.reuse.email_placeholder"),
            });
            if (!email) return;
            const response = await apiFetch("/api/v1/registration/tokens", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (response.ok) {
                showToast(i18n.t("ui.reuse.invite_sent"), {
                    variant: "success",
                });
                return;
            }
            let errorMessage = i18n.t("ui.reuse.invite_failed");
            try {
                const errorBody = await response.json();
                if (errorBody?.error?.code === "email_taken") {
                    errorMessage = i18n.t("ui.reuse.invite_email_taken");
                }
            } catch {
                // fall through to the default invite_failed message in errorMessage
            }
            showToast(errorMessage, { variant: "error" });
        },
        {
            title: i18n.t("ui.reuse.invite"),
            message: i18n.t("ui.reuse.sensitive_action_prompt"),
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
    smtpAdapterActive = false;
    userQuotas = new Map();

    await refreshData();

    composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "users-layout",
        pageContext: {
            title: i18n.t("ui.reuse.users"),
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
    if (
        pageAction === "invite" &&
        registrationGatewayActive &&
        smtpAdapterActive
    ) {
        await triggerInviteFlow();
    }
}

await mountWhenDirect(mount);
