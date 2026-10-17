import { apiFetch } from "/static/reuse/api-client.js";

export const profileUiClient = Object.freeze({
    getProfile(handle) {
        return apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
        );
    },
    getCurrentProfile() {
        return apiFetch("/api/v1/social/profile");
    },
});
