import { uiCtx } from "/static/reuse/ui-ctx.js";
import { filesUiClient } from "/static/gateways/files/client.js";

uiCtx.capabilities.contribute(
    "file-render:open",
    async ({ namespaceId, key, rendererId }) => {
        if (rendererId) {
            window.dispatchEvent(
                new CustomEvent("cognis:file-open-with", {
                    detail: { namespaceId, key, rendererId },
                }),
            );
            return { accepted: true, rendererId };
        }
        window.open(
            filesUiClient.resolveNamespacedFileUrl(namespaceId, key),
            "_blank",
            "noopener",
        );
        return { accepted: true, rendererId: null };
    },
);
