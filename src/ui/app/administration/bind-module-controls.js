function refreshAdministrationComposer(getComposer, getElements) {
    getComposer()?.refresh(getElements());
}

export function bindModuleToggles(
    root,
    {
        getState,
        openPopup,
        escapeHtml,
        toggleModule,
        toggleGateway,
        reloadModules,
        reloadGateways,
        getComposer,
        getElements,
    },
) {
    root.querySelectorAll('input[type="checkbox"][data-module]').forEach(
        (toggle) => {
            if (!(toggle instanceof HTMLInputElement)) return;
            toggle.addEventListener("change", async () => {
                const moduleId = toggle.dataset.module;
                if (!moduleId) return;

                const { i18n, moduleById, gatewayById } = getState();
                const previousState = !toggle.checked;
                const action = toggle.checked ? "enable" : "disable";

                if (action === "enable") {
                    const moduleRecord = moduleById.get(moduleId);
                    const disabledDependencies = (
                        moduleRecord?.requires ?? []
                    ).filter((dependencyId) => {
                        const dependencyGateway = gatewayById.get(dependencyId);
                        return (
                            dependencyGateway &&
                            dependencyGateway.status === "disabled"
                        );
                    });
                    if (disabledDependencies.length > 0) {
                        const dependencyNames = disabledDependencies.map(
                            (dependencyId) => {
                                const dependencyGateway =
                                    gatewayById.get(dependencyId);
                                return dependencyGateway
                                    ? dependencyGateway.name
                                    : dependencyId;
                            },
                        );
                        const result = await openPopup({
                            title: i18n.t("ui.app.admin.enable_confirm_module"),
                            body: `<p>${i18n.t("ui.app.admin.enable_deps_will_enable")}</p><ul>${dependencyNames.map((dependencyName) => `<li><strong>${escapeHtml(dependencyName)}</strong></li>`).join("")}</ul>`,
                            actions: [
                                {
                                    id: "confirm",
                                    label: i18n.t("ui.reuse.enable"),
                                    variant: "confirm",
                                },
                                {
                                    id: "cancel",
                                    label: i18n.t("ui.reuse.cancel"),
                                    variant: "cancel",
                                },
                            ],
                        });
                        if (result !== "confirm") {
                            toggle.checked = previousState;
                            return;
                        }
                        for (const dependencyId of disabledDependencies) {
                            await toggleGateway(dependencyId, "enable");
                        }
                        await reloadGateways();
                    }
                }

                if (action === "disable") {
                    const result = await openPopup({
                        title: i18n.t("ui.app.admin.disable_confirm"),
                        body: `<strong>${moduleId}</strong>`,
                        variant: "danger",
                        actions: [
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.disable"),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                        ],
                    });
                    if (result !== "confirm") {
                        toggle.checked = previousState;
                        return;
                    }
                }

                await toggleModule(moduleId, action);
                await reloadModules();
                refreshAdministrationComposer(getComposer, getElements);
            });
        },
    );
}

export function bindModuleConfigureButtons(
    root,
    {
        getState,
        apiFetch,
        openPopup,
        showToast,
        escapeHtml,
        reloadModules,
        getComposer,
        getElements,
    },
) {
    root.querySelectorAll("[data-module-config-script-url]").forEach(
        (button) => {
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const moduleId = button.getAttribute("data-module-id");
                const scriptUrl = button.getAttribute(
                    "data-module-config-script-url",
                );
                if (!moduleId || !scriptUrl) return;

                const { i18n } = getState();
                try {
                    const moduleUi = await import(scriptUrl);
                    if (typeof moduleUi.openModuleConfigPopup !== "function") {
                        return;
                    }
                    const didSave = await moduleUi.openModuleConfigPopup({
                        i18n,
                        apiFetch,
                        openPopup,
                        showToast,
                        escapeHtml,
                        moduleId,
                    });
                    if (didSave) {
                        await reloadModules();
                        refreshAdministrationComposer(getComposer, getElements);
                    }
                } catch (error) {
                    showToast(i18n.t("ui.reuse.save_failed"), {
                        variant: "error",
                    });
                    console.error(error);
                }
            });
        },
    );
}

export function bindGithubModuleImportButton(
    root,
    {
        getState,
        openPopup,
        escapeHtml,
        showToast,
        importGithubModule,
        reloadModules,
        getComposer,
        getElements,
    },
) {
    const button = root.querySelector("#import-module-github");
    if (!button) return;
    button.addEventListener("click", async () => {
        const { i18n } = getState();
        const result = await openPopup({
            title: i18n.t("ui.app.admin.import_module_from_github"),
            body: `
              <div class="stack">
                <label>
                  <span>${escapeHtml(i18n.t("ui.app.admin.github_repository_url"))}</span>
                  <input id="import-module-github-url" type="url" placeholder="https://github.com/owner/repo" />
                </label>
                <label>
                  <span>${escapeHtml(i18n.t("ui.app.admin.github_version_tag"))}</span>
                  <input id="import-module-github-tag" type="text" placeholder="v1.0.0" />
                </label>
              </div>
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
        });
        if (result !== "confirm") return;

        const urlInput = document.querySelector("#import-module-github-url");
        const tagInput = document.querySelector("#import-module-github-tag");
        const repositoryUrl = String(urlInput?.value ?? "").trim();
        const versionTag = String(tagInput?.value ?? "").trim();
        if (!repositoryUrl || !versionTag) {
            showToast(i18n.t("ui.app.admin.github_import_missing_fields"), {
                variant: "warning",
            });
            return;
        }

        try {
            await importGithubModule(repositoryUrl, versionTag);
            await reloadModules();
            refreshAdministrationComposer(getComposer, getElements);
            showToast(i18n.t("ui.app.admin.github_import_success"), {
                variant: "success",
            });
        } catch (error) {
            console.error(error);
            showToast(i18n.t("ui.reuse.save_failed"), {
                variant: "error",
            });
        }
    });
}
