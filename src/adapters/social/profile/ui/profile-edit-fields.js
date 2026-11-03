import {
    PROFILE_DISPLAY_NAME_MAX_CHARACTERS,
    PROFILE_BIO_MAX_CHARACTERS,
    PROFILE_LOCATION_MAX_CHARACTERS,
    PROFILE_WEBSITE_MAX_CHARACTERS,
} from "./profile-config.js";

/** Describe Profile fields with the owning component’s limits and role restrictions. */
export function createProfileEditFields(profile, i18n) {
    const currentBio = profile?.bio ?? "";
    const currentLocation = profile?.location ?? "";
    const currentWebsite = profile?.website ?? "";
    const currentVisibility = profile?.visibility ?? "hidden";
    const currentDisplayName = profile?.displayName ?? "";
    const profileRequiresDiscoverableVisibility = [
        "teacher",
        "admin",
        "owner",
    ].includes(profile?.role);
    return [
        {
            name: "displayName",
            required: true,
            labelKey: "ui.app.profile.display_name",
            value: currentDisplayName,
            maxCharacters: PROFILE_DISPLAY_NAME_MAX_CHARACTERS,
            attributes: {
                id: "popup-edit-display-name",
            },
        },
        {
            name: "bio",
            labelKey: "ui.app.profile.bio",
            type: "textarea",
            value: currentBio,
            maxCharacters: PROFILE_BIO_MAX_CHARACTERS,
            attributes: {
                rows: 3,
            },
        },
        {
            name: "location",
            labelKey: "ui.app.profile.location",
            value: currentLocation,
            maxCharacters: PROFILE_LOCATION_MAX_CHARACTERS,
            attributes: {
                id: "popup-edit-location",
            },
        },
        {
            name: "website",
            labelKey: "ui.app.profile.website",
            type: "url",
            value: currentWebsite,
            maxCharacters: PROFILE_WEBSITE_MAX_CHARACTERS,
            attributes: {
                id: "popup-edit-website",
            },
        },
        {
            name: "visibility",
            labelKey: "ui.app.profile.visibility",
            type: "select",
            value: currentVisibility,
            attributes: {
                id: "popup-edit-visibility",
            },
            options: ["hidden", "private", "friends", "community"].map(
                (visibilityOption) => {
                    const isRestrictedForProfileRole =
                        profileRequiresDiscoverableVisibility &&
                        (visibilityOption === "hidden" ||
                            visibilityOption === "private");
                    return {
                        value: visibilityOption,
                        label: i18n.t(
                            `ui.app.profile.visibility.${visibilityOption}`,
                        ),
                        disabled: isRestrictedForProfileRole,
                    };
                },
            ),
        },
    ];
}
