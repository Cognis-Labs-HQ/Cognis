/**
 * Resolves the stable adapter identifier used across rendered data attributes
 * and toggle flows.
 *
 * @param {{ senderId?: string, id?: string }} adapter
 * @returns {string | undefined}
 */
function resolveAdapterId(adapter) {
    return adapter.senderId ?? adapter.id;
}

/**
 * Normalizes adapter enabled state across legacy and current payload shapes.
 *
 * @param {{ active?: boolean, enabled?: boolean }} adapter
 * @returns {boolean}
 */
function isAdapterEnabled(adapter) {
    return Boolean(adapter.active ?? adapter.enabled);
}

/**
 * Builds the display pill metadata for a runtime status value.
 *
 * @param {string} status
 * @param {{ t: (key: string) => string }} i18n
 * @returns {{ label: string, className: string }}
 */
function getStatePill(status, i18n) {
    if (status === "active" || status === "enabled") {
        return {
            label: i18n.t("ui.app.admin.state.active"),
            className: "pill-active",
        };
    }
    if (status === "available") {
        return {
            label: i18n.t("ui.app.admin.state.available"),
            className: "pill-available",
        };
    }
    return {
        label: i18n.t("ui.app.admin.state.disabled"),
        className: "pill-disabled",
    };
}

function renderDependencyLinks(ids, scrollPrefix, gateways, i18n, escapeHtml) {
    if (!ids || ids.length === 0) {
        return i18n.t("ui.app.admin.gateway.no_dependencies");
    }
    const gatewayById = new Map(
        gateways.map((gateway) => [gateway.id, gateway]),
    );
    return ids
        .map((id) => {
            const dependency = gatewayById.get(id);
            const label = dependency
                ? escapeHtml(dependency.name)
                : escapeHtml(id);
            return `<a class="dependency-link" href="#" data-scroll-to="${escapeHtml(scrollPrefix)}${escapeHtml(id)}">${label}</a>`;
        })
        .join(", ");
}

function renderDetailsList(moduleRecord, gateways, i18n, escapeHtml) {
    const details = [
        [i18n.t("ui.reuse.id"), moduleRecord.id],
        [i18n.t("ui.reuse.version"), moduleRecord.version],
        [
            i18n.t("ui.app.admin.publisher"),
            moduleRecord.publisher || i18n.t("ui.app.admin.unknown"),
        ],
        [i18n.t("ui.reuse.class"), moduleRecord.class],
        [
            i18n.t("ui.app.admin.capabilities"),
            (moduleRecord.capabilities || []).join(", ") ||
                i18n.t("ui.app.admin.none"),
        ],
    ];

    const rows = details
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");

    if (moduleRecord.requires && moduleRecord.requires.length > 0) {
        const depsHtml = renderDependencyLinks(
            moduleRecord.requires,
            "gateway-",
            gateways,
            i18n,
            escapeHtml,
        );
        return (
            rows +
            `<li class="module-detail-item"><span class="module-detail-key">${i18n.t("ui.app.admin.gateway.dependencies")}</span><span class="module-detail-value">${depsHtml}</span></li>`
        );
    }

    return rows;
}

