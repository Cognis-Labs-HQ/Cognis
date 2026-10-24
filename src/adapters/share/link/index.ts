import type { ShareMethodAdapter } from "../../../gateways/share/gateway/index.js";

export function createShareAdapter(): ShareMethodAdapter {
    return {
        id: "link",
        name: "Link",
        description: "Create a link that can be sent outside Cognis.",
        nameKey: "adapter.share.link.name",
        descriptionKey: "adapter.share.link.description",
        pageModuleUrl: "/static/adapters/share/link/page.js",
        order: 10,
        delivery: "public",
        deliveryPage: {
            id: "share-link-view",
            pattern: "^/share/shr_[^/]+$",
            document: "share.html",
            scriptUrl: "/static/gateways/share/ui/app/index.js",
        },
        prepare(input) {
            return {
                accessControls: {
                    ...(input.accessControls ?? {}),
                    recipients: [],
                },
            };
        },
    };
}
