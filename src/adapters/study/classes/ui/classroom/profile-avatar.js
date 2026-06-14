const log = (...messageParts) => console.warn(...messageParts);

export async function loadProfileAvatarHelpers() {
    try {
        const avatarModule =
            await import("/static/gateways/social/reuse/profile-avatar.js");
        return {
            handleProfileAvatarError:
                typeof avatarModule.handleProfileAvatarError === "function"
                    ? avatarModule.handleProfileAvatarError
                    : null,
            hydrateProfileAvatars:
                typeof avatarModule.hydrateProfileAvatars === "function"
                    ? avatarModule.hydrateProfileAvatars
                    : null,
        };
    } catch (error) {
        log("[classroom] Failed to load profile avatar helpers.", {
            operation: "loadProfileAvatarHelpers",
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            handleProfileAvatarError: null,
            hydrateProfileAvatars: null,
        };
    }
}
