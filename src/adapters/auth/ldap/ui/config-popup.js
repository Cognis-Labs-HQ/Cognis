/** Adapter-owned LDAP configuration popup extension. */
import { createFormBuilder } from "/static/reuse/form-builder.js";

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
    fieldNameToLabel,
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

    function renderLdapConnectionForm(values = {}) {
        const bindPasswordConfigured =
            configuredSecretFields.includes("bindPassword") ||
            configuredBindPasswordIdentifiers.has(String(values.identifier));
        const labels = {
            identifier: "Server identifier",
            serverUrl: fieldNameToLabel("serverUrl"),
            baseDn: fieldNameToLabel("baseDn"),
            userDn: fieldNameToLabel("userDn"),
            groupDn: fieldNameToLabel("groupDn"),
            bindDn: fieldNameToLabel("bindDn"),
            bindPassword: fieldNameToLabel("bindPassword"),
            userAttribute: "Username attribute",
        };
        const formBuilder = createFormBuilder(
            { i18n: { t: (key) => labels[key] ?? key }, escapeHtml },
            {
                formId: "ldap-connection-form",
                formClassName: "provider-popup-form ldap-setup-popup",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "identifier",
                        labelKey: "identifier",
                        required: true,
                        attributes: { placeholder: "Corporate directory" },
                    },
                    {
                        name: "serverUrl",
                        labelKey: "serverUrl",
                        required: true,
                    },
                    { name: "baseDn", labelKey: "baseDn", required: true },
                    {
                        name: "userDn",
                        labelKey: "userDn",
                        attributes: {
                            placeholder: "Optional; falls back to Base DN",
                        },
                    },
                    {
                        name: "groupDn",
                        labelKey: "groupDn",
                        attributes: {
                            placeholder: "Optional; falls back to Base DN",
                        },
                    },
                    { name: "bindDn", labelKey: "bindDn", required: true },
                    {
                        name: "bindPassword",
                        labelKey: "bindPassword",
                        type: "password",
                        required: !bindPasswordConfigured,
                        attributes: bindPasswordConfigured
                            ? {
                                  placeholder:
                                      "Leave blank to keep the saved password",
                              }
                            : {},
                    },
                    {
                        name: "userAttribute",
                        labelKey: "userAttribute",
                        required: true,
                        attributes: {
                            placeholder: "uid (OpenLDAP or FreeIPA)",
                        },
                    },
                ].map((field) => ({
                    ...field,
                    value:
                        values[field.name] ??
                        (field.name === "userAttribute" ? "uid" : ""),
                })),
            },
        );
        connectionFormController = null;
        return `<div class="ldap-connection-step">
          <p class="module-settings-popup-note">Connect to OpenLDAP or FreeIPA first. Cognis will inspect sample users and groups before asking for filters.</p>
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
                  <button type="button" data-edit-server="${index}" class="btn-animated">Edit</button>
                  <button type="button" data-delete-server="${index}" class="btn-cancel btn-animated">Delete</button>
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
          <div class="provider-option-row"><span class="provider-option-label">Unify LDAP sources</span><label class="switch"><input name="unify" type="checkbox"${unify ? " checked" : ""} /><span class="slider"></span></label></div>
          <p class="module-settings-popup-note">When unified, credentials are tried against each server in the order below. Otherwise, every server is shown separately on the Login page.</p>
          <ol class="ldap-server-list">${rows || '<li class="module-settings-popup-note">No LDAP servers configured.</li>'}</ol>
          <button type="button" class="btn-confirm btn-animated ldap-add-server" aria-label="Add LDAP server">+</button>
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
            `<option value="">No LDAP group</option>${groups
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
        return `<div class="provider-popup-form ldap-setup-popup">
          <p class="module-settings-popup-note">Connected to ${escapeHtml(sample?.directoryFlavor ?? "LDAP")} and read ${users.length} users and ${groups.length} groups. The lists below contain live directory results, limited to 500 entries.</p>
          <fieldset><legend>Directory queries</legend>
            <label class="provider-popup-field">User filter<input name="userFilter" value="${escapeHtml(config.userFilter ?? "(&(objectClass=inetOrgPerson)(uid={username}))")}" /></label>
            <label class="provider-popup-field">Group filter<input name="groupFilter" value="${escapeHtml(config.groupFilter ?? "(|(objectClass=groupOfNames)(objectClass=posixGroup))")}" /></label>
            <label class="provider-popup-field">Group membership attribute<input name="memberOfAttribute" value="${escapeHtml(config.memberOfAttribute ?? "memberOf")}" placeholder="memberOf" /></label>
            <div class="provider-option-row"><span class="provider-option-label">Resolve nested group membership</span><label class="switch"><input name="nestedMemberOf" type="checkbox"${config.nestedMemberOf !== false ? " checked" : ""} /><span class="slider"></span></label></div>
          </fieldset>
          <fieldset><legend>LDAP group to Cognis role mapping</legend>
            <p class="module-settings-popup-note">Choose one of the groups returned by LDAP for each supported role. Users without a mapping receive the user role.</p>
            <div class="ldap-role-table-wrap"><table class="ldap-role-table"><thead><tr><th>Cognis role</th><th>LDAP group</th></tr></thead><tbody>${roleRows}</tbody></table></div>
          </fieldset>
          <div class="provider-option-row ldap-writeback-toggle"><span class="provider-option-label">Enable LDAP password writeback</span><label class="switch"><input name="writebackEnabled" type="checkbox"${config.writebackEnabled === true || config.writebackEnabled === "true" ? " checked" : ""} /><span class="slider"></span></label></div>
          <div class="ldap-writeback-options"><label class="provider-popup-field">Writeback base DN<input name="writebackBaseDn" value="${escapeHtml(config.writebackBaseDn ?? config.baseDn ?? "")}" /></label></div>
        </div>`;
    }

    function renderCredentialTestForm(result) {
        const formBuilder = createFormBuilder(
            {
                i18n: {
                    t: (key) =>
                        ({
                            testUsername: "LDAP username",
                            testPassword: "LDAP password",
                        })[key] ?? key,
                },
                escapeHtml,
            },
            {
                formId: "ldap-credential-test-form",
                formClassName: "provider-popup-form ldap-setup-popup",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "testUsername",
                        labelKey: "testUsername",
                        required: true,
                    },
                    {
                        name: "testPassword",
                        labelKey: "testPassword",
                        type: "password",
                        required: true,
                    },
                ],
            },
        );
        credentialFormController = null;
        const details = result
            ? `<dl class="ldap-credential-result">
                <div><dt>User</dt><dd>${escapeHtml(result.displayName ?? result.accountId)}</dd></div>
                <div><dt>Account ID</dt><dd>${escapeHtml(result.accountId)}</dd></div>
                ${result.email ? `<div><dt>Email</dt><dd>${escapeHtml(result.email)}</dd></div>` : ""}
                ${result.dn ? `<div><dt>DN</dt><dd>${escapeHtml(result.dn)}</dd></div>` : ""}
                <div><dt>Groups</dt><dd>${escapeHtml(result.groups.join(", ") || "None")}</dd></div>
                <div><dt>Cognis role</dt><dd><strong>${escapeHtml(result.role)}</strong></dd></div>
              </dl>`
            : "";
        return `<div class="ldap-credential-test-step">
          <p class="module-settings-popup-note">Verify the final configuration with the credentials of any LDAP user. The resolved user and Cognis role will be shown before this server can be saved.</p>
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
            showToast(
                testPayload?.error?.message ??
                    "LDAP user credential test failed",
                { variant: "error" },
            );
            return false;
        }
        credentialTestResult = testPayload.data.credentialTest;
        return true;
    }

    await openPopup({
        title: "LDAP setup",
        maxWidth: "760px",
        pages: [
            {
                id: "servers",
                title: "LDAP servers",
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
                title: "LDAP setup: connection",
                body: () => renderLdapConnectionForm(connectionValues),
                actions: [
                    { id: "back", label: "Back", variant: "neutral" },
                    {
                        id: "test",
                        label: "Test and discover",
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
                title: "LDAP setup: filters and roles",
                body: () => renderLdapFilterForm(connectionValues, sample),
                actions: [
                    { id: "back", label: "Back", variant: "neutral" },
                    {
                        id: "save",
                        label: "Continue",
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
                title: "LDAP setup: verify user",
                body: () => renderCredentialTestForm(credentialTestResult),
                actions: [
                    { id: "back", label: "Back", variant: "neutral" },
                    {
                        id: "verify-user",
                        label: "Test user authentication",
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
                        button.addEventListener("click", () => {
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
                        { i18n: { t: (key) => key }, escapeHtml },
                        {
                            formId: "ldap-credential-test-form",
                            includeSubmitButton: false,
                            fields: ["testUsername", "testPassword"].map(
                                (name) => ({
                                    name,
                                    labelKey: name,
                                    required: true,
                                }),
                            ),
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
                const fields = [
                    "identifier",
                    "serverUrl",
                    "baseDn",
                    "userDn",
                    "groupDn",
                    "bindDn",
                    "bindPassword",
                    "userAttribute",
                ];
                const builder = createFormBuilder(
                    { i18n: { t: (key) => key }, escapeHtml },
                    {
                        formId: "ldap-connection-form",
                        includeSubmitButton: false,
                        fields: fields.map((name) => ({
                            name,
                            labelKey: name,
                            required:
                                !["userDn", "groupDn"].includes(name) &&
                                !(
                                    name === "bindPassword" &&
                                    (configuredSecretFields.includes(
                                        "bindPassword",
                                    ) ||
                                        configuredBindPasswordIdentifiers.has(
                                            String(connectionValues.identifier),
                                        ))
                                ),
                        })),
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
                    form.querySelector(".form-builder-input--invalid")?.focus();
                    return false;
                }
                if (!(await verifyUserAuthentication(values))) {
                    api.setPage("connect");
                    return false;
                }
                api.markDirty();
                if (action === "verify-user") {
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
                    showToast(
                        testPayload?.error?.message ?? "LDAP test failed",
                        { variant: "error" },
                    );
                    return false;
                }
                sample = testPayload.data;
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
                showToast("LDAP server identifiers must be unique.", {
                    variant: "error",
                });
                return false;
            }
            if (selectedServerIndex === null) servers.push(connectionValues);
            else servers[selectedServerIndex] = connectionValues;
            api.setPage("servers");
            return false;
        },
        closeProtection: true,
    });
}
