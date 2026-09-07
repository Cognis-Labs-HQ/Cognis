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

async function loadList(url) {
    const response = await apiFetch(url);
    const payload = await response.json();
    return payload.data ?? [];
}

async function loadListSafe(url) {
    const response = await apiFetch(url);
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

export async function loadModules() {
    return loadList("/api/v1/modules");
}

export async function loadIntegrity() {
    return loadList("/api/v1/modules/integrity");
}

export async function loadHealth() {
    const response = await apiFetch("/api/v1/system/health");
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.data ?? null;
}

export async function toggleModule(moduleId, action) {
    return apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`,
        { method: "POST" },
    );
}

export async function adapterRequiresSetup(configUrl) {
    const response = await apiFetch(configUrl);
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

export async function toggleGateway(gatewayId, action) {
    await apiFetch(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/${action}`,
        { method: "POST" },
    );
}

export async function loadGateways() {
    return loadListSafe("/api/v1/gateways");
}

export async function loadGatewayAdapters(gatewayId) {
    return loadListSafe(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters`,
    );
}

export async function loadAllAdapters(gatewayList) {
    const results = await Promise.all(
        gatewayList
            .filter((gateway) => shouldQueryGatewayAdapters(gateway))
            .map(async (gateway) => {
                const adapters = await loadGatewayAdapters(gateway.id);
                return adapters.map((adapter) => ({
                    ...adapter,
                    _gatewayId: gateway.id,
                }));
            }),
    );
    return results.flat();
}

export async function loadAdminSections() {
    return loadListSafe("/api/v1/admin/sections");
}

/**
 * Loads and initializes a gateway-contributed administration section module.
 *
 * @param {{ scriptUrl: string, stringsBaseUrl?: string }} section
 * @param {{ i18n: object, extendI18n: (baseI18n: object, stringsBaseUrl?: string) => Promise<object>, escapeHtml: (value: string) => string, openPopup: (...args: unknown[]) => Promise<unknown>, showToast: (...args: unknown[]) => void }} deps
 * @returns {Promise<object | null>}
 */
export async function loadGatewaySection(
    section,
    { i18n, extendI18n, escapeHtml, openPopup, showToast },
) {
    const sectionDef = await loadDynamicContribution(section, {
        exportName: "createAdminSection",
        buildArgs: async (descriptor) => ({
            i18n: await extendI18n(i18n, descriptor.stringsBaseUrl),
            apiFetch,
            escapeHtml,
            openPopup,
            showToast,
        }),
        onError: () => {},
    });
    if (!sectionDef) return null;
    if (sectionDef.dataReady) {
        await sectionDef.dataReady;
    }
    return normalizeStructuredAdminSection(sectionDef);
}
