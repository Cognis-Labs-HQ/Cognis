/** Adapter-owned LDAP configuration popup extension. */
export async function openAdapterConfig({
    configUrl,
    onSaved,
    i18n,
    escapeHtml,
    apiFetch,
    openPopup,
    showToast,
    buildConfigPayload,
    fieldNameToLabel,
}) {
    function renderLdapConnectionForm(values = {}) {
        return `<div class="provider-popup-form ldap-setup-popup">
          <p class="module-settings-popup-note">Connect to OpenLDAP or FreeIPA first. Cognis will inspect sample users and groups before asking for filters.</p>
          ${["serverUrl", "baseDn", "userDn", "groupDn", "bindDn", "bindPassword", "userAttribute"].map((name) => `<label class="provider-popup-field">${name === "userAttribute" ? "Username attribute" : escapeHtml(fieldNameToLabel(name))}<input id="${name}" name="${name}" type="${name === "bindPassword" ? "password" : "text"}" value="${escapeHtml(values[name] ?? (name === "userAttribute" ? "uid" : ""))}"${name === "userAttribute" ? ' placeholder="uid (OpenLDAP) or uid (FreeIPA)"' : name === "userDn" || name === "groupDn" ? ` placeholder="Optional; falls back to Base DN"` : ""} /></label>`).join("")}
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

    const response = await apiFetch(configUrl);
    if (!response.ok) return;
    const payload = await response.json();
    const dbData = payload.data ?? {};
    let connectionValues = { ...dbData };
    let sample = null;
    let discoverySequence = 0;
    await openPopup({
        title: "LDAP setup",
        maxWidth: "760px",
        pages: [
            {
                id: "connect",
                title: "LDAP setup: connection",
                body: () => renderLdapConnectionForm(connectionValues),
                actions: [
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
        onAction: async (action, overlay, api) => {
            if (action === "back") {
                api.setPage("connect");
                return false;
            }
            const form = overlay.querySelector(".provider-popup-form");
            if (!(form instanceof HTMLElement)) return false;
            const values = buildConfigPayload(form);
            if (action === "test") {
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
                api.setPage("filters");
                return false;
            }
            if (action !== "save") return true;
            connectionValues = { ...connectionValues, ...values };
            connectionValues.roleMappings = Object.fromEntries(
                ["user", "teacher", "moderator", "admin"]
                    .map((role) => [values[`roleMapping.${role}`], role])
                    .filter(([group]) => group),
            );
            const saveResponse = await apiFetch(configUrl, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(connectionValues),
            });
            if (!saveResponse.ok) {
                showToast(i18n.t("ui.reuse.save_failed"), {
                    variant: "error",
                });
                return false;
            }
            await onSaved?.();
            showToast(i18n.t("ui.app.admin.settings_saved"), {
                variant: "success",
            });
            return true;
        },
        closeProtection: true,
    });
}
