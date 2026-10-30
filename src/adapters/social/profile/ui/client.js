import { profileFetch as apiFetch } from "./offline-client.js";

export const profileUiClient = Object.freeze({
    getProfile(handle) {
        return apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
        );
    },
    updateProfile({ displayName, bio, location, website, visibility }) {
        return apiFetch("/api/v1/social/profile", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                displayName,
                bio,
                location,
                website,
                visibility,
            }),
        });
    },
    getCurrentProfile() {
        return apiFetch("/api/v1/social/profile");
    },
});
