import { apiFetch } from "../../reuse/api-client.js";

const MODULE_INSTALL_TIMEOUT_MS = 2 * 60 * 1000;

async function data(response) {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (response.status === 204) return null;
    return (await response.json()).data;
}

export async function loadInstalledModules() {
    return data(await apiFetch("/api/v1/modules"));
}

export async function loadModuleSources() {
    return data(await apiFetch("/api/v1/modules/sources"));
}

export async function loadModuleMarketplaceSettings() {
    return data(await apiFetch("/api/v1/modules/settings"));
}

export async function saveModuleMarketplaceSettings(settings) {
    return data(
        await apiFetch("/api/v1/modules/settings", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(settings),
        }),
    );
}

export async function saveModuleSource(source) {
    return data(
        await apiFetch("/api/v1/modules/sources", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(source),
        }),
    );
}

export async function removeModuleSource(uuid) {
    return data(
        await apiFetch(`/api/v1/modules/sources/${encodeURIComponent(uuid)}`, {
            method: "DELETE",
        }),
    );
}

export async function loadAvailableModules(tokens, sourceUuids) {
    return data(
        await apiFetch("/api/v1/modules/catalog", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tokens, sourceUuids }),
        }),
    );
}

export async function loadCachedModules() {
    return data(await apiFetch("/api/v1/modules/catalog"));
}

export async function installModule(module, token, branch) {
    return data(
        await apiFetch("/api/v1/modules/install", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ module, token, branch }),
            timeoutMs: MODULE_INSTALL_TIMEOUT_MS,
            suppressConnectionRecoveryToast: true,
        }),
    );
}

export async function setModuleEnabled(moduleId, enabled) {
    return data(
        await apiFetch(
            `/api/v1/modules/${encodeURIComponent(moduleId)}/${enabled ? "enable" : "disable"}`,
            {
                method: "POST",
                headers: enabled
                    ? { "x-cognis-external-module-disclaimer": "accepted" }
                    : undefined,
            },
        ),
    );
}

export async function uninstallModule(moduleUuid) {
    return data(
        await apiFetch(
            `/api/v1/modules/${encodeURIComponent(moduleUuid)}/uninstall`,
            { method: "DELETE" },
        ),
    );
}
