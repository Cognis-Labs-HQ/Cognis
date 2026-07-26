import type { ShareMethodAdapter } from "../../../gateways/share/gateway/index.js";

export function createShareAdapter(): ShareMethodAdapter {
    return {
        id: "user",
        name: "User",
        description: "Grant access directly to Cognis users.",
        pageModuleUrl: "/static/adapters/share/user/page.js",
        order: 20,
        prepare(input) {
            const recipients = Array.isArray(input.recipients)
                ? input.recipients
                : input.accessControls?.recipients;
            if (!Array.isArray(recipients) || recipients.length === 0) {
                throw new Error("share_recipient_required");
            }
            return {
                accessControls: {
                    ...(input.accessControls ?? {}),
                    recipients,
                },
            };
        },
    };
}
