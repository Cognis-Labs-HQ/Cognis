import { createRepromptGuard } from "/static/reuse/reprompt.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    deleteKeyringValue,
    listKeyringEntries,
    setKeyringValue,
} from "/static/reuse/keyring.js";

export function createSettingsSection({ i18n, root }) {
    const settingsRoot = root ?? document;
    const guard = createRepromptGuard({ i18n });

    function renderEntries() {
        const entries = listKeyringEntries();
        if (!entries.length) {
            return `<p class="profile-empty">${escapeHtml(i18n.t("gateway.auth.keyring.empty"))}</p>`;
        }
        return `<div class="settings-keyring-list">${entries
            .map(
                (
                    entry,
                ) => `<article class="settings-keyring-entry" data-keyring-id="${escapeHtml(entry.id)}">
              <div><strong>${escapeHtml(entry.label)}</strong><small>${escapeHtml(entry.id)}</small></div>
              <code aria-label="${escapeHtml(i18n.t("gateway.auth.keyring.secret_hidden"))}">••••••••</code>
              <button type="button" data-keyring-edit>${escapeHtml(i18n.t("gateway.auth.keyring.edit_title"))}</button>
              <button type="button" class="btn-cancel" data-keyring-delete>${escapeHtml(i18n.t("ui.reuse.remove"))}</button>
            </article>`,
            )
            .join("")}</div>`;
    }

    function rerender() {
        const container = settingsRoot.querySelector(
            "#settings-keyring-entries",
        );
        if (container) container.innerHTML = renderEntries();
        bindActions();
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
            onAction(actionId) {
                if (actionId !== "save") return true;
                return Boolean(
                    labelInput?.value.trim() &&
                    idInput?.value.trim() &&
                    valueInput?.value,
                );
            },
        });
        if (result !== "save") return null;
        return {
            id: String(idInput.value).trim(),
            label: String(labelInput.value).trim(),
            value: String(valueInput.value),
        };
    }

    function bindActions() {
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
        renderContent: () => `<section class="settings-keyring-manager">
          <p>${escapeHtml(i18n.t("gateway.auth.keyring.description"))}</p>
          <button id="settings-keyring-add" type="button" class="btn-confirm">${escapeHtml(i18n.t("gateway.auth.keyring.add"))}</button>
          <div id="settings-keyring-entries">${renderEntries()}</div>
        </section>`,
        async onRender() {
            bindActions();
        },
        isDirty: () => false,
        async save() {},
        commit() {},
        discard() {},
    };
}
