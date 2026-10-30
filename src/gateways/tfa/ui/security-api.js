export async function loadTfaStatus(apiFetch) {
    const response = await apiFetch("/api/v1/tfa/methods").catch(() => null);
    if (!response?.ok) {
        return {
            availableMethods: [],
            enabledMethods: [],
            preferredMethodIds: [],
            requiresSetup: false,
        };
    }
    const payload = await response.json().catch(() => null);
    return (
        payload?.data ?? {
            availableMethods: [],
            enabledMethods: [],
            preferredMethodIds: [],
            requiresSetup: false,
        }
    );
}

export async function beginTfaSetup(apiFetch, methodId) {
    const response = await apiFetch(
        `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/setup/begin`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
        },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        return {
            errorMessage:
                payload?.error?.message ?? payload?.error?.code ?? null,
        };
    }
    return payload?.data ?? null;
}

export async function verifyTfaSetup(
    apiFetch,
    methodId,
    setupId,
    verification,
) {
    const response = await apiFetch(
        `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/setup/verify`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ setupId, verification }),
        },
    );
    const payload = await response.json().catch(() => null);
    if (response.ok) {
        const responseData = payload?.data;
        const refreshedToken =
            typeof responseData?.token === "string" ? responseData.token : "";
        if (refreshedToken) {
            localStorage.setItem("cognis_access_token", refreshedToken);
        }
        if (typeof responseData?.accountId === "string") {
            localStorage.setItem("cognis_account", responseData.accountId);
        }
        if (typeof responseData?.role === "string") {
            localStorage.setItem("cognis_role", responseData.role);
        }
        if (typeof responseData?.providerId === "string") {
            localStorage.setItem("cognis_provider_id", responseData.providerId);
        }
        return { ok: true };
    }
    return {
        ok: false,
        message: payload?.error?.message ?? null,
    };
}

export async function cancelTfaSetup(apiFetch, methodId, setupId) {
    await apiFetch(
        `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/setup/cancel`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ setupId }),
        },
    );
}

export async function disableTfaMethod(apiFetch, methodId) {
    await apiFetch(
        `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/disable`,
        { method: "POST" },
    );
}

export async function enableTfaMethod(apiFetch, methodId) {
    const response = await apiFetch(
        `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/enable`,
        { method: "POST" },
    );
    return response.ok;
}

export async function loadTfaMethodDetails(apiFetch, methodId) {
    const response = await apiFetch(
        `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/details`,
    );
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.data?.details ?? null;
}

export async function savePreferredTfaMethods(apiFetch, methodIds) {
    await apiFetch("/api/v1/tfa/methods/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ methodIds }),
    });
}

export async function rotateRecoveryCodes(apiFetch) {
    const response = await apiFetch("/api/v1/tfa/recovery-codes/rotate", {
        method: "POST",
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.data?.recoveryCodes ?? null;
}

export async function loadRecoveryCodesStatus(apiFetch) {
    const response = await apiFetch("/api/v1/tfa/recovery-codes").catch(
        () => null,
    );
    if (!response?.ok) {
        return {
            codes: [],
            totalCount: 0,
            usedCount: 0,
            remainingCount: 0,
            lowThreshold: 2,
        };
    }
    const payload = await response.json().catch(() => null);
    const data = payload?.data;
    if (!data || typeof data !== "object") {
        return {
            codes: [],
            totalCount: 0,
            usedCount: 0,
            remainingCount: 0,
            lowThreshold: 2,
        };
    }
    const codes = Array.isArray(data.codes) ? data.codes : [];
    return {
        codes: codes.map((entry) => ({
            id: String(entry.id ?? ""),
            label: String(entry.label ?? ""),
            used: entry.used === true,
            usedAt:
                typeof entry.usedAt === "string" && entry.usedAt.trim()
                    ? entry.usedAt
                    : null,
        })),
        totalCount: Number(data.totalCount ?? 0),
        usedCount: Number(data.usedCount ?? 0),
        remainingCount: Number(data.remainingCount ?? 0),
        lowThreshold: Number(data.lowThreshold ?? 2),
    };
}