function renderModulesContent(modules, gateways, deps) {
    const { i18n, escapeHtml, resolveModuleConfigScriptUrl, isModuleEnabled } =
        deps;
    return modules
        .map((moduleRecord) => {
            const pill = getStatePill(moduleRecord.status, i18n);
            const disableBlocked = moduleRecord.class === "core";
            const toggleTitle = i18n.t("ui.app.admin.toggle_module");
            const componentConfigScriptUrl =
                resolveModuleConfigScriptUrl(moduleRecord);
            const hasConfigButton = componentConfigScriptUrl.length > 0;
            const settingsButton = hasConfigButton
                ? `<button type="button" class="module-config-settings-button" data-module-config-script-url="${escapeHtml(componentConfigScriptUrl)}" data-module-id="${escapeHtml(moduleRecord.id)}" aria-label="${escapeHtml(i18n.t("ui.reuse.settings"))}" title="${escapeHtml(i18n.t("ui.reuse.settings"))}">⚙</button>`
                : "";

            return `
        <details class="module-row" data-module="${moduleRecord.id}">
          <summary class="module-row-summary">
            <span class="module-row-title"><strong>${moduleRecord.name}</strong>${settingsButton}</span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <label class="switch switch--inline" title="${escapeHtml(toggleTitle)}">
              <input type="checkbox" data-module="${moduleRecord.id}" ${isModuleEnabled(moduleRecord) ? "checked" : ""} ${disableBlocked ? "disabled" : ""} />
              <span class="slider"></span>
            </label>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderDetailsList(moduleRecord, gateways, i18n, escapeHtml)}</ul>
          </div>
        </details>
      `;
        })
        .join("");
}

function renderGatewayDetailsList(gateway, gateways, i18n, escapeHtml) {
    const requiredLabel = gateway.required
        ? i18n.t("ui.reuse.true")
        : i18n.t("ui.reuse.false");
    const details = [
        [i18n.t("ui.reuse.id"), escapeHtml(gateway.id)],
        [i18n.t("ui.reuse.version"), escapeHtml(gateway.version ?? "")],
        [
            i18n.t("ui.app.admin.publisher"),
            escapeHtml(gateway.publisher || i18n.t("ui.app.admin.unknown")),
        ],
        [i18n.t("ui.app.admin.gateway.required"), requiredLabel],
    ];
    if (gateway.description) {
        details.push([
            i18n.t("ui.app.admin.description"),
            escapeHtml(gateway.description),
        ]);
    }
    const detailRows = details
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");
    const depsHtml = renderDependencyLinks(
        gateway.requires,
        "gateway-",
        gateways,
        i18n,
        escapeHtml,
    );
    const depsRow = `<li class="module-detail-item"><span class="module-detail-key">${i18n.t("ui.app.admin.gateway.dependencies")}</span><span class="module-detail-value">${depsHtml}</span></li>`;
    return detailRows + depsRow;
}

function renderAdapterToggle(
    adapter,
    gatewayId,
    isGatewayDisabled,
    i18n,
    escapeHtml,
) {
    const adapterId = resolveAdapterId(adapter);
    const isEnabled = isAdapterEnabled(adapter);
    const isLocked = Boolean(adapter.locked);
    return `<label class="switch switch--inline" title="${escapeHtml(i18n.t("ui.app.admin.toggle_adapter"))}">
      <input type="checkbox" class="adapter-toggle"
        data-adapter="${escapeHtml(adapterId)}"
        data-gateway="${escapeHtml(gatewayId)}"
        ${isEnabled ? "checked" : ""}
        ${isGatewayDisabled || isLocked ? "disabled" : ""} />
      <span class="slider"></span>
    </label>`;
}

function renderInlineAdapters(
    adapters,
    gatewayId,
    isGatewayDisabled,
    i18n,
    escapeHtml,
) {
    if (!adapters || adapters.length === 0) return "";
    const rows = adapters
        .map((adapter) => {
            const adapterId = resolveAdapterId(adapter);
            const isActive = isAdapterEnabled(adapter);
            const statePillClass = isActive ? "pill-active" : "pill-available";
            const stateLabel = isActive
                ? i18n.t("ui.app.admin.state.active")
                : i18n.t("ui.app.admin.state.available");
            return `
        <div class="adapter-inline-row" role="button" tabindex="0"
          data-adapter-id="${escapeHtml(adapterId)}"
          data-gateway-id="${escapeHtml(gatewayId)}">
          <span class="adapter-inline-name"><strong>${escapeHtml(adapter.name ?? adapterId)}</strong></span>
          <span class="state-pill ${statePillClass}">${stateLabel}</span>
          ${renderAdapterToggle(adapter, gatewayId, isGatewayDisabled, i18n, escapeHtml)}
        </div>
      `;
        })
        .join("");
    return `
      <div class="gateway-adapters-section">
        <span class="gateway-adapters-label">${i18n.t("ui.app.admin.adapters")}</span>
        <div class="gateway-adapters-inline">${rows}</div>
      </div>
    `;
}

