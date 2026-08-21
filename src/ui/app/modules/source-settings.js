import { createFormBuilder } from "../../reuse/form-builder.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import {
    loadModuleMarketplaceSettings,
    loadModuleSources,
    removeModuleSource,
    saveModuleMarketplaceSettings,
    saveModuleSource,
    validateModuleSourceCredential,
} from "./api.js";

const STORED_PAT_MASK = "****";
let sources = [];
let sourceFormBuilder = null;
let settingsFormBuilder = null;
let sourceFormController = null;
let settingsFormController = null;

function renderSourceManager() {
    const rows = sources
        .map((source) => {
            const controls = source.trusted
                ? `<span class="module-source-actions"><span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.default_source"))}</span><button class="btn-neutral" type="button" data-edit-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button></span>`
                : `<span class="module-source-actions"><button class="btn-neutral" type="button" data-edit-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button><button class="btn-cancel" type="button" data-remove-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.remove"))}</button></span>`;
            return `<li><span class="module-source-summary"><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.homepage ?? `${source.baseUrl}/${source.namespace}`)}</small></span>${controls}</li>`;
        })
        .join("");
    return `<div class="module-source-manager"><p>${escapeHtml(i18n.t("ui.app.modules.sources_description"))}</p><ul class="module-source-list">${rows}</ul><button type="button" class="btn-confirm module-source-add" data-add-source>${escapeHtml(i18n.t("ui.app.modules.add_source"))}</button></div>`;
}

function renderSourceForm(source) {
    const tokenValue = source?.credentialId ? STORED_PAT_MASK : "";
    const locked = source?.trusted === true;
    const scanPrivateRepos = source?.scanPrivateRepos === true;
    sourceFormBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "module-source-form",
            formClassName: "module-source-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "name",
                    labelKey: "ui.reuse.name",
                    value: source?.name ?? "",
                    required: true,
                    disabled: locked,
                },
                {
                    name: "provider",
                    labelKey: "ui.app.modules.provider",
                    type: "select",
                    value: source?.provider ?? "github",
                    disabled: locked,
                    options: [
                        {
                            value: "github",
                            label: i18n.t("ui.app.modules.github"),
                        },
                        {
                            value: "gitlab",
                            label: i18n.t("ui.app.modules.gitlab"),
                        },
                    ],
                },
                {
                    name: "namespace",
                    labelKey: "ui.app.modules.namespace",
                    value: source?.namespace ?? "",
                    required: true,
                    disabled: locked,
                },
                {
                    name: "baseUrl",
                    labelKey: "ui.app.modules.base_url",
                    type: "url",
                    value: source?.baseUrl ?? "https://api.github.com",
                    required: true,
                    disabled: locked,
                },
                {
                    name: "scanPrivateRepos",
                    labelKey: "ui.app.modules.scan_private_repos",
                    type: "checkbox",
                    value: String(scanPrivateRepos),
                    slider: true,
                },
                {
                    name: "token",
                    labelKey: "ui.app.modules.pat",
                    type: "password",
                    value: tokenValue,
                    required: scanPrivateRepos,
                    secret: true,
                    attributes: { autocomplete: "off" },
                },
            ],
        },
    );
    return sourceFormBuilder.render();
}

function renderMarketplaceSettingsForm(settings) {
    settingsFormBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "module-marketplace-settings-form",
            formClassName: "module-source-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "recommendedModulesUrl",
                    labelKey: "ui.app.modules.recommended_url",
                    type: "url",
                    value: settings.recommendedModulesUrl,
                    required: true,
                },
            ],
        },
    );
    return settingsFormBuilder.render();
}

