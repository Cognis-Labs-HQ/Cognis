import type { IncomingMessage, ServerResponse } from "node:http";
import type { AccessRole } from "@cognis/core";
import { createUserRoutes } from "../../../routes/users/index.js";
import { VolatileUserPreferenceStore } from "../../../reuse/preference-store.js";
import { TestAccountStore } from "./accounts.js";
import { makeRouteContext, type ContextOptions } from "./context.js";
import { issueAccessToken } from "./sessions.js";

export const managementActions = [
    { method: "POST", action: "role", body: { role: "user" } },
    { method: "POST", action: "password", body: { password: "fixture-only" } },
    { method: "POST", action: "enable", body: {} },
    { method: "POST", action: "disable", body: {} },
    { method: "POST", action: "dearchive", body: {} },
    { method: "POST", action: "isfounder", body: { isFounder: true } },
    { method: "POST", action: "preferences/clear", body: {} },
    { method: "DELETE", action: "", body: {} },
] as const;

interface HarnessOptions extends ContextOptions {
    onProfileRole?: () => void | Promise<void>;
    onProfileVisibility?: () => void | Promise<void>;
}

export async function createHarness(options: HarnessOptions = {}) {
    const accounts = new TestAccountStore();
    await accounts.register("target", "fixture-only", "user");
    const context = await makeRouteContext(accounts, options);
    const preferences = new VolatileUserPreferenceStore();
    const activity: string[] = [];
    const logs: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    preferences.clearUser = async () => {
        activity.push("clearPreferences");
    };
    const route = createUserRoutes(
        accounts,
        preferences,
        async () => {
            activity.push("profileRole");
            await options.onProfileRole?.();
        },
        (level, message, meta) => {
            logs.push({ level, message, meta });
        },
        undefined,
        async () => {
            activity.push("profileVisibility");
            await options.onProfileVisibility?.();
        },
        context,
        async () => "active",
        async (_accountId, state) => {
            activity.push(`lifecycle:${state}`);
        },
    );
    accounts.calls.length = 0;
    async function request(
        input: {
            method?: string;
            action?: string;
            accountId?: string;
            path?: string;
            role?: AccessRole;
            actorId?: string;
            body?: unknown;
            onBody?: () => void;
        } = {},
    ) {
        const actorId = input.actorId ?? "administrator";
        const token = issueAccessToken(actorId, input.role ?? "admin", 60);
        let status = 0;
        let payload = "";
        let headerCount = 0;
        let responseCount = 0;
        const req = {
            method: input.method ?? "POST",
            headers: { authorization: `Bearer ${token}` },
            async *[Symbol.asyncIterator]() {
                activity.push("readBody");
                input.onBody?.();
                yield Buffer.from(JSON.stringify(input.body ?? {}));
            },
        } as IncomingMessage;
        const path =
            input.path ??
            `/api/v1/users/${encodeURIComponent(input.accountId ?? "target")}${input.action ? `/${input.action}` : ""}`;
        const handled = await route(
            req,
            {
                writeHead(code: number) {
                    status = code;
                    headerCount += 1;
                },
                end(body: string) {
                    payload = body;
                    responseCount += 1;
                },
            } as ServerResponse,
            new URL(path, "http://localhost"),
        );
        return {
            handled,
            status,
            headerCount,
            responseCount,
            body: payload ? JSON.parse(payload) : undefined,
        };
    }
    return { accounts, context, activity, logs, request };
}
