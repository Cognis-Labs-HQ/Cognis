/**
 * Resolves SMTP notification adapter availability for dashboard UI flows.
 *
 * Public exports:
 *   isSmtpAdapterActive(apiFetchFn) — returns true when the notify SMTP adapter
 *   is currently active/enabled.
 *
 * Usage:
 *   const smtpActive = await isSmtpAdapterActive(apiFetch);
 *
 * @param {(path: string, options?: RequestInit) => Promise<Response>} apiFetchFn
 * @returns {Promise<boolean>}
 */
export async function isSmtpAdapterActive(apiFetchFn) {
    try {
        const response = await apiFetchFn("/api/v1/gateways/notify/adapters");
        if (!response.ok) return false;
        const payload = await response.json();
        const adapters = Array.isArray(payload?.data) ? payload.data : [];
        return adapters.some(
            (adapter) =>
                (adapter.senderId === "smtp" || adapter.id === "smtp") &&
                (adapter.active === true || adapter.enabled === true),
        );
    } catch {
        return false;
    }
}