export async function openMarketplaceSettings(i18n, initialPage = "settings") {
    sources = await loadModuleSources();
    let settings = await loadModuleMarketplaceSettings();
    let selectedSource = null;
    await openPopup({
        title: i18n.t("ui.reuse.settings"),
        maxWidth: "760px",
        pages: [
            {
                id: "settings",
                title: i18n.t("ui.reuse.settings"),
                body: () =>
                    `${renderMarketplaceSettingsForm(settings)}<section class="module-settings-sources"><h3>${escapeHtml(i18n.t("ui.app.modules.sources"))}</h3>${renderSourceManager()}</section>`,
                actions: [
                    {
                        id: "save-settings",
                        label: i18n.t("ui.reuse.save"),
                        variant: "confirm",
                    },
                ],
            },
            {
                id: "editor",
                title: i18n.t("ui.app.modules.source_details"),
                body: () => renderSourceForm(selectedSource),
                actions: [
                    {
                        id: "back",
                        label: i18n.t("ui.reuse.back"),
                        variant: "neutral",
                    },
                    {
                        id: "save",
                        label: i18n.t("ui.reuse.save"),
                        variant: "confirm",
                    },
                ],
            },
        ],
        initialPageId: initialPage,
        onOpen: (overlay, _close, api) => {
            if (api.pageId === "editor") {
                sourceFormController?.detach();
                sourceFormController = sourceFormBuilder?.attach(
                    overlay.querySelector("#module-source-form"),
                );
                overlay
                    .querySelector('[name="scanPrivateRepos"]')
                    ?.addEventListener("change", (event) => {
                        sourceFormController?.setFieldRequired(
                            "token",
                            event.currentTarget.checked,
                        );
                    });
                return;
            }
            settingsFormController?.detach();
            settingsFormController = settingsFormBuilder?.attach(
                overlay.querySelector("#module-marketplace-settings-form"),
            );
            overlay
                .querySelector("[data-add-source]")
                ?.addEventListener("click", () => {
                    selectedSource = null;
                    api.setPage("editor");
                });
            overlay.querySelectorAll("[data-edit-source]").forEach((button) =>
                button.addEventListener("click", () => {
                    selectedSource = sources.find(
                        (source) => source.uuid === button.dataset.editSource,
                    );
                    api.setPage("editor");
                }),
            );
            overlay.querySelectorAll("[data-remove-source]").forEach((button) =>
                button.addEventListener("click", async () => {
                    const result = await openPopup({
                        title: i18n.t("ui.app.modules.remove_source"),
                        body: `<p>${escapeHtml(i18n.t("ui.app.modules.remove_source_confirm"))}</p>`,
                        actions: [
                            {
                                id: "remove",
                                label: i18n.t("ui.reuse.remove"),
                                variant: "cancel",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "neutral",
                            },
                        ],
                    });
                    if (result !== "remove") return;
                    await removeModuleSource(button.dataset.removeSource);
                    sources = await loadModuleSources();
                    api.setPage("settings");
                }),
            );
        },
        onAction: async (action, overlay, api) => {
            if (action === "save-settings") {
                const form = overlay.querySelector(
                    "#module-marketplace-settings-form",
                );
                if (!settingsFormController?.validateAll(true)) return false;
                settings = await saveModuleMarketplaceSettings(
                    Object.fromEntries(new FormData(form)),
                );
                showToast(i18n.t("ui.app.modules.settings_saved"), {
                    type: "success",
                });
                return true;
            }
            if (action === "back") {
                api.setPage("settings");
                return false;
            }
            if (action !== "save") return true;
            const form = overlay.querySelector("#module-source-form");
            if (!sourceFormController?.validateAll(true)) return false;
            const values = Object.fromEntries(new FormData(form));
            values.scanPrivateRepos = form.elements.scanPrivateRepos.checked;
            const sourceValues = selectedSource?.trusted
                ? selectedSource
                : values;
            const uuid = selectedSource?.uuid ?? crypto.randomUUID();
            const tokenChanged =
                values.token && values.token !== STORED_PAT_MASK;
            const credentialId = tokenChanged
                ? (selectedSource?.credentialId ?? `module-source:${uuid}:pat`)
                : selectedSource?.credentialId;
            if (tokenChanged) {
                const validation = await validateModuleSourceCredential(
                    {
                        uuid,
                        name: sourceValues.name,
                        provider: sourceValues.provider,
                        namespace: sourceValues.namespace,
                        baseUrl: sourceValues.baseUrl,
                    },
                    values.token,
                );
                if (!validation.valid) {
                    showToast(
                        i18n.t("ui.app.modules.credential_validation_warning"),
                        { type: "warning" },
                    );
                    return false;
                }
                const scope = uiCtx.capabilities.get("keyring:forComponent")?.(
                    i18n.t("ui.app.modules.keyring_component"),
                );
                await scope?.set(credentialId, values.token, {
                    label: sourceValues.name,
                    source: sourceValues.provider,
                });
            }
            await saveModuleSource({
                uuid,
                name: sourceValues.name,
                provider: sourceValues.provider,
                namespace: sourceValues.namespace,
                baseUrl: sourceValues.baseUrl,
                credentialId,
                scanPrivateRepos: values.scanPrivateRepos,
            });
            sources = await loadModuleSources();
            showToast(i18n.t("ui.app.modules.source_saved"), {
                type: "success",
            });
            api.setPage("settings");
            return false;
        },
    });
    return sources;
}
