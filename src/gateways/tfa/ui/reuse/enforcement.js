import { apiFetch } from "../../../../ui/reuse/api-client.js";

const SECURITY_SETTINGS_PATH = "/settings#security";
const TFA_ENFORCEMENT_CACHE_TTL_MS = 5_000;

let tfaEnforcementCacheExpiresAt = 0;
let tfaEnforcementRequiresSetup = false;

export function invalidateTfaSetupRequirementCache() {
    tfaEnforcementCacheExpiresAt = 0;
    tfaEnforcementRequiresSetup = false;
}

export async function readTfaSetupRequirement() {
    if (Date.now() < tfaEnforcementCacheExpiresAt) {
        return tfaEnforcementRequiresSetup;
    }
    const token = localStorage.getItem("cognis_access_token");
    if (!token) {
        tfaEnforcementRequiresSetup = false;
        tfaEnforcementCacheExpiresAt =
            Date.now() + TFA_ENFORCEMENT_CACHE_TTL_MS;
        return false;
    }
    try {
        const response = await apiFetch("/api/v1/tfa/status");
        if (!response.ok) {
            tfaEnforcementRequiresSetup = false;
            tfaEnforcementCacheExpiresAt =
                Date.now() + TFA_ENFORCEMENT_CACHE_TTL_MS;
            return false;
        }
        const payload = await response.json().catch(() => null);
        tfaEnforcementRequiresSetup = payload?.data?.requiresSetup === true;
        tfaEnforcementCacheExpiresAt =
            Date.now() + TFA_ENFORCEMENT_CACHE_TTL_MS;
        return tfaEnforcementRequiresSetup;
    } catch {
        tfaEnforcementRequiresSetup = false;
        tfaEnforcementCacheExpiresAt =
            Date.now() + TFA_ENFORCEMENT_CACHE_TTL_MS;
        return false;
    }
}

export async function enforceTfaSetupIfRequired() {
    const requiresSetup = await readTfaSetupRequirement();
    if (!requiresSetup) {
        return false;
    }
    const normalizedHash =
        typeof window.location.hash === "string"
            ? window.location.hash.toLowerCase()
            : "";
    const isSecuritySettingsRoute =
        window.location.pathname === "/settings" &&
        normalizedHash === "#security";
    if (isSecuritySettingsRoute) {
        return false;
    }
    window.location.replace(SECURITY_SETTINGS_PATH);
    return true;
}
