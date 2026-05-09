import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    NotificationEnvelope,
    NotificationSender,
    NotifyAdapterBootstrapCtx,
} from "../../../gateways/notify/gateway.js";
import { InternalNotificationStore } from "./store.js";
import { createInternalNotificationRoutes } from "./routes.js";

const SENDER_ID = "internal";

const store = new InternalNotificationStore();

class InternalNotificationSender implements NotificationSender {
    readonly senderId = SENDER_ID;
    readonly senderName = "Internal (In-App)";

    isConfigured(): boolean {
        return true;
    }

    getConfig(): Record<string, unknown> {
        return {};
    }

    async send(envelope: NotificationEnvelope): Promise<void> {
        store.add(envelope);
    }
}

export function createNotificationSender(): NotificationSender {
    return new InternalNotificationSender();
}

export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    ctx.gateway.registerAlwaysOnSender(SENDER_ID);

    ctx.registerRoute(createInternalNotificationRoutes(store), "notify");

    const uiDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "ui",
    );
    ctx.registerStaticDir("notify-internal", uiDir);
    ctx.registerNavbarPlugin(
        "/static/gateways/notify-internal/navbar-plugin.js",
    );

    ctx.log?.("info", "Internal notification adapter bootstrapped.", {
        component: "notify-internal",
    });
}
