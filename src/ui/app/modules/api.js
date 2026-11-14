import { uiCtx } from "../../reuse/ui-ctx.js";
import { apiFetch } from "../../reuse/api-client.js";

const MODULE_INSTALL_POLL_MS = 500;
const uncertainMutations = new WeakMap();

export const moduleMutationUncertainty = (error) =>
    uncertainMutations.get(error);

async function data(response) {
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const detail = payload?.error;
        const error = new Error(
            detail?.message ?? `Request failed with HTTP ${response.status}`,
        );
        error.code = detail?.code;
        error.status = response.status;
        error.conflict = detail?.conflict;
        error.integrityFailures = detail?.integrityFailures;
        error.integrityToken = detail?.integrityToken;
        throw error;
    }
    if (response.status === 204) return null;
    return (await response.json()).data;
}

/** Revalidate displayed marketplace state without downloading unchanged catalogs. */
export async function loadMarketplaceState(
    etag,
    { signal, timeoutMs, suppressConnectionRecoveryToast = false } = {},
) {
    const response = await apiFetch("/api/v1/modules/marketplace-state", {
        signal,
        timeoutMs,
        suppressConnectionRecoveryToast,
        cache: "no-store",
        headers: etag ? { "if-none-match": etag } : {},
    });
    if (response.status === 304) return null;
    return { etag: response.headers.get("etag"), ...(await data(response)) };
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

export async function deleteModuleConfig(moduleId) {
    const response = await apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/config`,
        { method: "DELETE" },
    );
    if (response.status === 404) return null;
    return data(response);
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

export async function loadAvailableModules(
    sourceUuids,
    forceRefresh = false,
    { signal } = {},
) {
    const response = await apiFetch("/api/v1/modules/catalog", {
        method: "POST",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceUuids, forceRefresh }),
    });
    if (!response.ok) await data(response);
    const payload = await response.json();
    return {
        modules: Array.isArray(payload?.data) ? payload.data : [],
        sourceFailures: Array.isArray(payload?.meta?.sourceFailures)
            ? payload.meta.sourceFailures
            : [],
    };
}

export async function saveModuleReleaseChannel(moduleUuid, branch) {
    return data(
        await apiFetch(
            `/api/v1/modules/catalog/${encodeURIComponent(moduleUuid)}/channel`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ branch }),
            },
        ),
    );
}

export async function loadModuleAsset(assetUrl, { signal } = {}) {
    const log = uiCtx.capabilities.get("ui:log");
    try {
        const response = await apiFetch(assetUrl, {
            signal,
            suppressAccessDeniedEvent: true,
        });
        if (!response.ok) {
            log?.("error", "module_image_request_rejected", {
                component: "module-marketplace",
                operation: "loadAsset",
                assetUrl,
                status: response.status,
            });
            return null;
        }
        return URL.createObjectURL(await response.blob());
    } catch (error) {
        if (error?.name === "AbortError") return null;
        log?.("error", "module_image_request_failed", {
            component: "module-marketplace",
            operation: "loadAsset",
            assetUrl,
            reason: error?.message,
        });
        return null;
    }
}

export async function installModule(
    module,
    branch,
    wasEnabled,
    { isCurrent = () => true } = {},
) {
    const check = () => {
        if (!isCurrent()) throw new Error("module_authority_changed");
    };
    let accepted = false;
    let postStatus;
    let terminal = false;
    check();
    try {
        const response = await apiFetch("/api/v1/modules/install", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ module, branch, wasEnabled }),
            suppressConnectionRecoveryToast: true,
        });
        postStatus = response.status;
        accepted = response.ok;
        const job = await data(response);
        check();
        if (typeof job?.jobId !== "string" || !job.jobId)
            throw new Error("module_install_receipt_invalid");
        while (true) {
            await new Promise((resolve) =>
                setTimeout(resolve, MODULE_INSTALL_POLL_MS),
            );
            check();
            const response = await apiFetch(
                `/api/v1/modules/install/${encodeURIComponent(job.jobId)}`,
                {
                    suppressConnectionRecoveryToast: true,
                },
            );
            terminal = response.status === 422;
            const result = await data(response);
            check();
            if (
                result?.status === "succeeded" &&
                result.data &&
                typeof result.data === "object"
            )
                return result.data;
            if (result?.status !== "pending")
                throw new Error("module_install_receipt_invalid");
        }
    } catch (error) {
        if (
            isCurrent() &&
            !terminal &&
            (accepted || !postStatus || postStatus === 408 || postStatus >= 500)
        )
            uncertainMutations.set(error, {
                moduleId: module.id,
                kind: "installation",
            });
        throw error;
    }
}

export async function setModuleEnabled(
    moduleId,
    enabled,
    {
        integrityAcknowledgementToken = "",
        preserveEnabledState = false,
        isCurrent = () => true,
    } = {},
) {
    if (!isCurrent()) throw new Error("module_authority_changed");
    try {
        return await data(
            await apiFetch(
                `/api/v1/modules/${encodeURIComponent(moduleId)}/${enabled ? "enable" : "disable"}`,
                {
                    method: "POST",
                    suppressConnectionRecoveryToast: true,
                    headers: enabled
                        ? {
                              "x-cognis-external-module-disclaimer": "accepted",
                              ...(integrityAcknowledgementToken
                                  ? {
                                        "x-cognis-module-integrity-risk": `accepted:${integrityAcknowledgementToken}`,
                                    }
                                  : {}),
                          }
                        : preserveEnabledState
                          ? { "x-cognis-module-lifecycle": "temporary-update" }
                          : undefined,
                },
            ),
        );
    } catch (error) {
        if (!error?.status || error.status === 408 || error.status >= 500) {
            uncertainMutations.set(error, { moduleId, enabled });
        }
        throw error;
    }
}

export async function uninstallModule(
    moduleUuid,
    { deleteContent = false } = {},
) {
    return data(
        await apiFetch(
            `/api/v1/modules/${encodeURIComponent(moduleUuid)}/uninstall`,
            {
                method: "DELETE",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ deleteContent }),
            },
        ),
    );
}

export async function runModuleConfigAction(moduleId, action, values, signal) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(action.id))
        throw new Error("invalid_config_action");
    const response = await apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/config/${encodeURIComponent(action.id)}`,
        {
            method: "POST",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(values),
        },
    );
    if (action.result !== "audio") return data(response);
    if (!response.ok) throw new Error("module_config_action_failed");
    return response.blob();
}
