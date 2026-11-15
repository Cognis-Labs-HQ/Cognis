import { apiFetch } from "../../reuse/api-client.js";
import { shouldQueryGatewayAdapters } from "./toggle-flows.js";
import { loadDynamicContribution } from "../../reuse/dynamic-contribution-loader.js";
import { renderStructuredContent } from "../../reuse/structured-content.js";

function normalizeStructuredAdminSection(sectionDefinition) {
    if (!Array.isArray(sectionDefinition.content)) {
        return sectionDefinition;
    }
    return {
        ...sectionDefinition,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: `administration-${sectionDefinition.id}-layout`,
            heading: sectionDefinition.label,
            elements: [
                {
                    id: `${sectionDefinition.id}-content`,
                    label: sectionDefinition.label,
                    pinned: true,
                    render: () =>
                        renderStructuredContent(sectionDefinition.content),
                },
            ],
            onRender: sectionDefinition.onRender,
        },
    };
}

async function readResponse(url, options = {}) {
    const { requireSuccess = false, isCurrent, ...requestOptions } = options;
    const response = await apiFetch(url, requestOptions);
    if (isCurrent?.() === false)
        throw new Error("administration_owner_changed");
    requestOptions.signal?.throwIfAborted();
    if (requireSuccess && !response.ok)
        throw new Error("component_state_unavailable");
    return response;
}

async function loadList(url, options, optional = false) {
    const response = await readResponse(url, options);
    if (optional && !response.ok) return [];
    const payload = await response.json();
    if (options?.requireSuccess && !Array.isArray(payload?.data))
        throw new Error("component_list_unavailable");
    return payload.data ?? [];
}

export async function loadModules(options) {
    return loadList("/api/v1/modules", options);
}

export async function loadIntegrity() {
    return loadList("/api/v1/modules/integrity");
}

export async function loadHealth(options) {
    const response = await readResponse("/api/v1/system/health", options);
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.data ?? null;
}

export async function toggleModule(moduleId, action, options) {
    return apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`,
        { method: "POST", ...options },
    );
}

export async function adapterRequiresSetup(configUrl, options) {
    const response = await readResponse(configUrl, options);
    if (!response.ok) return false;
    const payload = await response.json();
    if (typeof payload.configured === "boolean") {
        return !payload.configured;
    }
    const requiredFields = Array.isArray(payload.requiredFields)
        ? payload.requiredFields
        : [];
    return requiredFields.some((field) => {
        const value = payload.data?.[field]?.effectiveValue;
        return value === undefined || value === null || value === "";
    });
}

export async function importGithubModule(repositoryUrl, versionTag) {
    await apiFetch("/api/v1/modules/import/github", {
        method: "POST",
        body: JSON.stringify({ repositoryUrl, versionTag }),
    });
}

export async function toggleGateway(gatewayId, action, options) {
    return apiFetch(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/${action}`,
        { method: "POST", ...options },
    );
}

export async function loadGateways(options) {
    const gateways = await loadList("/api/v1/gateways", options, true);
    if (
        !Array.isArray(gateways) ||
        gateways.some(
            (gateway) =>
                typeof gateway?.id !== "string" ||
                !gateway.id.trim() ||
                !["active", "disabled"].includes(gateway.status),
        )
    )
        throw new Error("component_gateway_inventory_unavailable");
    return gateways;
}

export async function loadGatewayAdapters(gatewayId, options) {
    const adapters = await loadList(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters`,
        options,
        true,
    );
    if (
        !Array.isArray(adapters) ||
        adapters.some((adapter) => {
            const id = adapter?.senderId ?? adapter?.id;
            const active = adapter?.active ?? adapter?.enabled;
            return (
                typeof id !== "string" ||
                !id.trim() ||
                typeof active !== "boolean"
            );
        })
    )
        throw new Error("component_adapter_inventory_unavailable");
    return adapters;
}

export async function loadAllAdapters(gatewayList, options) {
    const results = await Promise.all(
        gatewayList
            .filter((gateway) => shouldQueryGatewayAdapters(gateway))
            .map(async (gateway) => {
                const adapters = await loadGatewayAdapters(gateway.id, options);
                return adapters.map((adapter) => ({
                    ...adapter,
                    _gatewayId: gateway.id,
                }));
            }),
    );
    return results.flat();
}

export async function loadAdminSections() {
    return loadList("/api/v1/admin/sections", undefined, true);
}

/**
 * Loads and initializes a gateway-contributed administration section module.
 *
 * @param {{ scriptUrl: string, stringsBaseUrl?: string }} section
 * @param {{ i18n: object, extendI18n: (baseI18n: object, stringsBaseUrl?: string) => Promise<object>, escapeHtml: (value: string) => string, openPopup: (...args: unknown[]) => Promise<unknown>, showToast: (...args: unknown[]) => void, onDirtyChange?: (sectionId: string, dirty: boolean) => void }} deps
 * @returns {Promise<object | null>}
 */
export async function loadGatewaySection(
    section,
    { i18n, extendI18n, escapeHtml, openPopup, showToast, onDirtyChange },
) {
    const sectionDef = await loadDynamicContribution(section, {
        exportName: "createAdminSection",
        buildArgs: async (descriptor) => ({
            i18n: await extendI18n(i18n, descriptor.stringsBaseUrl),
            apiFetch,
            escapeHtml,
            openPopup,
            showToast,
            onDirtyChange,
        }),
        onError: () => {},
    });
    if (!sectionDef) return null;
    if (sectionDef.dataReady) {
        await sectionDef.dataReady;
    }
    return normalizeStructuredAdminSection(sectionDef);
}
