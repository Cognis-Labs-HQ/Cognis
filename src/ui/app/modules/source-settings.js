import { createFormBuilder } from "../../reuse/form-builder.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";
import {
    loadModuleMarketplaceSettings,
    loadModuleSources,
    removeModuleSource,
    saveModuleMarketplaceSettings,
    saveModuleSource,
} from "./api.js";

let sources = [];
let sourceFormBuilder = null;
let settingsFormBuilder = null;
let sourceFormController = null;
let settingsFormController = null;

async function reloadSources(i18n) {
    try {
        sources = await loadModuleSources();
    } catch (error) {
        console.error("modules_source_list_refresh_failed", {
            component: "ui",
            operation: "reloadSources",
            errorName: error?.name,
        });
        showToast(i18n.t("ui.app.modules.source_refresh_failed"), {
            variant: "warning",
        });
    }
}

function renderSourceManager(i18n) {
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

function renderSourceForm(i18n, source) {
    const configured = source?.credentialConfigured === true;
    const locked = source?.trusted === true;
    const scanPrivateRepos = source?.scanPrivateRepos === true;
    sourceFormBuilder = createFormBuilder(
        { i18n, escapeHtml, renderInfoTooltip },
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
                    infoTooltip: {
                        text: i18n.t("ui.app.modules.scan_private_repos_hint"),
                        ariaLabel: i18n.t("ui.reuse.more_information"),
                    },
                },
                {
                    name: "token",
                    labelKey: "ui.app.modules.pat",
                    type: "password",
                    value: "",
                    placeholder: configured
                        ? i18n.t("ui.app.modules.credential_stored")
                        : "",
                    required: scanPrivateRepos && !configured,
                    secret: true,
                    attributes: { autocomplete: "new-password" },
                    infoTooltip: {
                        text: `${i18n.t("ui.app.modules.pat_permissions_hint")} ${i18n.t("ui.app.modules.credential_shared_hint")}`,
                        ariaLabel: i18n.t("ui.reuse.more_information"),
                    },
                },
                ...(configured
                    ? [
                          {
                              name: "clearCredential",
                              type: "checkbox",
                              slider: true,
                              labelKey: "ui.app.modules.remove_stored_pat",
                              value: "false",
                          },
                      ]
                    : []),
            ],
        },
    );
    return sourceFormBuilder.render();
}

function renderMarketplaceSettingsForm(i18n, settings) {
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

export async function openMarketplaceSettings(
    i18n,
    initialPage = "settings",
    { signal } = {},
) {
    signal?.throwIfAborted();
    sources = await loadModuleSources();
    let settings = await loadModuleMarketplaceSettings();
    let selectedSource = null;
    if (signal?.aborted) return sources;
    await openPopup({
        signal,
        title: i18n.t("ui.reuse.settings"),
        maxWidth: "760px",
        pages: [
            {
                id: "settings",
                title: i18n.t("ui.reuse.settings"),
                body: () =>
                    `${renderMarketplaceSettingsForm(i18n, settings)}<section class="module-settings-sources"><h3>${escapeHtml(i18n.t("ui.app.modules.sources"))}</h3>${renderSourceManager(i18n)}</section>`,
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
                body: () => renderSourceForm(i18n, selectedSource),
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
                const syncRequired = () =>
                    sourceFormController?.setFieldRequired(
                        "token",
                        overlay.querySelector('[name="scanPrivateRepos"]')
                            .checked &&
                            (!selectedSource?.credentialConfigured ||
                                overlay.querySelector(
                                    '[name="clearCredential"]',
                                )?.checked),
                    );
                for (const name of ["scanPrivateRepos", "clearCredential"])
                    overlay
                        .querySelector(`[name="${name}"]`)
                        ?.addEventListener("change", syncRequired);
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
                        signal,
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
                    sources = sources.filter(
                        (source) => source.uuid !== button.dataset.removeSource,
                    );
                    await reloadSources(i18n);
                    api.setPage("settings");
                }),
            );
        },
        onAction: async (action, overlay, api) => {
            if (signal?.aborted) return false;
            if (action === "save-settings") {
                const form = overlay.querySelector(
                    "#module-marketplace-settings-form",
                );
                if (!settingsFormController?.validateAll(true)) return false;
                settings = await saveModuleMarketplaceSettings(
                    Object.fromEntries(new FormData(form)),
                );
                showToast(i18n.t("ui.app.modules.settings_saved"), {
                    variant: "success",
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
            try {
                const saved = await saveModuleSource({
                    uuid,
                    name: sourceValues.name,
                    provider: sourceValues.provider,
                    namespace: sourceValues.namespace,
                    baseUrl: sourceValues.baseUrl,
                    token: values.token || undefined,
                    clearCredential:
                        form.elements.clearCredential?.checked === true,
                    scanPrivateRepos: values.scanPrivateRepos,
                });
                sources = [
                    ...sources.filter((source) => source.uuid !== saved.uuid),
                    saved,
                ];
            } catch (error) {
                if (signal?.aborted) return false;
                console.error("modules_source_save_failed", {
                    component: "ui",
                    operation: "saveSource",
                    code: error?.code,
                    status: error?.status,
                });
                const key =
                    error?.code === "server_secret_encryption_unavailable"
                        ? "credential_storage_unavailable"
                        : error?.code === "module_source_credential_required"
                          ? "credential_empty"
                          : error?.code === "module_source_credential_invalid"
                            ? "credential_invalid"
                            : error?.code ===
                                "module_source_credential_scope_changed"
                              ? "credential_scope_changed"
                              : "source_save_failed";
                showToast(i18n.t(`ui.app.modules.${key}`), {
                    variant: "error",
                });
                return false;
            }
            if (signal?.aborted) return false;
            showToast(i18n.t("ui.app.modules.source_saved"), {
                variant: "success",
            });
            await reloadSources(i18n);
            api.setPage("settings");
            return false;
        },
    });
    return sources;
}
