export const LOGIN_SESSION_TIMEOUT_PREFERENCE_KEY =
    "login-session-timeout-minutes";

export const LOGIN_SESSION_TIMEOUT_USE_GLOBAL = "global";

const DEFAULT_LOGIN_SESSION_TIMEOUT_MINUTES = 720;

export function parseLoginSessionTimeoutMinutes(value: unknown): number {
    return Number.isInteger(value) && Number(value) >= 0
        ? Number(value)
        : DEFAULT_LOGIN_SESSION_TIMEOUT_MINUTES;
}
