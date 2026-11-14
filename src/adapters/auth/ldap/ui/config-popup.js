/** Adapter-owned LDAP configuration popup extension. */
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { markPopupFieldInvalid } from "/static/reuse/popup.js";

export async function openAdapterConfig({
    configUrl,
    configPayload,
    enableUrl,
    disableUrl,
    adapterEnabled,
    onSaved,
    i18n,
    escapeHtml,
    apiFetch,
    openPopup,
    showToast,
    buildConfigPayload,
}) {
    if (
        !document.querySelector(
            'link[href="/static/adapters/auth/ldap/config-popup.css"]',
        )
    ) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = "/static/adapters/auth/ldap/config-popup.css";
        document.head.appendChild(stylesheet);
    }
    let connectionFormController = null;
    let credentialFormController = null;
    let pendingConnectionFieldErrors = {};

    function connectionFields(values = {}) {
        const bindPasswordConfigured =
            configuredSecretFields.includes("bindPassword") ||
            configuredBindPasswordIdentifiers.has(String(values.identifier));
        return [
            {
                name: "identifier",
                labelKey: "adapter.auth.ldap.server_identifier",
                required: true,
                attributes: {
                    placeholder: i18n.t(
                        "adapter.auth.ldap.identifier_placeholder",
                    ),
                },
            },
            {
                name: "serverUrl",
                labelKey: "adapter.auth.ldap.server_url",
                required: true,
            },
            {
                name: "baseDn",
                labelKey: "adapter.auth.ldap.base_dn",
                required: true,
            },
            {
                name: "userDn",
                labelKey: "adapter.auth.ldap.user_dn",
                attributes: {
                    placeholder: i18n.t("adapter.auth.ldap.optional_base_dn"),
                },
            },
            {
                name: "groupDn",
                labelKey: "adapter.auth.ldap.group_dn",
                attributes: {
                    placeholder: i18n.t("adapter.auth.ldap.optional_base_dn"),
                },
            },
            {
                name: "bindDn",
                labelKey: "adapter.auth.ldap.bind_dn",
                required: true,
            },
            {
                name: "bindPassword",
                labelKey: "adapter.auth.ldap.bind_password",
                type: "password",
                required: !bindPasswordConfigured,
                attributes: bindPasswordConfigured
                    ? {
                          placeholder: i18n.t(
                              "adapter.auth.ldap.keep_password",
                          ),
                      }
                    : {},
            },
            {
                name: "userAttribute",
                labelKey: "adapter.auth.ldap.username_attribute",
                required: true,
                attributes: { placeholder: "uid (OpenLDAP or FreeIPA)" },
            },
        ].map((field) => ({
            ...field,
            value:
                values[field.name] ??
                (field.name === "userAttribute" ? "uid" : ""),
        }));
    }

    function credentialFields() {
        return [
            {
                name: "testUsername",
                labelKey: "adapter.auth.ldap.test_username",
                required: true,
            },
            {
                name: "testPassword",
                labelKey: "adapter.auth.ldap.test_password",
                type: "password",
                required: true,
            },
        ];
    }

    function renderLdapConnectionForm(values = {}) {
        const formBuilder = createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "ldap-connection-form",
                formClassName: "provider-popup-form ldap-setup-popup",
                includeSubmitButton: false,
                fields: connectionFields(values),
            },
        );
        connectionFormController = null;
        return `<div class="ldap-connection-step">
          <p class="module-settings-popup-note">${escapeHtml(i18n.t("adapter.auth.ldap.connection_note"))}</p>
          ${formBuilder.render()}
        </div>`;
    }

    let enabled = adapterEnabled === true;

    function renderServerList(servers, unify) {
        const rows = servers
            .map(
                (
                    server,
                    index,
                ) => `<li class="ldap-server-row" draggable="true" data-server-index="${index}">
                  <span class="ldap-server-drag" aria-hidden="true">&#x2630;</span>
                  <span><strong>${escapeHtml(server.identifier)}</strong><small>${escapeHtml(server.serverUrl)}</small></span>
                  <button type="button" data-edit-server="${index}" class="btn-animated">${escapeHtml(i18n.t("ui.reuse.edit"))}</button>
                  <button type="button" data-delete-server="${index}" class="btn-cancel btn-animated">${escapeHtml(i18n.t("adapter.auth.ldap.delete"))}</button>
                </li>`,
            )
            .join("");
        return `<div class="ldap-setup-popup ldap-server-home">
          <div class="provider-option-row">
            <span class="provider-option-label" data-adapter-state>${i18n.t(enabled ? "ui.app.admin.state.active" : "ui.app.admin.state.disabled")}</span>
            <label class="switch" title="${escapeHtml(i18n.t("ui.app.admin.toggle_adapter"))}">
              <input name="adapterEnabled" type="checkbox"${enabled ? " checked" : ""}${!enabled && servers.length === 0 ? " disabled" : ""} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="provider-option-row"><span class="provider-option-label">${escapeHtml(i18n.t("adapter.auth.ldap.unify"))}</span><label class="switch"><input name="unify" type="checkbox"${unify ? " checked" : ""} /><span class="slider"></span></label></div>
          <p class="module-settings-popup-note">${escapeHtml(i18n.t("adapter.auth.ldap.unify_note"))}</p>
          <ol class="ldap-server-list">${rows || `<li class="module-settings-popup-note">${escapeHtml(i18n.t("adapter.auth.ldap.no_servers"))}</li>`}</ol>
          <button type="button" class="btn-confirm btn-animated ldap-add-server" aria-label="${escapeHtml(i18n.t("adapter.auth.ldap.add_server"))}">+</button>
        </div>`;
    }

    function ldapRoleMappings(value) {
        if (value && typeof value === "object")
            return Object.fromEntries(
                Object.entries(value).map(([group, role]) => [role, group]),
            );
        return Object.fromEntries(
            String(value ?? "")
                .split(",")
                .map((item) => item.split(/[:=]/).map((part) => part.trim()))
                .filter(([group, role]) => group && role)
                .map(([group, role]) => [role, group]),
        );
    }

    function renderLdapFilterForm(config, sample) {
        const users = Array.isArray(sample?.users) ? sample.users : [];
        const groups = Array.isArray(sample?.groups)
            ? [...sample.groups].sort((left, right) =>
                  String(left.name).localeCompare(
                      String(right.name),
                      undefined,
                      { sensitivity: "base" },
                  ),
              )
            : [];
        const optionForGroups = (selected) =>
            `<option value="">${escapeHtml(i18n.t("adapter.auth.ldap.no_group"))}</option>${groups
                .map(
                    (group) =>
                        `<option value="${escapeHtml(group.name)}"${group.name === selected ? " selected" : ""}>${escapeHtml(group.name)}</option>`,
                )
                .join("")}`;
        const mappings = ldapRoleMappings(config.roleMappings);
        const roleRows = ["user", "teacher", "moderator", "admin"]
            .map(
                (role) =>
                    `<tr><th scope="row">${role}</th><td><select name="roleMapping.${role}" class="theme-select">${optionForGroups(mappings[role] ?? "")}</select></td></tr>`,
            )
            .join("");
        const discoveryNote = i18n
            .t("adapter.auth.ldap.discovery_note")
            .replace("{flavor}", sample?.directoryFlavor ?? "LDAP")
            .replace("{users}", String(users.length))
            .replace("{groups}", String(groups.length));
        return `<div class="provider-popup-form ldap-setup-popup">
          <p class="module-settings-popup-note">${escapeHtml(discoveryNote)}</p>
          <fieldset><legend>${escapeHtml(i18n.t("adapter.auth.ldap.directory_queries"))}</legend>
            <label class="provider-popup-field">${escapeHtml(i18n.t("adapter.auth.ldap.user_filter"))}<input name="userFilter" value="${escapeHtml(config.userFilter ?? "(&(objectClass=inetOrgPerson)(uid={username}))")}" /></label>
            <label class="provider-popup-field">${escapeHtml(i18n.t("adapter.auth.ldap.group_filter"))}<input name="groupFilter" value="${escapeHtml(config.groupFilter ?? "(|(objectClass=groupOfNames)(objectClass=posixGroup))")}" /></label>
            <label class="provider-popup-field">${escapeHtml(i18n.t("adapter.auth.ldap.membership_attribute"))}<input name="memberOfAttribute" value="${escapeHtml(config.memberOfAttribute ?? "memberOf")}" placeholder="memberOf" /></label>
            <div class="provider-option-row"><span class="provider-option-label">${escapeHtml(i18n.t("adapter.auth.ldap.nested_membership"))}</span><label class="switch"><input name="nestedMemberOf" type="checkbox"${config.nestedMemberOf !== false ? " checked" : ""} /><span class="slider"></span></label></div>
          </fieldset>
          <fieldset><legend>${escapeHtml(i18n.t("adapter.auth.ldap.role_mapping"))}</legend>
            <p class="module-settings-popup-note">${escapeHtml(i18n.t("adapter.auth.ldap.role_mapping_note"))}</p>
            <div class="ldap-role-table-wrap"><table class="ldap-role-table"><thead><tr><th>${escapeHtml(i18n.t("adapter.auth.ldap.cognis_role"))}</th><th>${escapeHtml(i18n.t("adapter.auth.ldap.ldap_group"))}</th></tr></thead><tbody>${roleRows}</tbody></table></div>
          </fieldset>
          <div class="provider-option-row ldap-writeback-toggle"><span class="provider-option-label">${escapeHtml(i18n.t("adapter.auth.ldap.password_writeback"))}</span><label class="switch"><input name="writebackEnabled" type="checkbox"${config.writebackEnabled === true || config.writebackEnabled === "true" ? " checked" : ""} /><span class="slider"></span></label></div>
          <div class="ldap-writeback-options"><label class="provider-popup-field">${escapeHtml(i18n.t("adapter.auth.ldap.writeback_base_dn"))}<input name="writebackBaseDn" value="${escapeHtml(config.writebackBaseDn ?? config.baseDn ?? "")}" /></label></div>
        </div>`;
    }

    function renderCredentialTestForm(result) {
        const formBuilder = createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "ldap-credential-test-form",
                formClassName: "provider-popup-form ldap-setup-popup",
                includeSubmitButton: false,
                fields: credentialFields(),
            },
        );
        credentialFormController = null;
        const details = result
            ? `<dl class="ldap-credential-result">
                <div><dt>${escapeHtml(i18n.t("adapter.auth.ldap.user"))}</dt><dd>${escapeHtml(result.displayName ?? result.accountId)}</dd></div>
                <div><dt>${escapeHtml(i18n.t("adapter.auth.ldap.account_id"))}</dt><dd>${escapeHtml(result.accountId)}</dd></div>
                ${result.email ? `<div><dt>${escapeHtml(i18n.t("adapter.auth.ldap.email"))}</dt><dd>${escapeHtml(result.email)}</dd></div>` : ""}
                ${result.dn ? `<div><dt>DN</dt><dd>${escapeHtml(result.dn)}</dd></div>` : ""}
                <div><dt>${escapeHtml(i18n.t("adapter.auth.ldap.groups"))}</dt><dd>${escapeHtml(result.groups.join(", ") || i18n.t("adapter.auth.ldap.none"))}</dd></div>
                <div><dt>${escapeHtml(i18n.t("adapter.auth.ldap.cognis_role"))}</dt><dd><strong>${escapeHtml(result.role)}</strong></dd></div>
              </dl>`
            : "";
        return `<div class="ldap-credential-test-step">
          <p class="module-settings-popup-note">${escapeHtml(i18n.t("adapter.auth.ldap.verify_note"))}</p>
          ${formBuilder.render()}
          ${details}
        </div>`;
    }

    const dbData = configPayload?.data ?? {};
    const configuredSecretFields = Array.isArray(
        configPayload?.configuredSecretFields,
    )
        ? configPayload.configuredSecretFields
        : [];
    const configuredBindPasswordIdentifiers = new Set(
        Array.isArray(dbData.servers)
            ? dbData.servers
                  .map((server, index) =>
                      configuredSecretFields.includes(
                          `servers.${index}.bindPassword`,
                      )
                          ? String(server.identifier ?? "")
                          : "",
                  )
                  .filter(Boolean)
            : [],
    );
    let servers = Array.isArray(dbData.servers)
        ? dbData.servers.map((server) => ({ ...server }))
        : Object.keys(dbData).length
          ? [{ identifier: "LDAP", ...dbData }]
          : [];
    let unify = dbData.unify !== false;
    let selectedServerIndex = null;
    let connectionValues = {};
    let sample = null;
    let credentialTestResult = null;
    let discoverySequence = 0;

    async function persistServers() {
        const saveResponse = await apiFetch(configUrl, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ unify, servers }),
        });
        if (!saveResponse.ok) {
            showToast(i18n.t("ui.reuse.save_failed"), {
                variant: "error",
            });
            return false;
        }
        return true;
    }

    async function verifyUserAuthentication(values) {
        const testResponse = await apiFetch(
            configUrl.replace(/\/config$/, "/test"),
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    ...connectionValues,
                    ...values,
                }),
            },
        );
        const testPayload = await testResponse.json().catch(() => ({}));
        if (!testResponse.ok || !testPayload.data?.credentialTest) {
            credentialTestResult = null;
            pendingConnectionFieldErrors =
                testPayload?.error?.fieldErrors ?? {};
            showToast(
                testPayload?.error?.message ??
                    i18n.t("adapter.auth.ldap.authentication_failed"),
                { variant: "error" },
            );
            return false;
        }
        credentialTestResult = testPayload.data.credentialTest;
        pendingConnectionFieldErrors = {};
        showToast(i18n.t("adapter.auth.ldap.authentication_succeeded"), {
            variant: "success",
        });
        return true;
    }

    function showConnectionFieldErrors(overlay) {
        const remainingFieldErrors = {};
        for (const [fieldName, message] of Object.entries(
            pendingConnectionFieldErrors,
        )) {
            const field = overlay.querySelector(
                `[name="${CSS.escape(fieldName)}"]`,
            );
            if (
                !(field instanceof HTMLElement) ||
                !markPopupFieldInvalid(overlay, field.id, message)
            ) {
                remainingFieldErrors[fieldName] = message;
            }
        }
        pendingConnectionFieldErrors = remainingFieldErrors;
    }

    await openPopup({
        title: i18n.t("adapter.auth.ldap.setup_title"),
        maxWidth: "760px",
        pages: [
            {
                id: "servers",
                title: i18n.t("adapter.auth.ldap.servers_title"),
                body: () => renderServerList(servers, unify),
                actions: [
                    {
                        id: "save-home",
                        label: i18n.t("ui.app.admin.notif.save_settings"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
            },
            {
                id: "connect",
                title: i18n.t("adapter.auth.ldap.connection_title"),
                body: () => renderLdapConnectionForm(connectionValues),
                actions: [
                    {
                        id: "back",
                        label: i18n.t("ui.reuse.back"),
                        variant: "neutral",
                    },
                    {
                        id: "test",
                        label: i18n.t("adapter.auth.ldap.test_discover"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
            },
            {
                id: "filters",
                title: i18n.t("adapter.auth.ldap.filters_title"),
                body: () => renderLdapFilterForm(connectionValues, sample),
                actions: [
                    {
                        id: "back",
                        label: i18n.t("ui.reuse.back"),
                        variant: "neutral",
                    },
                    {
                        id: "save",
                        label: i18n.t("adapter.auth.ldap.continue"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
            },
            {
                id: "credentials",
                title: i18n.t("adapter.auth.ldap.verify_title"),
                body: () => renderCredentialTestForm(credentialTestResult),
                actions: [
                    {
                        id: "back",
                        label: i18n.t("ui.reuse.back"),
                        variant: "neutral",
                    },
                    {
                        id: "verify-user",
                        label: i18n.t("adapter.auth.ldap.test_authentication"),
                        variant: "neutral",
                    },
                    {
                        id: "complete",
                        label: i18n.t("ui.app.admin.notif.save_settings"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
            },
        ],
        onOpen: (overlay, _close, api) => {
            showConnectionFieldErrors(overlay);
            if (api.pageId === "servers") {
                const enabledInput = overlay.querySelector(
                    '[name="adapterEnabled"]',
                );
                enabledInput?.addEventListener("change", async () => {
                    const nextEnabled = enabledInput.checked;
                    if (nextEnabled && servers.length === 0) {
                        enabledInput.checked = enabled;
                        return;
                    }
                    const controlUrl = nextEnabled ? enableUrl : disableUrl;
                    if (!controlUrl) {
                        enabledInput.checked = enabled;
                        return;
                    }
                    enabledInput.disabled = true;
                    if (nextEnabled && !(await persistServers())) {
                        enabledInput.checked = enabled;
                        enabledInput.disabled = false;
                        return;
                    }
                    const response = await apiFetch(controlUrl, {
                        method: "POST",
                    });
                    enabledInput.disabled = false;
                    if (!response.ok) {
                        enabledInput.checked = enabled;
                        showToast(i18n.t("ui.reuse.save_failed"), {
                            variant: "error",
                        });
                        return;
                    }
                    enabled = nextEnabled;
                    const stateLabel = overlay.querySelector(
                        "[data-adapter-state]",
                    );
                    if (stateLabel instanceof HTMLElement) {
                        stateLabel.textContent = i18n.t(
                            enabled
                                ? "ui.app.admin.state.active"
                                : "ui.app.admin.state.disabled",
                        );
                    }
                    await onSaved?.();
                });
                const unifyInput = overlay.querySelector('[name="unify"]');
                unifyInput?.addEventListener("change", () => {
                    unify = unifyInput.checked;
                    api.markDirty();
                });
                overlay
                    .querySelector(".ldap-add-server")
                    ?.addEventListener("click", () => {
                        selectedServerIndex = null;
                        connectionValues = {};
                        sample = null;
                        api.markDirty();
                        api.setPage("connect");
                    });
                overlay
                    .querySelectorAll("[data-edit-server]")
                    .forEach((button) =>
                        button.addEventListener("click", () => {
                            selectedServerIndex = Number(
                                button.dataset.editServer,
                            );
                            connectionValues = {
                                ...servers[selectedServerIndex],
                            };
                            sample = null;
                            api.setPage("connect");
                        }),
                    );
                overlay
                    .querySelectorAll("[data-delete-server]")
                    .forEach((button) =>
                        button.addEventListener("click", async () => {
                            if (servers.length === 1) {
                                const confirmed = await openPopup({
                                    title: i18n.t(
                                        "adapter.auth.ldap.delete_last.title",
                                    ),
                                    body: `<p>${escapeHtml(i18n.t("adapter.auth.ldap.delete_last.body"))}</p>`,
                                    variant: "warning",
                                    actions: [
                                        {
                                            id: "delete",
                                            label: i18n.t(
                                                "adapter.auth.ldap.delete_last.action",
                                            ),
                                            variant: "cancel",
                                        },
                                        {
                                            id: "keep",
                                            label: i18n.t("ui.reuse.cancel"),
                                            variant: "neutral",
                                        },
                                    ],
                                });
                                if (confirmed !== "delete") return;
                                if (enabled && disableUrl) {
                                    const disableResponse = await apiFetch(
                                        disableUrl,
                                        { method: "POST" },
                                    );
                                    if (!disableResponse.ok) {
                                        showToast(
                                            i18n.t("ui.reuse.save_failed"),
                                            { variant: "error" },
                                        );
                                        return;
                                    }
                                    enabled = false;
                                    await onSaved?.();
                                }
                            }
                            servers.splice(
                                Number(button.dataset.deleteServer),
                                1,
                            );
                            api.markDirty();
                            api.setPage("servers");
                        }),
                    );
                let draggedIndex = null;
                overlay
                    .querySelectorAll("[data-server-index]")
                    .forEach((row) => {
                        row.addEventListener("dragstart", () => {
                            draggedIndex = Number(row.dataset.serverIndex);
                        });
                        row.addEventListener("dragover", (event) =>
                            event.preventDefault(),
                        );
                        row.addEventListener("drop", (event) => {
                            event.preventDefault();
                            const targetIndex = Number(row.dataset.serverIndex);
                            if (
                                draggedIndex === null ||
                                draggedIndex === targetIndex
                            )
                                return;
                            const [server] = servers.splice(draggedIndex, 1);
                            servers.splice(targetIndex, 0, server);
                            api.markDirty();
                            api.setPage("servers");
                        });
                    });
                return;
            }
            if (api.pageId === "credentials") {
                const form = overlay.querySelector(
                    "#ldap-credential-test-form",
                );
                if (form instanceof HTMLFormElement) {
                    const builder = createFormBuilder(
                        { i18n, escapeHtml },
                        {
                            formId: "ldap-credential-test-form",
                            includeSubmitButton: false,
                            fields: credentialFields(),
                        },
                    );
                    credentialFormController = builder.attach(form);
                    form.addEventListener("keydown", (event) => {
                        if (
                            event.key !== "Enter" ||
                            event.target instanceof HTMLTextAreaElement
                        ) {
                            return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        overlay
                            .querySelector('[data-popup-action="verify-user"]')
                            ?.click();
                    });
                }
                return;
            }
            if (api.pageId !== "connect") return;
            const form = overlay.querySelector("#ldap-connection-form");
            if (form instanceof HTMLFormElement) {
                const builder = createFormBuilder(
                    { i18n, escapeHtml },
                    {
                        formId: "ldap-connection-form",
                        includeSubmitButton: false,
                        fields: connectionFields(connectionValues),
                    },
                );
                connectionFormController = builder.attach(form);
            }
        },
        onAction: async (action, overlay, api) => {
            if (action === null || action === "cancel") {
                await api.requestClose();
                return false;
            }
            if (action === "back") {
                api.setPage(
                    api.pageId === "credentials"
                        ? "filters"
                        : api.pageId === "filters"
                          ? "connect"
                          : "servers",
                );
                return false;
            }
            if (action === "save-home") {
                if (!(await persistServers())) return false;
                await onSaved?.();
                showToast(i18n.t("ui.app.admin.settings_saved"), {
                    variant: "success",
                });
                return true;
            }
            const form = overlay.querySelector(".provider-popup-form");
            if (!(form instanceof HTMLElement)) return false;
            const values = buildConfigPayload(form);
            const requiresUserAuthentication =
                action === "verify-user" ||
                (action === "complete" && !credentialTestResult);
            if (requiresUserAuthentication) {
                if (!credentialFormController?.validateAll(true)) {
                    showToast(
                        i18n.t(
                            "adapter.auth.ldap.authentication_fields_required",
                        ),
                        { variant: "error" },
                    );
                    form.querySelector(".form-builder-input--invalid")?.focus();
                    return false;
                }
                if (!(await verifyUserAuthentication(values))) {
                    const credentialFields = new Set([
                        "testUsername",
                        "testPassword",
                    ]);
                    const filterFields = new Set(["userFilter", "groupFilter"]);
                    const errorFields = Object.keys(
                        pendingConnectionFieldErrors,
                    );
                    api.setPage(
                        errorFields.some((fieldName) =>
                            credentialFields.has(fieldName),
                        )
                            ? "credentials"
                            : errorFields.some((fieldName) =>
                                    filterFields.has(fieldName),
                                )
                              ? "filters"
                              : "connect",
                    );
                    return false;
                }
                api.markDirty();
                if (action === "verify-user" || api.pageId === "credentials") {
                    api.setPage("credentials");
                    return false;
                }
            }
            if (action === "test") {
                if (!connectionFormController?.validateAll(true)) {
                    form.querySelector(".form-builder-input--invalid")?.focus();
                    return false;
                }
                const currentDiscovery = ++discoverySequence;
                connectionValues = { ...connectionValues, ...values };
                sample = null;
                const testResponse = await apiFetch(
                    configUrl.replace(/\/config$/, "/test"),
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(connectionValues),
                    },
                );
                const testPayload = await testResponse.json().catch(() => ({}));
                if (currentDiscovery !== discoverySequence) return false;
                if (!testResponse.ok) {
                    pendingConnectionFieldErrors =
                        testPayload?.error?.fieldErrors ?? {};
                    showToast(
                        testPayload?.error?.message ??
                            i18n.t("adapter.auth.ldap.test_failed"),
                        { variant: "error" },
                    );
                    const filterFields = new Set(["userFilter", "groupFilter"]);
                    const errorPage = Object.keys(
                        pendingConnectionFieldErrors,
                    ).some((fieldName) => filterFields.has(fieldName))
                        ? "filters"
                        : "connect";
                    api.setPage(errorPage);
                    return false;
                }
                pendingConnectionFieldErrors = {};
                sample = testPayload.data;
                showToast(i18n.t("adapter.auth.ldap.discovery_succeeded"), {
                    variant: "success",
                });
                api.markDirty();
                api.setPage("filters");
                return false;
            }
            if (action === "save") {
                connectionValues = { ...connectionValues, ...values };
                connectionValues.roleMappings = Object.fromEntries(
                    ["user", "teacher", "moderator", "admin"]
                        .map((role) => [values[`roleMapping.${role}`], role])
                        .filter(([group]) => group),
                );
                credentialTestResult = null;
                api.setPage("credentials");
                return false;
            }
            if (action !== "complete") return true;
            const duplicateIdentifier = servers.some(
                (server, index) =>
                    index !== selectedServerIndex &&
                    String(server.identifier).trim().toLowerCase() ===
                        String(connectionValues.identifier)
                            .trim()
                            .toLowerCase(),
            );
            if (duplicateIdentifier) {
                showToast(i18n.t("adapter.auth.ldap.identifier_unique"), {
                    variant: "error",
                });
                return false;
            }
            const serverCreated = selectedServerIndex === null;
            if (serverCreated) servers.push(connectionValues);
            else servers[selectedServerIndex] = connectionValues;
            showToast(
                i18n.t(
                    serverCreated
                        ? "adapter.auth.ldap.server_created"
                        : "adapter.auth.ldap.server_updated",
                ),
                { variant: "success" },
            );
            api.setPage("servers");
            return false;
        },
        closeProtection: true,
    });
}
