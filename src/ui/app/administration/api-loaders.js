import { apiFetch } from "../../reuse/api-client.js";
import { shouldQueryGatewayAdapters } from "./toggle-flows.js";

export async function loadModules() {
    const response = await apiFetch("/api/v1/modules");
    const payload = await response.json();
    return payload.data ?? [];
}

export async function loadIntegrity() {
    const response = await apiFetch("/api/v1/modules/integrity");
    const payload = await response.json();
    return payload.data ?? [];
}

export async function toggleModule(moduleId, action) {
    await apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`,
        {
            method: "POST",
        },
    );
}

export async function toggleGateway(gatewayId, action) {
    await apiFetch(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/${action}`,
        {
            method: "POST",
        },
    );
}

export async function loadGateways() {
    const response = await apiFetch("/api/v1/gateways");
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

export async function loadGatewayAdapters(gatewayId) {
    const response = await apiFetch(
        `/api/v1/gateways/${encodeURIComponent(gatewayId)}/adapters`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
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
    const response = await apiFetch("/api/v1/admin/sections");
    if (!response.ok) return [];
    const payload = await response.json();
    return payload.data ?? [];
}

export async function loadGatewaySection(
    section,
    { i18n, extendI18n, escapeHtml, openPopup, showToast },
) {
    try {
        const sectionModule = await import(section.scriptUrl);
        if (typeof sectionModule.createAdminSection !== "function") return null;
        const sectionI18n = await extendI18n(i18n, section.stringsBaseUrl);
        const sectionDef = sectionModule.createAdminSection({
            i18n: sectionI18n,
            apiFetch,
            escapeHtml,
            openPopup,
            showToast,
        });
        if (sectionDef.dataReady) await sectionDef.dataReady;
        return sectionDef;
    } catch {
        return null;
    }
}
