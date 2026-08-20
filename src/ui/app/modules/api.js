import { apiFetch } from "../../reuse/api-client.js";

const MODULE_INSTALL_TIMEOUT_MS = 2 * 60 * 1000;
const MODULE_INSTALL_POLL_MS = 500;

async function data(response) {
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const detail = payload?.error;
        const error = new Error(
            detail?.message ?? `Request failed with HTTP ${response.status}`,
        );
        error.code = detail?.code;
        error.status = response.status;
        throw error;
    }
    if (response.status === 204) return null;
    return (await response.json()).data;
}

export async function loadInstalledModules() {
    return data(await apiFetch("/api/v1/modules"));
}

export async function loadModuleConfig(moduleId) {
    return data(
        await apiFetch(
            `/api/v1/modules/${encodeURIComponent(moduleId)}/config`,
        ),
    );
}

export async function saveModuleConfig(moduleId, values) {
    return data(
        await apiFetch(
            `/api/v1/modules/${encodeURIComponent(moduleId)}/config`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(values),
            },
        ),
    );
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

export async function validateModuleSourceCredential(source, token) {
    return data(
        await apiFetch("/api/v1/modules/sources/validate-credential", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ source, token }),
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

export async function loadAvailableModules(
    tokens,
    sourceUuids,
    forceRefresh = false,
) {
    return data(
        await apiFetch("/api/v1/modules/catalog", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tokens, sourceUuids, forceRefresh }),
        }),
    );
}

export async function loadCachedModules() {
    return data(await apiFetch("/api/v1/modules/catalog"));
}

export async function installModule(module, token, branch, wasEnabled) {
    const job = await data(
        await apiFetch("/api/v1/modules/install", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ module, token, branch, wasEnabled }),
            timeoutMs: MODULE_INSTALL_TIMEOUT_MS,
            suppressConnectionRecoveryToast: true,
        }),
    );
    const deadline = Date.now() + MODULE_INSTALL_TIMEOUT_MS;
    while (Date.now() < deadline) {
        await new Promise((resolve) =>
            setTimeout(resolve, MODULE_INSTALL_POLL_MS),
        );
        const response = await apiFetch(
            `/api/v1/modules/install/${encodeURIComponent(job.jobId)}`,
            { suppressConnectionRecoveryToast: true },
        );
        const result = await data(response);
        if (result.status === "succeeded") return result.data;
    }
    const error = new Error("module_install_timeout");
    error.code = "module_install_timeout";
    if (new URL(module.cloneUrl).hostname === "github.com") {
        error.code = "github_connection_timeout";
    }
    throw error;
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
