import {
    DbNotificationStore,
    DbNotificationPreferenceStore,
} from "../notification-store.js";
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
    notifStore: DbNotificationStore;
    notificationPrefStore: {
        getSenderIds(
            recipientUsername: string,
            category: string,
        ): Promise<string[]>;
    };
}> {
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");
    const notifStore = new DbNotificationStore(dbExecutor);
    const notificationPrefStore = new DbNotificationPreferenceStore(notifStore);
    return { dbExecutor, notifStore, notificationPrefStore };
}
