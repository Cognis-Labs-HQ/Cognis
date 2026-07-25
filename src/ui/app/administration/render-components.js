function resolveAdapterId(adapter) {
    return adapter.senderId ?? adapter.id;
}

function isAdapterEnabled(adapter) {
    return Boolean(adapter.active ?? adapter.enabled);
}

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

function resolveComponentHealth(healthStatus, componentType, componentId) {
    const contributions = Array.isArray(healthStatus?.contributions)
        ? healthStatus.contributions
        : [];
    return contributions.find(
        (contribution) =>
            contribution.componentType === componentType &&
            contribution.componentId === componentId,
    );
}

function renderHealthLight(componentHealth, isActive, escapeHtml) {
    if (!isActive || !componentHealth) {
        return '<span class="component-health-light-spacer" aria-hidden="true"></span>';
    }
    const status = ["ok", "warning", "error"].includes(componentHealth.status)
        ? componentHealth.status
        : "warning";
    const title = componentHealth.message
        ? ` title="${escapeHtml(componentHealth.message)}"`
        : "";
    return `<span class="component-health-light component-health-light--${status}" role="img" aria-label="${escapeHtml(status)}"${title}></span>`;
}

function renderAdapterDetailsList(adapter, adapterId, i18n, escapeHtml) {
    return renderDetailRows([
        [i18n.t("ui.reuse.id"), escapeHtml(adapterId)],
        [
            i18n.t("ui.reuse.version"),
            escapeHtml(adapter.version ?? i18n.t("ui.app.admin.unknown")),
        ],
        [
            i18n.t("ui.app.admin.publisher"),
            escapeHtml(adapter.publisher || i18n.t("ui.app.admin.unknown")),
        ],
    ]);
}

