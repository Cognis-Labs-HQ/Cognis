import { apiFetch } from "/static/reuse/api-client.js";

export const profileUiClient = Object.freeze({
    getCurrentProfile() {
        return apiFetch("/api/v1/social/profile");
    },
});
