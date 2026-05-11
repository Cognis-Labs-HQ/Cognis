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

/**
 * Public factory invoked by the notify gateway's `discoverSenders()` with
 * `process.env`. The internal adapter does not need any environment
 * configuration, so the argument is ignored. The returned sender always
 * resolves its store lazily from the module-level `activeStore`, which
 * `bootstrapNotifyAdapter` upgrades to a `DbInternalNotificationStore` once
 * the database is available — that lazy lookup is what lets notifications
 * persist across logins.
 *
 * Tests that need to inject a specific store should call
 * `createInternalNotificationSenderForTesting(store)` instead. Passing a store
 * here would be incorrect, since the gateway always supplies `process.env`.
 */
export function createNotificationSender(
    _env?: Record<string, string | undefined>,
): NotificationSender {
    return new InternalNotificationSender(null);
}

/**
 * Test-only factory. Returns a sender bound to the supplied store, bypassing
 * the module-level `activeStore`. Production code must use
 * `createNotificationSender` instead so the store can be upgraded by
 * `bootstrapNotifyAdapter`.
 */
export function createInternalNotificationSenderForTesting(
    store: IInternalNotificationStore,
): NotificationSender {
    return new InternalNotificationSender(store);
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
                "DATA_ENCRYPTION_KEY is not set. The internal notification adapter requires a stable server-side encryption key to persist notifications. Generate one with `openssl rand -hex 32` (32 random bytes hex-encoded) and set it as DATA_ENCRYPTION_KEY in the environment.";
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