function renderDetailRows(pairs) {
    return pairs
        .map(
            ([key, value]) =>
                `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`,
        )
        .join("");
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

function renderDetailsList(
    moduleRecord,
    gateways,
    healthStatus,
    i18n,
    escapeHtml,
) {
    const pairs = [
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
    const depsKey = i18n.t("ui.app.admin.gateway.dependencies");
    if (moduleRecord.requires && moduleRecord.requires.length > 0) {
        pairs.push([
            depsKey,
            renderDependencyLinks(
                moduleRecord.requires,
                "gateway-",
                gateways,
                i18n,
                escapeHtml,
            ),
        ]);
    }
    return renderDetailRows(pairs);
}

function renderModulesContent(modules, gateways, deps) {
    const {
        i18n,
        escapeHtml,
        resolveModuleConfigScriptUrl,
        isModuleEnabled,
        healthStatus,
    } = deps;
    return modules
        .map((moduleRecord) => {
            const pill = getStatePill(moduleRecord.status, i18n);
            const disableBlocked = moduleRecord.class === "core";
            const toggleTitle = i18n.t("ui.app.admin.toggle_module");
            const componentConfigScriptUrl =
                resolveModuleConfigScriptUrl(moduleRecord);
            const configAttributes =
                componentConfigScriptUrl.length > 0
                    ? ` data-module-config-script-url="${escapeHtml(componentConfigScriptUrl)}"`
                    : "";
            const isEnabled = isModuleEnabled(moduleRecord);
            const healthLight = renderHealthLight(
                resolveComponentHealth(healthStatus, "module", moduleRecord.id),
                isEnabled,
                escapeHtml,
            );

            return `
        <details class="module-row" data-module="${moduleRecord.id}"${configAttributes}>
          <summary class="module-row-summary">
            <span class="module-row-title"><strong>${moduleRecord.name}</strong></span>
            <div class="module-row-controls">
              <span class="state-pill ${pill.className}">${pill.label}</span>
              ${healthLight}
              <label class="switch switch--inline" title="${escapeHtml(toggleTitle)}">
                <input type="checkbox" data-module="${moduleRecord.id}" ${isModuleEnabled(moduleRecord) ? "checked" : ""} ${disableBlocked ? "disabled" : ""} />
                <span class="slider"></span>
              </label>
              <span class="module-chevron" role="button" tabindex="0" data-details-toggle aria-label="${escapeHtml(i18n.t("ui.reuse.details"))}">▾</span>
            </div>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderDetailsList(moduleRecord, gateways, healthStatus, i18n, escapeHtml)}</ul>
          </div>
        </details>
      `;
        })
        .join("");
}

function renderGatewayDetailsList(
    gateway,
    gateways,
    healthStatus,
    i18n,
    escapeHtml,
) {
    const pairs = [
        [i18n.t("ui.reuse.id"), escapeHtml(gateway.id)],
        [i18n.t("ui.reuse.version"), escapeHtml(gateway.version ?? "")],
        [
            i18n.t("ui.app.admin.publisher"),
            escapeHtml(gateway.publisher || i18n.t("ui.app.admin.unknown")),
        ],
        [
            i18n.t("ui.app.admin.gateway.required"),
            gateway.required
                ? i18n.t("ui.reuse.true")
                : i18n.t("ui.reuse.false"),
        ],
    ];
    if (gateway.description) {
        pairs.push([
            i18n.t("ui.app.admin.description"),
            escapeHtml(gateway.description),
        ]);
    }
    pairs.push([
        i18n.t("ui.app.admin.gateway.dependencies"),
        renderDependencyLinks(
            gateway.requires,
            "gateway-",
            gateways,
            i18n,
            escapeHtml,
        ),
    ]);
    return renderDetailRows(pairs);
}

export function buildScrollTargetId(gatewayId, adapterId) {
    return adapterId
        ? `adapter-${gatewayId}:${adapterId}`
        : `gateway-${gatewayId}`;
}

function renderInlineAdapters(
    adapters,
    gatewayId,
    isGatewayDisabled,
    gatewayById,
    adapterByCompositeKey,
    i18n,
    escapeHtml,
    healthStatus,
) {
    if (!adapters || adapters.length === 0) return "";
    const rows = adapters
        .map((adapter) => {
            const adapterId = resolveAdapterId(adapter);
            const isActive = isAdapterEnabled(adapter);
            const isLocked = Boolean(adapter.locked);
            const syncedTo = adapter.syncedTo;
            const syncTargetGatewayId = syncedTo?.gatewayId;
            const syncTargetAdapterId = syncedTo?.adapterId;
            const syncTargetGateway = syncTargetGatewayId
                ? gatewayById.get(syncTargetGatewayId)
                : null;
            const syncTargetAdapter =
                syncTargetGatewayId && syncTargetAdapterId
                    ? adapterByCompositeKey.get(
                          `${syncTargetGatewayId}:${syncTargetAdapterId}`,
                      )
                    : null;
            const syncTargetName = syncTargetAdapter?.name
                ? escapeHtml(syncTargetAdapter.name)
                : syncTargetGateway?.name
                  ? escapeHtml(syncTargetGateway.name)
                  : syncTargetAdapterId
                    ? escapeHtml(syncTargetAdapterId)
                    : syncTargetGatewayId
                      ? escapeHtml(syncTargetGatewayId)
                      : "";
            const syncedToTemplate = escapeHtml(
                i18n.t("ui.app.admin.synced_to"),
            );
            const syncedPillLabel =
                syncTargetName.length > 0
                    ? syncedToTemplate.includes("{module}")
                        ? syncedToTemplate
                              .split("{module}")
                              .join(syncTargetName)
                        : `${syncedToTemplate} ${syncTargetName}`
                    : "";
            const syncedPill =
                syncTargetGatewayId && syncTargetName.length > 0
                    ? `<a class="state-pill pill-synced synced-pill-link" href="#" data-scroll-to="${escapeHtml(
                          buildScrollTargetId(
                              syncTargetGatewayId,
                              syncTargetAdapterId,
                          ),
                      )}">${syncedPillLabel}</a>`
                    : "";
            return `
        <details class="module-row adapter-inline-row"
          data-adapter-id="${escapeHtml(adapterId)}"
          data-gateway-id="${escapeHtml(gatewayId)}">
          <summary class="adapter-inline-summary">
            <span class="adapter-inline-name"><strong>${escapeHtml(adapter.name ?? adapterId)}</strong></span>
            <div class="module-row-controls adapter-inline-controls">
              <span class="adapter-sync-slot">${syncedPill}</span>
              <span class="state-pill ${isActive ? "pill-active" : "pill-disabled"}">${isActive ? i18n.t("ui.app.admin.state.active") : i18n.t("ui.app.admin.state.disabled")}</span>
              ${renderHealthLight(resolveComponentHealth(healthStatus, "adapter", `${gatewayId}:${adapterId}`) ?? resolveComponentHealth(healthStatus, "adapter", adapterId) ?? (isActive ? { status: "ok" } : null), isActive, escapeHtml)}
              <label class="switch switch--inline" title="${escapeHtml(i18n.t("ui.app.admin.toggle_adapter"))}">
                <input type="checkbox" class="adapter-toggle"
                  data-adapter="${escapeHtml(adapterId)}"
                  data-gateway="${escapeHtml(gatewayId)}"
                  ${isActive ? "checked" : ""}
                  ${isGatewayDisabled || isLocked ? "disabled" : ""} />
                <span class="slider"></span>
              </label>
              <span class="module-chevron" role="button" tabindex="0" data-details-toggle aria-label="${escapeHtml(i18n.t("ui.reuse.details"))}">▾</span>
            </div>
          </summary>
          <div class="module-meta adapter-inline-meta">
            <ul class="module-details">${renderAdapterDetailsList(adapter, adapterId, i18n, escapeHtml)}</ul>
          </div>
        </details>
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

function renderGatewaysContent(gateways, allAdapters, deps) {
    const { i18n, escapeHtml, healthStatus } = deps;
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
    const gatewayById = new Map(
        gateways.map((gateway) => [gateway.id, gateway]),
    );
    const adapterByCompositeKey = new Map(
        allAdapters.map((adapter) => [
            `${adapter._gatewayId}:${resolveAdapterId(adapter)}`,
            adapter,
        ]),
    );

    return gateways
        .map((gateway) => {
            const pill = getStatePill(gateway.status ?? "active", i18n);
            const isEnabled = (gateway.status ?? "active") !== "disabled";
            const isGatewayDisabled = !isEnabled;
            const gatewayAdapters = gateway.hasAdapters
                ? (adaptersByGatewayId.get(gateway.id) ?? [])
                : [];
            const healthLight = renderHealthLight(
                resolveComponentHealth(healthStatus, "gateway", gateway.id),
                isEnabled,
                escapeHtml,
            );

            return `
        <details class="module-row" data-gateway="${escapeHtml(gateway.id)}">
          <summary class="module-row-summary">
            <span class="module-row-title"><strong>${escapeHtml(gateway.name)}</strong></span>
            <div class="module-row-controls">
              <span class="state-pill ${pill.className}">${pill.label}</span>
              ${healthLight}
              <label class="switch switch--inline" title="${escapeHtml(toggleTitle)}">
                <input type="checkbox" data-gateway="${escapeHtml(gateway.id)}" ${isEnabled ? "checked" : ""} ${gateway.required ? "disabled" : ""} />
                <span class="slider"></span>
              </label>
              <span class="module-chevron" role="button" tabindex="0" data-details-toggle aria-label="${escapeHtml(i18n.t("ui.reuse.details"))}">▾</span>
            </div>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderGatewayDetailsList(gateway, gateways, healthStatus, i18n, escapeHtml)}</ul>
            ${renderInlineAdapters(gatewayAdapters, gateway.id, isGatewayDisabled, gatewayById, adapterByCompositeKey, i18n, escapeHtml, healthStatus)}
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
      <div class="integrity-header">
        <h3 class="components-section-heading">${i18n.t("ui.reuse.modules")}</h3>
        <button id="import-module-github" class="btn-confirm btn-animated" type="button">${i18n.t("ui.app.admin.import_module_from_github")}</button>
      </div>
      <div class="components-section-body">
        ${renderModulesContent(modules, gateways, deps)}
      </div>
    </div>
    <div class="components-section">
      <h3 class="components-section-heading">${i18n.t("ui.app.admin.gateways")}</h3>
      <div class="components-section-body">
        ${renderGatewaysContent(gateways, allAdapters, deps)}
      </div>
    </div>
  `;
}

function renderIntegrityContent(integrityRows, i18n) {
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

function renderHealthStatusContent(healthStatus, i18n) {
    if (!healthStatus) return `<p>${i18n.t("ui.app.admin.no_integrity")}</p>`;
    const contributions = Array.isArray(healthStatus.contributions)
        ? healthStatus.contributions
        : [];
    const contributionItems = contributions
        .map(
            (contribution) =>
                `<li class="integrity-${contribution.status ?? "ok"}">${contribution.componentId ?? "component"}: ${contribution.status ?? "unknown"}${contribution.message ? ` — ${contribution.message}` : ""}</li>`,
        )
        .join("");
    return `
      <div class="integrity-module">
        <h3>Core</h3>
        <ul class="integrity-list">
          <li class="integrity-${healthStatus.status ?? "unknown"}">system: ${healthStatus.status ?? "unknown"}</li>
          <li>${i18n.t("ui.app.admin.started")}: ${healthStatus.startedAt ?? "—"}</li>
        </ul>
      </div>
      <div class="integrity-module">
        <h3>${i18n.t("ui.app.admin.components")}</h3>
        <ul class="integrity-list">${contributionItems || `<li>${i18n.t("ui.app.admin.none")}</li>`}</ul>
      </div>
    `;
}

export function renderStatusContent(healthStatus, integrityRows, i18n) {
    return `
      <div class="components-section">
        <h3 class="components-section-heading">${i18n.t("ui.reuse.status")}</h3>
        ${renderHealthStatusContent(healthStatus, i18n)}
      </div>
      <div class="components-section">
        <h3 class="components-section-heading">${i18n.t("ui.reuse.file_integrity")}</h3>
        ${renderIntegrityContent(integrityRows, i18n)}
      </div>
    `;
}
