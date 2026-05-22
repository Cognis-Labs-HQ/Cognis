import { apiFetch } from "../../reuse/api-client.js";
import { shouldQueryGatewayAdapters } from "./toggle-flows.js";

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

export async function toggleModule(moduleId, action) {
    await apiFetch(`/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`, { method: "POST" });
}

export async function toggleGateway(gatewayId, action) {
    await apiFetch(`/api/v1/gateways/${encodeURIComponent(gatewayId)}/${action}`, { method: "POST" });
}

export async function loadGateways() {
    return loadListSafe("/api/v1/gateways");
}

export async function loadGatewayAdapters(gatewayId) {
    return loadListSafe(`/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters`);
}

export async function loadAllAdapters(gatewayList) {
    const results = await Promise.all(
        gatewayList
            .filter((gateway) => shouldQueryGatewayAdapters(gateway))
            .map(async (gateway) => {
                const adapters = await loadGatewayAdapters(gateway.id);
                return adapters.map((adapter) => ({ ...adapter, _gatewayId: gateway.id }));
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
export async function loadGatewaySection(section, { i18n, extendI18n, escapeHtml, openPopup, showToast }) {
    try {
        const sectionModule = await import(section.scriptUrl);
        if (typeof sectionModule.createAdminSection !== "function") return null;
        const sectionI18n = await extendI18n(i18n, section.stringsBaseUrl);
        const sectionDef = sectionModule.createAdminSection({ i18n: sectionI18n, apiFetch, escapeHtml, openPopup, showToast });
        if (sectionDef.dataReady) await sectionDef.dataReady;
        return sectionDef;
    } catch {
        return null;
    }
}
