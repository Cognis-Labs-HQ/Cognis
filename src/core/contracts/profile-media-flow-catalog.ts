export const PROFILE_MEDIA_FLOW_CATALOG = Object.freeze([
    {
        id: "upload-profile-media",
        owner: "social-profile",
        description:
            "Uploads profile media through staged validation, persistence, and downstream event fan-out.",
        stages: [
            {
                id: "validate-upload",
                description:
                    "Validate media metadata, caller ownership, and upload constraints before persistence.",
            },
            {
                id: "persist-media",
                description:
                    "Store media bytes and persist the resulting profile media key update.",
            },
            {
                id: "emit-events",
                description:
                    "Emit post-upload profile media events for listeners and downstream integrations.",
            },
        ],
    },
    {
        id: "remove-profile-media",
        owner: "social-profile",
        description:
            "Removes profile media through staged validation, persistence, and downstream event fan-out.",
        stages: [
            {
                id: "validate-removal",
                description:
                    "Validate media target metadata and caller ownership before removal starts.",
            },
            {
                id: "persist-removal",
                description:
                    "Delete stored media and persist profile media-key removal.",
            },
            {
                id: "emit-events",
                description:
                    "Emit post-removal profile media events for listeners and downstream integrations.",
            },
        ],
    },
]);
