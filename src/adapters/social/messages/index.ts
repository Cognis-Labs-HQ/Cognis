import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    SocialAdapter,
    SocialAdapterBootstrapCtx,
} from "../../../gateways/social/gateway.js";
import { DbMessagesStore } from "./store.js";
import { createMessagesRoutes } from "./routes.js";
import {
    getCookieSession,
    setPageSecurityHeaders,
} from "../../../api/auth/guard.js";
import type { DbProfileStore } from "../../db/reuse/profile-store.js";

const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

let adapterReady = false;

export function createSocialAdapter(): SocialAdapter {
    return {
        adapterId: "messages",
        adapterName: "Messages",
        isConfigured: () => adapterReady,
    };
}

/**
 * Page-serving route for `/messages` and `/messages/:roomId`. Both serve the
 * same `messages.html` template; client-side routing inside the SPA picks
 * the room from the URL.
 */
function createMessagesPageRoutes(isAdapterEnabled: () => boolean) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (
            url.pathname !== "/messages" &&
            !url.pathname.startsWith("/messages/")
        ) {
            return false;
        }
        if (!getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        try {
            const file = await readFile(
                path.join(PUBLIC_ROOT, "pages", "messages.html"),
            );
            setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
        } catch {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Page not found." },
                }),
            );
        }
        return true;
    };
}

/**
 * Messages for the Social Gateway. Owns chatrooms, members, and messages —
 * see docs/standard.en.md for the full threat model.
 *
 * Cross-adapter dependencies:
 *   social:profileStore    — DbProfileStore contributed by the profile adapter.
 *                            Used for handle lookup, visibility, follow, and
 *                            block queries that gate messaging eligibility.
 *   notify:dispatch (opt)  — When present, new-message events are dispatched
 *                            to the notify gateway with category 'messages'.
 *                            Absent → notifications are silently skipped.
 *
 * Runtime routes are not registered if the profile adapter has not contributed
 * `social:profileStore`, since every meaningful operation needs profile data.
 */
export async function bootstrapSocialAdapter(
    ctx: SocialAdapterBootstrapCtx,
): Promise<void> {
    const profileStore = ctx.capabilities.get<DbProfileStore>(
        "social:profileStore",
    );
    if (!profileStore) {
        ctx.log?.(
            "warn",
            "Messages adapter: social:profileStore capability not found — messages disabled.",
            { component: "social-messages-adapter" },
        );
        return;
    }
    if (!ctx.dbExecutor) {
        ctx.log?.(
            "warn",
            "Messages adapter: no database executor available — messages disabled.",
            { component: "social-messages-adapter" },
        );
        return;
    }

    const dbType = ctx.dbType ?? "sqlite";
    const messagesStore = new DbMessagesStore(ctx.dbExecutor, dbType);
    await messagesStore.ensureSchema();
    ctx.log?.("info", "Messages adapter: schema ready.", {
        component: "social-messages-adapter",
        dbType,
    });

    const dispatch =
        ctx.capabilities.get<
            (e: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                senderName?: string;
                actionUrl?: string;
                metadata?: Record<string, unknown>;
            }) => Promise<{ dispatched: string[] }>
        >("notify:dispatch");

    const registerCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    if (registerCategory) {
        registerCategory("messages", "Private Messages");
    }

    ctx.registerRoute(
        createMessagesRoutes({
            messagesStore,
            profileStore,
            dispatch: dispatch ?? null,
            isAdapterEnabled: () => ctx.isGatewayEnabled(),
        }),
        "social",
    );

    ctx.registerRoute(
        createMessagesPageRoutes(() => ctx.isGatewayEnabled()),
        "social",
    );

    const uiDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "ui",
    );
    ctx.registerAdapterStaticDir?.("social", "messages", uiDir);
    ctx.registerNavbarPlugin(
        "/static/adapters/social/messages/navbar.js",
        () => ctx.isGatewayEnabled() && ctx.isAdapterEnabled(),
    );

    ctx.log?.("info", "Messages adapter: initialized.", {
        component: "social-messages-adapter",
        hasDispatch: Boolean(dispatch),
    });

    adapterReady = true;
}
