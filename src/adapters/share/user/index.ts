import type { ShareMethodAdapter } from "../../../gateways/share/gateway/index.js";

export function createShareAdapter(): ShareMethodAdapter {
    return {
        id: "user",
        name: "User",
        description: "Grant access directly to Cognis users.",
        nameKey: "adapter.share.user.name",
        descriptionKey: "adapter.share.user.description",
        pageModuleUrl: "/static/adapters/share/user/page.js",
        order: 20,
        delivery: "account",
        deliveryPage: {
            id: "account-share-view",
            pattern: "^/share/usr_[^/]+$",
            document: "user-share.html",
            scriptUrl: "/static/gateways/share/ui/app/account-share/index.js",
            access: { minRole: "user" },
        },
        validateUnique({ accessControls, existingAccessControls }) {
            const requestedRecipientIds = new Set(
                (accessControls.recipients ?? [])
                    .filter((recipient) => recipient.type === "user")
                    .map((recipient) => recipient.id),
            );
            const duplicateExists = existingAccessControls.some((existing) =>
                existing.recipients.some(
                    (recipient) =>
                        recipient.type === "user" &&
                        requestedRecipientIds.has(recipient.id),
                ),
            );
            if (duplicateExists) throw new Error("duplicate_user_share");
        },
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
