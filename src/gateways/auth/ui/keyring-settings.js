import { createRepromptGuard } from "/static/reuse/reprompt.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    deleteKeyringValue,
    getKeyringRelockMinutes,
    isKeyringUnlocked,
    listKeyringEntries,
    lockKeyring,
    setKeyringRelockMinutes,
    setKeyringValue,
    unlockKeyring,
} from "/static/reuse/keyring.js";

export function createSettingsSection({ i18n, root }) {
    const settingsRoot = root ?? document;
    const guard = createRepromptGuard({ i18n });

    function renderEntries(unlocked = isKeyringUnlocked()) {
        const entries = listKeyringEntries();
        const rows = entries.length
            ? entries
                  .map(
                      (entry) => `<tr data-keyring-id="${escapeHtml(entry.id)}">
              <td><strong>${escapeHtml(entry.label)}</strong></td>
              <td><code>${escapeHtml(entry.id)}</code></td>
              <td>${escapeHtml(entry.source)}</td>
              <td>${escapeHtml(formatDateTime(entry.updatedAt))}</td>
              <td class="settings-keyring-actions">
                <button type="button" data-keyring-edit${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("gateway.auth.keyring.edit_title"))}</button>
                <button type="button" class="btn-cancel" data-keyring-delete${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("ui.reuse.remove"))}</button>
              </td>
            </tr>`,
                  )
                  .join("")
            : `<tr><td colspan="5" class="profile-empty">${escapeHtml(i18n.t("gateway.auth.keyring.empty"))}</td></tr>`;
        return `<div class="settings-table-wrap"><table class="settings-keyring-table">
          <thead><tr>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.label"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.identifier"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.source"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.updated"))}</th>
            <th>${escapeHtml(i18n.t("gateway.auth.keyring.actions"))}</th>
          </tr></thead><tbody>${rows}</tbody>
        </table></div>`;
    }

    function renderManager() {
        const unlocked = isKeyringUnlocked();
        const timeout = getKeyringRelockMinutes();
        return `<div class="settings-keyring-toolbar">
          <button id="settings-keyring-info" type="button" aria-label="${escapeHtml(i18n.t("gateway.auth.keyring.info"))}">${escapeHtml(i18n.t("gateway.auth.keyring.info"))}</button>
          <span class="settings-keyring-status" role="status">${escapeHtml(i18n.t(unlocked ? "gateway.auth.keyring.unlocked" : "gateway.auth.keyring.locked"))}</span>
          <button id="settings-keyring-toggle" type="button" class="${unlocked ? "btn-cancel" : "btn-confirm"}">${escapeHtml(i18n.t(unlocked ? "gateway.auth.keyring.lock" : "gateway.auth.keyring.unlock"))}</button>
          <button id="settings-keyring-add" type="button" class="btn-confirm"${unlocked ? "" : " disabled"}>${escapeHtml(i18n.t("gateway.auth.keyring.add"))}</button>
        </div>
        <label class="settings-keyring-timeout"><span>${escapeHtml(i18n.t("gateway.auth.keyring.relock"))}</span>
          <select id="settings-keyring-relock"${unlocked ? "" : " disabled"}>
            <option value="0"${timeout === 0 ? " selected" : ""}>${escapeHtml(i18n.t("gateway.auth.keyring.logout"))}</option>
            ${[15, 60, 240].map((minutes) => `<option value="${minutes}"${timeout === minutes ? " selected" : ""}>${minutes} ${escapeHtml(i18n.t("gateway.auth.keyring.minutes"))}</option>`).join("")}
          </select>
        </label>
        <div id="settings-keyring-entries">${renderEntries(unlocked)}</div>`;
    }

    function rerender() {
        const container = settingsRoot.querySelector(
            "#settings-keyring-manager",
        );
        if (container) container.innerHTML = renderManager();
        bindActions();
    }

    async function promptToUnlock() {
        let passwordInput = null;
        let errorElement = null;
        const result = await openPopup({
            title: i18n.t("gateway.auth.keyring.unlock_title"),
            body: `<label class="stack"><span>${escapeHtml(i18n.t("gateway.auth.keyring.unlock_message"))}</span><input id="keyring-unlock-password" type="password" autocomplete="current-password" required></label><p id="keyring-unlock-error" class="form-error" hidden>${escapeHtml(i18n.t("gateway.auth.keyring.unlock_failed"))}</p>`,
            actions: [
                {
                    id: "unlock",
                    label: i18n.t("gateway.auth.keyring.unlock"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen(overlay) {
                passwordInput = overlay.querySelector(
                    "#keyring-unlock-password",
                );
                errorElement = overlay.querySelector("#keyring-unlock-error");
                passwordInput?.focus();
            },
            async onAction(actionId) {
                if (actionId !== "unlock") return true;
                if (!passwordInput?.value) return false;
                const unlocked = await unlockKeyring(passwordInput.value);
                if (!unlocked) {
                    if (errorElement) errorElement.hidden = false;
                    passwordInput.select();
                }
                return unlocked;
            },
        });
        return result === "unlock";
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

    function bindActions() {
        settingsRoot.querySelector("#settings-keyring-info")?.addEventListener(
            "click",
            () =>
                openPopup({
                    title: i18n.t("gateway.auth.keyring.info_title"),
                    body: `<p>${escapeHtml(i18n.t("gateway.auth.keyring.description"))}</p>`,
                    actions: [
                        {
                            id: "close",
                            label: i18n.t("ui.reuse.close"),
                            variant: "cancel",
                        },
                    ],
                }),
            { once: true },
        );
        settingsRoot
            .querySelector("#settings-keyring-toggle")
            ?.addEventListener(
                "click",
                async () => {
                    if (isKeyringUnlocked()) lockKeyring();
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
                await guard.runWithReprompt(
                    async () => {
                        const input = await readEntryInput();
                        if (!input) return;
                        await setKeyringValue(input.id, input.value, {
                            label: input.label,
                            source: "user",
                        });
                        rerender();
                        showToast(i18n.t("gateway.auth.keyring.saved"), {
                            variant: "success",
                        });
                    },
                    { alwaysPrompt: true },
                );
            },
            { once: true },
        );
        settingsRoot.querySelectorAll("[data-keyring-id]").forEach((row) => {
            const id = row.getAttribute("data-keyring-id");
            row.querySelector("[data-keyring-edit]")?.addEventListener(
                "click",
                async () => {
                    const entry = listKeyringEntries().find(
                        (candidate) => candidate.id === id,
                    );
                    if (!entry) return;
                    await guard.runWithReprompt(
                        async () => {
                            const input = await readEntryInput(entry);
                            if (!input) return;
                            await setKeyringValue(id, input.value, {
                                label: input.label,
                                source: "user",
                            });
                            rerender();
                            showToast(i18n.t("gateway.auth.keyring.saved"), {
                                variant: "success",
                            });
                        },
                        { alwaysPrompt: true },
                    );
                },
                { once: true },
            );
            row.querySelector("[data-keyring-delete]")?.addEventListener(
                "click",
                async () => {
                    await guard.runWithReprompt(
                        async () => {
                            await deleteKeyringValue(id);
                            rerender();
                            showToast(i18n.t("gateway.auth.keyring.deleted"), {
                                variant: "success",
                            });
                        },
                        { alwaysPrompt: true },
                    );
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
            bindActions();
        },
        isDirty: () => false,
        async save() {},
        commit() {},
        discard() {},
    };
}
