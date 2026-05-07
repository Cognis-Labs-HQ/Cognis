import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { createRepromptGuard } from "../../reuse/reprompt.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.users");
const reprompt = createRepromptGuard({ i18n });

async function loadUsers() {
    const response = await apiFetch("/api/v1/users");
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

async function fetchUserInfo(username) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(username)}/info`,
    );
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.data ?? null;
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
            inputEl = overlay.querySelector("#users-input");
        },
    });
    if (result !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim();
}

let users = await loadUsers();

const composer = createPageComposer(root, {
    allowCustomization: false,
    i18n,
    preferenceKey: "users-layout",
    pageContext: {
        title: i18n.t("ui.app.users.page_title"),
        subtitle: i18n.t("ui.app.users.page_subtitle"),
    },
    toolbar: [],
    elements: [
        {
            id: "users-table",
            label: i18n.t("ui.reuse.menu.users"),
            pinned: true,
            render: () => `
        <div class="controls">
          <button id="users-invite-btn" class="btn-confirm btn-animated" type="button">+ ${escapeHtml(i18n.t("ui.app.users.invite"))}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t("ui.app.users.username"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.users.role"))}</th>
              <th>${escapeHtml(i18n.t("ui.app.users.status"))}</th>
              <th>${escapeHtml(i18n.t("ui.reuse.generic.actions"))}</th>
            </tr>
          </thead>
          <tbody>
            ${users
                .map(
                    (user) => `
                <tr class="users-row" data-username="${escapeHtml(user.username)}">
                  <td>${escapeHtml(user.username)}</td>
                  <td>${user.isAdmin ? "admin" : "user"}</td>
                  <td>${user.enabled ? escapeHtml(i18n.t("ui.app.users.enabled")) : escapeHtml(i18n.t("ui.app.users.disabled"))}</td>
                  <td>
                    <button class="users-toggle-btn btn-animated" data-username="${escapeHtml(user.username)}" data-enabled="${user.enabled}">${user.enabled ? escapeHtml(i18n.t("ui.reuse.generic.disable")) : escapeHtml(i18n.t("ui.reuse.generic.enable"))}</button>
                    <button class="users-menu-btn btn-animated" data-username="${escapeHtml(user.username)}">☰</button>
                  </td>
                </tr>
              `,
                )
                .join("")}
          </tbody>
        </table>
      `,
            onRender: () => {
                root.querySelectorAll(".users-row").forEach((row) => {
                    row.addEventListener("click", async (event) => {
                        const target = event.target;
                        if (
                            target instanceof HTMLElement &&
                            target.closest("button")
                        ) {
                            return;
                        }
                        const username = row.dataset.username;
                        if (!username) return;
                        const info = await fetchUserInfo(username);
                        await openPopup({
                            title: username,
                            body: `
                  <p>${escapeHtml(i18n.t("ui.app.users.member_since"))}: ${escapeHtml(info?.createdAt ?? i18n.t("ui.app.dashboard.never"))}</p>
                  <p>${escapeHtml(i18n.t("ui.app.users.last_login"))}: ${escapeHtml(info?.lastLogin ?? i18n.t("ui.app.dashboard.never"))}</p>
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
                        await apiFetch(
                            `/api/v1/users/${encodeURIComponent(username)}/${action}`,
                            { method: "POST" },
                        );
                        users = await loadUsers();
                        composer.refresh();
                    });
                });

                root.querySelectorAll(".users-menu-btn").forEach((btn) => {
                    btn.addEventListener("click", async () => {
                        const username = btn.dataset.username;
                        if (!username) return;
                        const action = await openPopup({
                            title: username,
                            body: `
                  <p>${escapeHtml(i18n.t("ui.app.users.action_menu_help"))}</p>
                `,
                            actions: [
                                {
                                    id: "password",
                                    label: i18n.t(
                                        "ui.app.users.reset_password",
                                    ),
                                    variant: "neutral",
                                },
                                {
                                    id: "resend",
                                    label: i18n.t(
                                        "ui.app.users.resend_verification",
                                    ),
                                    variant: "neutral",
                                },
                                {
                                    id: "delete",
                                    label: i18n.t("ui.app.users.delete_user"),
                                    variant: "cancel",
                                },
                                {
                                    id: "cancel",
                                    label: i18n.t("ui.reuse.popup.cancel"),
                                    variant: "confirm",
                                },
                            ],
                        });

                        if (action === "password") {
                            const password = await promptInput({
                                title: i18n.t("ui.app.users.reset_password"),
                                label: i18n.t("ui.app.users.new_password"),
                                type: "password",
                            });
                            if (!password) return;
                            await apiFetch(
                                `/api/v1/users/${encodeURIComponent(username)}/password`,
                                {
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({ password }),
                                },
                            );
                            showToast(
                                i18n.t("ui.app.users.password_reset_done"),
                                {
                                    variant: "success",
                                },
                            );
                        } else if (action === "resend") {
                            const email = await promptInput({
                                title: i18n.t(
                                    "ui.app.users.resend_verification",
                                ),
                                label: i18n.t("ui.app.users.invite_email"),
                                type: "email",
                            });
                            if (!email) return;
                            await apiFetch(
                                `/api/v1/users/${encodeURIComponent(username)}/emails/${encodeURIComponent(email)}/resend`,
                                { method: "POST" },
                            );
                            showToast(
                                i18n.t("ui.app.users.verification_resent"),
                                {
                                    variant: "success",
                                },
                            );
                        } else if (action === "delete") {
                            await apiFetch(
                                `/api/v1/users/${encodeURIComponent(username)}`,
                                { method: "DELETE" },
                            );
                            users = await loadUsers();
                            composer.refresh();
                        }
                    });
                });

                root.querySelector("#users-invite-btn")?.addEventListener(
                    "click",
                    async () => {
                        await reprompt.runWithReprompt(async () => {
                            const email = await promptInput({
                                title: i18n.t("ui.app.users.invite"),
                                label: i18n.t("ui.app.users.invite_email"),
                                type: "email",
                            });
                            if (!email) return;
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
                                showToast(
                                    i18n.t("ui.app.users.invite_failed"),
                                    {
                                        variant: "error",
                                    },
                                );
                                return;
                            }
                            showToast(i18n.t("ui.app.users.invite_sent"), {
                                variant: "success",
                            });
                        });
                    },
                );
            },
        },
    ],
});

await composer.init();
