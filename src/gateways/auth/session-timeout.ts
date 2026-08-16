export const LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY =
    "login-session-timeout-minutes";

export const LOGIN_SESSION_TIMEOUT_USE_GLOBAL = "global";

const DEFAULT_LOGIN_SESSION_TIMEOUT_MINUTES = 720;

export function parseLoginSessionTimeoutMinutes(value: unknown): number {
    return Number.isInteger(value) && Number(value) >= 0
        ? Number(value)
        : DEFAULT_LOGIN_SESSION_TIMEOUT_MINUTES;
}

export function resolveLoginSessionTimeoutPreference(
    stored: string | null | undefined,
    maximumMinutes: number,
): { timeoutMinutes: number; shouldPersist: boolean } {
    const requestedMinutes = Number(stored);
    const hasPersonalTimeout =
        stored !== LOGIN_SESSION_TIMEOUT_USE_GLOBAL &&
        Number.isInteger(requestedMinutes) &&
        requestedMinutes >= 0;
    let timeoutMinutes = maximumMinutes;
    if (hasPersonalTimeout && maximumMinutes === 0) {
        timeoutMinutes = requestedMinutes;
    } else if (hasPersonalTimeout && requestedMinutes > 0) {
        timeoutMinutes = Math.min(requestedMinutes, maximumMinutes);
    }
    return {
        timeoutMinutes,
        shouldPersist: stored !== String(timeoutMinutes),
    };
}