function renderGatewaysContent(gateways, allAdapters, i18n, escapeHtml) {
    if (!gateways.length) {
        return `<p>${i18n.t("ui.app.admin.no_gateways")}</p>`;
    }
    const toggleTitle = i18n.t("ui.app.admin.toggle_gateway");
    const adaptersByGatewayId = new Map();
    for (const adapter of allAdapters) {
        const gatewayId = adapter._gatewayId;
        if (!adaptersByGatewayId.has(gatewayId)) {
            adaptersByGatewayId.set(gatewayId, []);
        }
        adaptersByGatewayId.get(gatewayId).push(adapter);
    }

    return gateways
        .map((gateway) => {
            const pill = getStatePill(gateway.status ?? "active", i18n);
            const isEnabled = (gateway.status ?? "active") !== "disabled";
            const isGatewayDisabled = !isEnabled;
            const gatewayAdapters = gateway.hasAdapters
                ? (adaptersByGatewayId.get(gateway.id) ?? [])
                : [];

            return `
        <details class="module-row" data-gateway="${escapeHtml(gateway.id)}">
          <summary class="module-row-summary">
            <span class="module-row-title"><strong>${escapeHtml(gateway.name)}</strong></span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <label class="switch switch--inline" title="${escapeHtml(toggleTitle)}">
              <input type="checkbox" data-gateway="${escapeHtml(gateway.id)}" ${isEnabled ? "checked" : ""} ${gateway.required ? "disabled" : ""} />
              <span class="slider"></span>
            </label>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderGatewayDetailsList(gateway, gateways, i18n, escapeHtml)}</ul>
            ${renderInlineAdapters(gatewayAdapters, gateway.id, isGatewayDisabled, i18n, escapeHtml)}
          </div>
        </details>
      `;
        })
        .join("");
}

export function renderComponentsContent(modules, gateways, allAdapters, deps) {
    const { i18n } = deps;
    return `
    <div class="components-section">
      <h3 class="components-section-heading">${i18n.t("ui.reuse.modules")}</h3>
      <div class="components-section-body">
        ${renderModulesContent(modules, gateways, deps)}
      </div>
    </div>
    <div class="components-section">
      <h3 class="components-section-heading">${i18n.t("ui.app.admin.gateways")}</h3>
      <div class="components-section-body">
        ${renderGatewaysContent(gateways, allAdapters, deps.i18n, deps.escapeHtml)}
      </div>
    </div>
  `;
}

export function renderIntegrityContent(integrityRows, i18n) {
    if (!integrityRows.length) {
        return `<p>${i18n.t("ui.app.admin.no_integrity")}</p>`;
    }

    const rowsByModuleId = new Map();
    for (const row of integrityRows) {
        if (!rowsByModuleId.has(row.moduleId))
            rowsByModuleId.set(row.moduleId, []);
        rowsByModuleId.get(row.moduleId).push(row);
    }

    const sections = [];
    for (const [moduleId, rows] of rowsByModuleId) {
        const items = rows
            .map((row) => {
                const mismatchDetails =
                    row.status !== "ok"
                        ? ` (${i18n.t("ui.app.admin.expected")} ${row.expected}, ${i18n.t("ui.app.admin.got")} ${row.actual ?? i18n.t("ui.app.admin.missing")})`
                        : "";
                return `<li class="integrity-${row.status}">${row.file}: ${row.status}${mismatchDetails}</li>`;
            })
            .join("");
        sections.push(`
      <div class="integrity-module">
        <h3>${moduleId}</h3>
        <ul class="integrity-list">${items}</ul>
      </div>
    `);
    }
    return sections.join("");
}
