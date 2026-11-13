import { uiCtx } from "/static/reuse/ui-ctx.js";
import { mountShareButton } from "./reuse/share-button.js";

const shareUiGateway = Object.freeze({
    mountTrigger(container, options = {}) {
        const variant = String(options.variant ?? "").trim();
        const button = mountShareButton({
            container,
            onClick: options.onActivate,
            id: options.id,
            className: [
                "btn-animated",
                "share-gateway-trigger",
                variant ? `share-gateway-trigger--${variant}` : "",
            ]
                .filter(Boolean)
                .join(" "),
            title: options.title,
            signal: options.signal,
        });
        return {
            button,
            destroy() {
                button?.remove();
            },
        };
    },
});

uiCtx.capabilities.contribute("share:uiGateway", shareUiGateway);
