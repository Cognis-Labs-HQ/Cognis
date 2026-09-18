import path from "node:path";
import { readFile } from "node:fs/promises";
import { type GatewayBootstrapContext } from "../../shared.js";
import type { ServerResponse } from "node:http";
import type { DbExecutor } from "../../db/reuse/db-executor.js";

export interface NotificationUserEmailStore {
    getUserEmails(
        accountId: string,
    ): Promise<Array<{ email: string; primary: boolean; verified: boolean }>>;
    addUserEmail(
        accountId: string,
        email: string,
        isPrimary?: boolean,
    ): Promise<void>;
    removeUserEmail(accountId: string, email: string): Promise<void>;
    removeUnverifiedEmail(accountId: string, email: string): Promise<void>;
    isEmailRegisteredByOtherUser(
        email: string,
        excludeAccountId: string,
    ): Promise<boolean>;
    setPrimaryEmail(accountId: string, email: string): Promise<void>;
    verifyUserEmail(accountId: string, email: string): Promise<void>;
    upsertVerifiedPrimaryEmail(accountId: string, email: string): Promise<void>;
    getPrimaryEmail(accountId: string): Promise<string | null>;
    hasVerifiedEmail(accountId: string): Promise<boolean>;
    isEmailRegistered(email: string): Promise<boolean>;
}

interface NotificationStoreWithSchema extends NotificationUserEmailStore {
    ensureSchema(): Promise<void>;
    getConfig(senderId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
    getSenderIds(
        recipientUsername: string,
        category: string,
    ): Promise<string[]>;
}

interface NotificationPreferenceStoreCtor {
    new (store: NotificationStoreWithSchema): {
        getSenderIds(
            recipientUsername: string,
            category: string,
        ): Promise<string[]>;
    };
}

export async function serveHtmlPage(
    res: ServerResponse,
    filePath: string,
): Promise<void> {
    try {
        const file = await readFile(filePath);
        res.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            "x-frame-options": "DENY",
            "referrer-policy": "no-referrer",
        });
        res.end(file);
    } catch {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                error: {
                    code: "not_found",
                    message: "Page not found.",
                },
            }),
        );
    }
}

export async function loadNotificationStores(
    ctx: GatewayBootstrapContext,
): Promise<{
    dbExecutor: DbExecutor;
    notifStore: NotificationStoreWithSchema;
    notificationPrefStore: {
        getSenderIds(
            recipientUsername: string,
            category: string,
        ): Promise<string[]>;
    };
}> {
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");
    const notificationStoreModulePath = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "notify",
        "notification-store.ts",
    );
    const notificationStoreModule = await import(
        `${notificationStoreModulePath}?t=${Date.now()}`
    );
    const NotificationStoreClass =
        notificationStoreModule.DbNotificationStore as
            | (new (dbExecutor: DbExecutor) => NotificationStoreWithSchema)
            | undefined;
    const NotificationPreferenceStoreClass =
        notificationStoreModule.DbNotificationPreferenceStore as
            | NotificationPreferenceStoreCtor
            | undefined;
    if (!NotificationStoreClass || !NotificationPreferenceStoreClass) {
        throw new Error("notification_store_gateway_exports_missing");
    }
    const notifStore = new NotificationStoreClass(dbExecutor);
    const notificationPrefStore = new NotificationPreferenceStoreClass(
        notifStore,
    );
    return { dbExecutor, notifStore, notificationPrefStore };
}
