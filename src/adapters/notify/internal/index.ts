import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    NotificationEnvelope,
    NotificationSender,
    NotifyAdapterBootstrapCtx,
} from "../../../gateways/notify/gateway.js";
import {
    type IInternalNotificationStore,
    AsyncInternalNotificationStore,
} from "./store.js";
import { DbInternalNotificationStore } from "./reuse/db-store.js";
import { getDataEncryptionKey } from "../../../api/reuse/crypto.js";
import { createInternalNotificationRoutes } from "./routes.js";

const SENDER_ID = "internal";

let activeStore: IInternalNotificationStore =
    new AsyncInternalNotificationStore();

class InternalNotificationSender implements NotificationSender {
    readonly senderId = SENDER_ID;
    readonly senderName = "Internal (In-App)";

    constructor(
        private readonly storeOverride: IInternalNotificationStore | null = null,
    ) {}

    isConfigured(): boolean {
        return true;
    }

    getConfig(): Record<string, unknown> {
        return {};
    }

    async send(envelope: NotificationEnvelope): Promise<void> {
        await (this.storeOverride ?? activeStore).add(envelope);
    }
}

export function createNotificationSender(
    storeOverride?: IInternalNotificationStore,
): NotificationSender {
    return new InternalNotificationSender(storeOverride ?? null);
}

/** @internal For use in tests only. Returns the active notification store. */
export function getActiveStoreForTesting(): IInternalNotificationStore {
    return activeStore;
}

export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    ctx.gateway.registerAlwaysOnSender(SENDER_ID);

    if (ctx.dbExecutor && ctx.dbType) {
        const secret = getDataEncryptionKey();
        if (!secret) {
            const baseMessage =
                "DATA_ENCRYPTION_KEY is not set. The internal notification adapter requires a stable server-side encryption key to persist notifications. Set DATA_ENCRYPTION_KEY to a unique high-entropy secret.";
            const isProduction = process.env.NODE_ENV === "production";
            const fullMessage = isProduction
                ? baseMessage
                : `${baseMessage} Falling back to a per-process random key (data will not survive restarts). This must never happen in production.`;
            ctx.log?.("error", fullMessage, {
                component: "notify-internal",
                fatal: isProduction,
            });
            if (isProduction) {
                throw new Error(baseMessage);
            }
        }
        const dbStore = new DbInternalNotificationStore(
            ctx.dbExecutor,
            ctx.dbType,
            secret,
            ctx.log,
        );
        await dbStore.ensureSchema();
        activeStore = dbStore;
        ctx.log?.(
            "info",
            "Internal notification adapter using database store.",
            {
                component: "notify-internal",
                dbType: ctx.dbType,
            },
        );
    } else {
        ctx.log?.(
            "warn",
            "No database executor available. Internal notifications stored in memory only and will be lost on restart.",
            {
                component: "notify-internal",
            },
        );
    }

    ctx.registerRoute(createInternalNotificationRoutes(activeStore), "notify");

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
