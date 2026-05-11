/**
 * Authenticated fetch wrapper. Reads the Bearer token from localStorage
 * and attaches it as an Authorization header on every request.
 *
 * Usage:
 *   const res = await apiFetch('/api/v1/users');
 *   const res = await apiFetch('/api/v1/items', { method: 'POST', ... });
 *
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem("cognis_access_token");
    const headers = {
        ...(options.headers ?? {}),
    };
    if (token) {
        headers.authorization = `Bearer ${token}`;
    }
    return fetch(path, { ...options, headers });
}
