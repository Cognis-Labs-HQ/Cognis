import type { ShareMethodAdapter } from "../../../gateways/share/gateway/index.js";

export function createShareAdapter(): ShareMethodAdapter {
    return {
        id: "link",
        nameKey: "adapter.share.link.name",
        descriptionKey: "adapter.share.link.description",
        pageModuleUrl: "/static/adapters/share/link/page.js",
        order: 10,
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
