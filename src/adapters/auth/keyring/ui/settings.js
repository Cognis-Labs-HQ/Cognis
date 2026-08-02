import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    bindSecretVisibilityToggles,
    renderSecretVisibilityField,
} from "/static/reuse/secret-visibility-toggle.js";
export function createSettingsSection({ i18n, root }) {
    const eventPageSize = 25;
    const settingsRoot = root ?? document;
    const createKeyringScope = uiCtx.capabilities.get("keyring:forComponent");
    const deleteKeyringValue = uiCtx.capabilities.get("keyring:delete");
    const getKeyringRelockMinutes = uiCtx.capabilities.get(
        "keyring:getRelockMinutes",
    );
    const isKeyringUnlocked = uiCtx.capabilities.get("keyring:isUnlocked");
    const listKeyringEntries = uiCtx.capabilities.get("keyring:list");
    const listKeyringEvents = uiCtx.capabilities.get("keyring:listEvents");
    const clearKeyringValues = uiCtx.capabilities.get("keyring:clear");
    const destroyKeyring = uiCtx.capabilities.get("keyring:destroy");
    const changeKeyringPassword = uiCtx.capabilities.get(
        "keyring:changePassword",
    );
    const lockKeyring = uiCtx.capabilities.get("keyring:lock");
    const requestKeyringUnlock = uiCtx.capabilities.get(
        "keyring:requestUnlock",
    );
    const setKeyringRelockMinutes = uiCtx.capabilities.get(
        "keyring:setRelockMinutes",
    );
    const keyring = createKeyringScope("Authentication Gateway");
    let unbindSecretVisibility = null;
    let eventPage = 0;
    let keysExpanded = true;
    let logsExpanded = true;

    function renderEntries(unlocked = isKeyringUnlocked()) {
        if (!unlocked) {
            const obscured = `<span class="settings-keyring-obscured" aria-hidden="true">••••••••</span>`;
            return `<div class="settings-table-wrap settings-keyring-entries"><table class="settings-keyring-table">
              <thead><tr>
                <th>${escapeHtml(i18n.t("gateway.auth.keyring.label"))}</th>
                <th>${escapeHtml(i18n.t("gateway.auth.keyring.identifier"))}</th>
                <th>${escapeHtml(i18n.t("gateway.auth.keyring.source"))}</th>
                <th>${escapeHtml(i18n.t("gateway.auth.keyring.updated"))}</th>
                <th>${escapeHtml(i18n.t("gateway.auth.keyring.actions"))}</th>
              </tr></thead>
              <tbody class="is-locked" aria-label="${escapeHtml(i18n.t("gateway.auth.keyring.locked"))}">
                <tr>${Array.from({ length: 5 }, () => `<td>${obscured}</td>`).join("")}</tr>
              </tbody>
            </table></div>`;
        }
        const entries = listKeyringEntries();
        const rows = entries.length
            ? entries
                  .map(
                      (
                          entry,
                          index,
                      ) => `<tr class="settings-keyring-entry" data-keyring-id="${escapeHtml(entry.id)}" data-keyring-expand tabindex="0" aria-expanded="false">
              <td><strong>${escapeHtml(entry.label)}</strong></td>
              <td><code>${escapeHtml(entry.id)}</code></td>
              <td>${escapeHtml(entry.source)}</td>
              <td>${escapeHtml(formatDateTime(entry.updatedAt))}</td>
              <td class="settings-keyring-actions">
                <button type="button" data-keyring-edit${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("gateway.auth.keyring.edit_title"))}</button>
                <button type="button" class="btn-cancel" data-keyring-delete${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("ui.reuse.remove"))}</button>
              </td>
            </tr>
            <tr class="settings-keyring-detail" data-keyring-detail hidden><td colspan="5">
              ${unlocked ? renderSecretVisibilityField({ id: `keyring-secret-${index}`, value: entry.value, label: i18n.t("gateway.auth.keyring.value"), toggleLabel: i18n.t("gateway.auth.keyring.toggle_visibility"), escapeHtml }) : ""}
            </td></tr>`,
                  )
                  .join("")
            : `<tr><td colspan="5" class="profile-empty">${escapeHtml(i18n.t("gateway.auth.keyring.empty"))}</td></tr>`;
        return `<div class="settings-table-wrap settings-keyring-entries"><table class="settings-keyring-table">
          <thead><tr>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.label"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.identifier"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.source"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.updated"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.actions"))}</th>
          </tr></thead><tbody class="${unlocked ? "" : "is-locked"}">${rows}</tbody>
        </table></div>`;
    }

    function renderManager() {
        const unlocked = isKeyringUnlocked();
        const timeout = getKeyringRelockMinutes();
        return `<div class="settings-keyring-toolbar">
          ${renderInfoTooltip(i18n.t("gateway.auth.keyring.description"), i18n.t("gateway.auth.keyring.info"), "settings-keyring-info")}
          <span class="settings-keyring-status" role="status">${escapeHtml(i18n.t(unlocked ? "gateway.auth.keyring.unlocked" : "gateway.auth.keyring.locked"))}</span>
          <button id="settings-keyring-toggle" type="button" class="${unlocked ? "btn-cancel" : "btn-confirm"}">${escapeHtml(i18n.t(unlocked ? "gateway.auth.keyring.lock" : "gateway.auth.keyring.unlock"))}</button>
          <button id="settings-keyring-add" type="button" class="btn-confirm"${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("gateway.auth.keyring.add"))}</button>
          <button id="settings-keyring-change-password" type="button"${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("gateway.auth.keyring.change_password"))}</button>
          <button id="settings-keyring-clear" type="button" class="btn-cancel">${escapeHtml(i18n.t(unlocked ? "gateway.auth.keyring.clear" : "gateway.auth.keyring.destroy"))}</button>
        </div>
        <label class="settings-keyring-timeout"><span>${escapeHtml(i18n.t("gateway.auth.keyring.relock"))}</span>
          <select id="settings-keyring-relock" class="theme-select">
            <option value="0"${timeout === 0 ? " selected" : ""}>${escapeHtml(i18n.t("gateway.auth.keyring.logout"))}</option>
            ${[
                [5, "5_minutes"],
                [15, "15_minutes"],
                [30, "30_minutes"],
                [60, "1_hour"],
                [360, "6_hours"],
                [720, "12_hours"],
                [1440, "1_day"],
                [10080, "1_week"],
            ]
                .map(
                    ([minutes, label]) =>
                        `<option value="${minutes}"${timeout === minutes ? " selected" : ""}>${escapeHtml(i18n.t(`gateway.auth.keyring.timeout_${label}`))}</option>`,
                )
                .join("")}
          </select>
        </label>
        <details class="settings-keyring-section" data-keyring-section="keys"${keysExpanded ? " open" : ""}>
          <summary>${escapeHtml(i18n.t("gateway.auth.keyring.keys"))}</summary>
          <div id="settings-keyring-entries">${renderEntries(unlocked)}</div>
        </details>
        <details class="settings-keyring-section" data-keyring-section="logs"${logsExpanded ? " open" : ""}>
          <summary>${escapeHtml(i18n.t("gateway.auth.keyring.logs"))}</summary>
          ${renderEventLog(unlocked)}
        </details>`;
    }

    function renderEventLog(unlocked) {
        const events = unlocked ? listKeyringEvents() : [];
        const pageCount = Math.max(1, Math.ceil(events.length / eventPageSize));
        eventPage = Math.min(eventPage, pageCount - 1);
        const pageEvents = events.slice(
            eventPage * eventPageSize,
            (eventPage + 1) * eventPageSize,
        );
        const rows = pageEvents.length
            ? pageEvents
                  .map(
                      (event) => `<tr>
                <td>${escapeHtml(i18n.t(`gateway.auth.keyring.event_${event.type}`))}</td>
                <td><code>${escapeHtml(event.identifier || i18n.t("gateway.auth.keyring.event_keyring"))}</code></td>
                <td>${escapeHtml(formatDateTime(event.timestamp))}</td>
              </tr>`,
                  )
                  .join("")
            : `<tr><td colspan="3" class="profile-empty">${escapeHtml(i18n.t(unlocked ? "gateway.auth.keyring.event_empty" : "gateway.auth.keyring.event_locked"))}</td></tr>`;
        return `<section class="settings-keyring-log" aria-labelledby="settings-keyring-log-title">
          <h3 id="settings-keyring-log-title">${escapeHtml(i18n.t("gateway.auth.keyring.event_log"))}</h3>
          <div class="settings-table-wrap"><table class="settings-keyring-table">
            <thead><tr><th>${escapeHtml(i18n.t("gateway.auth.keyring.event"))}</th><th>${escapeHtml(i18n.t("gateway.auth.keyring.identifier"))}</th><th>${escapeHtml(i18n.t("gateway.auth.keyring.updated"))}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          ${
              unlocked && events.length
                  ? `<nav class="settings-keyring-pagination" aria-label="${escapeHtml(i18n.t("gateway.auth.keyring.log_pages"))}">
            <button type="button" data-keyring-log-previous${eventPage === 0 ? " disabled" : ""}>${escapeHtml(i18n.t("gateway.auth.keyring.previous"))}</button>
            <span>${escapeHtml(
                i18n
                    .t("gateway.auth.keyring.page")
                    .replace("{{current}}", String(eventPage + 1))
                    .replace("{{total}}", String(pageCount)),
            )}</span>
            <button type="button" data-keyring-log-next${eventPage + 1 >= pageCount ? " disabled" : ""}>${escapeHtml(i18n.t("gateway.auth.keyring.next"))}</button>
          </nav>`
                  : ""
          }
        </section>`;
    }

    function rerender() {
        const container = settingsRoot.querySelector(
            "#settings-keyring-manager",
        );
        if (container) container.innerHTML = renderManager();
        bindActions();
    }

    async function promptToUnlock() {
        return requestKeyringUnlock({
            request: {
                component: i18n.t("gateway.auth.keyring.section_title"),
                action: i18n.t("gateway.auth.keyring.request_action_manage"),
                process: i18n.t(
                    "gateway.auth.keyring.request_process_stored_secrets",
                ),
            },
        });
    }

    async function readEntryInput(entry = null) {
        let labelInput = null;
        let idInput = null;
        let valueInput = null;
        const result = await openPopup({
            title: i18n.t(
                entry
                    ? "gateway.auth.keyring.edit_title"
                    : "gateway.auth.keyring.add_title",
            ),
            body: `<div class="stack">
              <label><span>${escapeHtml(i18n.t("gateway.auth.keyring.label"))}</span><input id="keyring-entry-label" maxlength="80" value="${escapeHtml(entry?.label ?? "")}" required></label>
              <label><span>${escapeHtml(i18n.t("gateway.auth.keyring.identifier"))}</span><input id="keyring-entry-id" maxlength="160" value="${escapeHtml(entry?.id ?? "")}" ${entry ? "disabled" : ""} required></label>
              <label><span>${escapeHtml(i18n.t("gateway.auth.keyring.value"))}</span><input id="keyring-entry-value" type="password" autocomplete="off" required></label>
            </div>`,
            actions: [
                {
                    id: "save",
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen(overlay) {
                labelInput = overlay.querySelector("#keyring-entry-label");
                idInput = overlay.querySelector("#keyring-entry-id");
                valueInput = overlay.querySelector("#keyring-entry-value");
            },
            onAction: (actionId) =>
                actionId !== "save" ||
                Boolean(
                    labelInput?.value.trim() &&
                    idInput?.value.trim() &&
                    valueInput?.value,
                ),
        });
        if (result !== "save") return null;
        return {
            id: idInput.value.trim(),
            label: labelInput.value.trim(),
            value: valueInput.value,
        };
    }

    async function confirmClearKeyring(destroy = false) {
        const actionKey = destroy
            ? "gateway.auth.keyring.destroy"
            : "gateway.auth.keyring.clear";
        return (
            (await openPopup({
                title: i18n.t(
                    destroy
                        ? "gateway.auth.keyring.destroy_title"
                        : "gateway.auth.keyring.clear_title",
                ),
                body: `<p>${escapeHtml(i18n.t(destroy ? "gateway.auth.keyring.destroy_message" : "gateway.auth.keyring.clear_message"))}</p>`,
                actions: [
                    {
                        id: "clear",
                        label: i18n.t(actionKey),
                        variant: destroy ? "cancel" : "neutral",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: destroy ? "confirm" : "danger",
                    },
                ],
            })) === "clear"
        );
    }

    async function readNewKeyringPassword() {
        let passwordInput = null;
        let confirmationInput = null;
        const result = await openPopup({
            title: i18n.t("gateway.auth.keyring.change_password_title"),
            body: `<div class="stack"><label><span>${escapeHtml(i18n.t("gateway.auth.keyring.new_password"))}</span><input id="keyring-new-password" type="password" autocomplete="new-password" required /></label><label><span>${escapeHtml(i18n.t("gateway.auth.keyring.confirm_password"))}</span><input id="keyring-confirm-password" type="password" autocomplete="new-password" required /></label></div>`,
            actions: [
                {
                    id: "change",
                    label: i18n.t("gateway.auth.keyring.change_password"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen(overlay) {
                passwordInput = overlay.querySelector("#keyring-new-password");
                confirmationInput = overlay.querySelector(
                    "#keyring-confirm-password",
                );
                passwordInput?.focus();
            },
            onAction: (actionId) =>
                actionId !== "change" ||
                Boolean(
                    passwordInput?.value &&
                    passwordInput.value === confirmationInput?.value,
                ),
        });
        return result === "change" ? (passwordInput?.value ?? "") : "";
    }

    function bindActions() {
        unbindSecretVisibility?.();
        unbindSecretVisibility = bindSecretVisibilityToggles({
            root: settingsRoot.querySelector("#settings-keyring-manager"),
        });
        settingsRoot
            .querySelector('[data-keyring-section="keys"]')
            ?.addEventListener("toggle", (event) => {
                keysExpanded = event.currentTarget.open;
            });
        settingsRoot
            .querySelector('[data-keyring-section="logs"]')
            ?.addEventListener("toggle", (event) => {
                logsExpanded = event.currentTarget.open;
            });
        settingsRoot
            .querySelector("[data-keyring-log-previous]")
            ?.addEventListener("click", () => {
                eventPage = Math.max(0, eventPage - 1);
                rerender();
            });
        settingsRoot
            .querySelector("[data-keyring-log-next]")
            ?.addEventListener("click", () => {
                eventPage += 1;
                rerender();
            });
        settingsRoot
            .querySelector("#settings-keyring-toggle")
            ?.addEventListener(
                "click",
                async () => {
                    if (isKeyringUnlocked()) await lockKeyring();
                    else if (!(await promptToUnlock())) return;
                    rerender();
                },
                { once: true },
            );
        settingsRoot
            .querySelector("#settings-keyring-relock")
            ?.addEventListener(
                "change",
                async (event) => {
                    await setKeyringRelockMinutes(Number(event.target.value));
                    showToast(i18n.t("gateway.auth.keyring.timeout_saved"), {
                        variant: "success",
                    });
                    rerender();
                },
                { once: true },
            );
        settingsRoot.querySelector("#settings-keyring-add")?.addEventListener(
            "click",
            async () => {
                if (!isKeyringUnlocked()) return;
                const input = await readEntryInput();
                if (!input) return;
                await keyring.set(input.id, input.value, {
                    label: input.label,
                });
                rerender();
                showToast(i18n.t("gateway.auth.keyring.saved"), {
                    variant: "success",
                });
            },
            { once: true },
        );
        settingsRoot.querySelector("#settings-keyring-clear")?.addEventListener(
            "click",
            async () => {
                const destroy = !isKeyringUnlocked();
                if (!(await confirmClearKeyring(destroy))) return;
                const completed = destroy
                    ? await destroyKeyring()
                    : await clearKeyringValues();
                if (!completed) return;
                rerender();
                showToast(
                    i18n.t(
                        destroy
                            ? "gateway.auth.keyring.recreated"
                            : "gateway.auth.keyring.cleared",
                    ),
                    {
                        variant: "success",
                    },
                );
            },
            { once: true },
        );
        settingsRoot
            .querySelector("#settings-keyring-change-password")
            ?.addEventListener(
                "click",
                async () => {
                    const password = await readNewKeyringPassword();
                    if (!password) return;
                    await changeKeyringPassword(password);
                    rerender();
                    showToast(i18n.t("gateway.auth.keyring.password_changed"), {
                        variant: "success",
                    });
                },
                { once: true },
            );
        settingsRoot.querySelectorAll("[data-keyring-id]").forEach((row) => {
            const id = row.getAttribute("data-keyring-id");
            const toggleDetail = (event) => {
                if (event?.target?.closest?.("button")) return;
                if (
                    event?.type === "keydown" &&
                    !["Enter", " "].includes(event.key)
                )
                    return;
                event?.preventDefault?.();
                const detail = row.nextElementSibling;
                if (!detail?.matches?.("[data-keyring-detail]")) return;
                const expanded = detail.hidden;
                detail.hidden = !expanded;
                row.setAttribute("aria-expanded", String(expanded));
            };
            row.addEventListener("click", toggleDetail, { once: false });
            row.addEventListener("keydown", toggleDetail, { once: false });
            row.querySelector("[data-keyring-edit]")?.addEventListener(
                "click",
                async () => {
                    const entry = listKeyringEntries().find(
                        (candidate) => candidate.id === id,
                    );
                    if (!entry) return;
                    if (!isKeyringUnlocked()) return;
                    const input = await readEntryInput(entry);
                    if (!input) return;
                    await keyring.set(id, input.value, {
                        label: input.label,
                    });
                    rerender();
                    showToast(i18n.t("gateway.auth.keyring.saved"), {
                        variant: "success",
                    });
                },
                { once: true },
            );
            row.querySelector("[data-keyring-delete]")?.addEventListener(
                "click",
                async () => {
                    if (!isKeyringUnlocked()) return;
                    await deleteKeyringValue(id);
                    rerender();
                    showToast(i18n.t("gateway.auth.keyring.deleted"), {
                        variant: "success",
                    });
                },
                { once: true },
            );
        });
    }

    return {
        id: "keyring",
        label: i18n.t("gateway.auth.keyring.section_title"),
        heading: i18n.t("gateway.auth.keyring.section_title"),
        preferenceKey: "settings-keyring-layout",
        renderContent: () =>
            `<section class="settings-keyring-manager" id="settings-keyring-manager">${renderManager()}</section>`,
        async onRender() {
            await ensurePageStylesheet(
                "/static/adapters/auth/keyring/settings.css",
            );
            bindActions();
            if (!isKeyringUnlocked()) {
                void uiCtx.runFlow("defer-page-action", {
                    action: async () => {
                        if (!isKeyringUnlocked() && (await promptToUnlock())) {
                            rerender();
                        }
                    },
                });
            }
        },
        isDirty: () => false,
        async save() {},
        commit() {},
        discard() {},
    };
}
