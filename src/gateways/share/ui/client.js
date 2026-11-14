import { apiFetch } from "/static/reuse/api-client.js";

export const shareUiClient = Object.freeze({
    getGuestProfile() {
        return apiFetch("/api/v1/share/guest-profile");
    },
});
