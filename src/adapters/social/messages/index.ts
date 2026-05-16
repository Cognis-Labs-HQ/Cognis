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
} from "../../../gateways/auth/guard.js";
import type { DbProfileStore } from "../profile/store.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);

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
                path.join(ADAPTER_UI_ROOT, "index.html"),
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

    const messagesStore = new DbMessagesStore(ctx.dbExecutor);
    await messagesStore.ensureSchema();
    ctx.log?.("info", "Messages adapter: schema ready.", {
        component: "social-messages-adapter",
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

    ctx.capabilities.contribute(
        "social:messages:onProfileChanged",
        async (input: {
            accountId: string;
            handle?: string | null;
            displayName?: string | null;
            displayNameChanged?: boolean;
            avatarChanged?: boolean;
        }): Promise<void> => {
            const rooms = await messagesStore.listRoomsForAccount(
                input.accountId,
            );
            for (const room of rooms) {
                if (input.displayNameChanged) {
                    await messagesStore.appendRoomEvent({
                        roomId: room.id,
                        actorId: input.accountId,
                        eventType: "profile_display_name_changed",
                        subjectAccountId: input.accountId,
                        subjectHandle: input.handle ?? null,
                        subjectDisplayName: input.displayName ?? null,
                    });
                }
                if (input.avatarChanged) {
                    await messagesStore.appendRoomEvent({
                        roomId: room.id,
                        actorId: input.accountId,
                        eventType: "profile_avatar_changed",
                        subjectAccountId: input.accountId,
                        subjectHandle: input.handle ?? null,
                        subjectDisplayName: input.displayName ?? null,
                    });
                }
            }
        },
    );

    ctx.capabilities.contribute(
        "social:messages:resolveGroupChatUrl",
        async (input: {
            usernames: string[];
            title?: string | null;
            createdByAccountId?: string;
        }): Promise<{
            roomId: string;
            url: string;
            reused: boolean;
        }> => {
            const normalizedUsernames = Array.from(
                new Set(
                    (Array.isArray(input.usernames) ? input.usernames : [])
                        .map((username) =>
                            String(username ?? "")
                                .trim()
                                .replace(/^@+/, "")
                                .toLowerCase(),
                        )
                        .filter(Boolean),
                ),
            );
            const accountIds: string[] = [];
            if (input.createdByAccountId) {
                accountIds.push(String(input.createdByAccountId));
            }
            for (const username of normalizedUsernames) {
                const profile = await profileStore.getProfileByHandle(username);
                if (!profile?.accountId) continue;
                if (!accountIds.includes(profile.accountId)) {
                    accountIds.push(profile.accountId);
                }
            }
            if (accountIds.length < 2) {
                throw new Error(
                    "At least two valid participants are required for group chat resolution.",
                );
            }

            const title =
                typeof input.title === "string" && input.title.trim().length > 0
                    ? input.title.trim()
                    : null;
            const existing = await messagesStore.findGroupByExactMembers(
                accountIds,
            );
            if (existing) {
                if (title && existing.title !== title) {
                    await messagesStore.updateRoomTitle(existing.id, title);
                }
                return {
                    roomId: existing.id,
                    url: `/messages/${encodeURIComponent(existing.id)}`,
                    reused: true,
                };
            }

            const ownerAccountId = String(
                input.createdByAccountId ?? accountIds[0],
            );
            const room = await messagesStore.createRoom(
                "group",
                title,
                ownerAccountId,
            );
            for (const accountId of accountIds) {
                await messagesStore.addMember(
                    room.id,
                    accountId,
                    accountId === ownerAccountId ? "owner" : "member",
                );
            }
            await messagesStore.generateAndStoreRoomKey(room.id);
            const ownerProfile = await profileStore.getProfile(ownerAccountId);
            await messagesStore.appendRoomEvent({
                roomId: room.id,
                actorId: ownerAccountId,
                eventType: "member_joined",
                subjectAccountId: ownerAccountId,
                subjectHandle: ownerProfile?.handle ?? null,
                subjectDisplayName: ownerProfile?.displayName ?? null,
            });
            return {
                roomId: room.id,
                url: `/messages/${encodeURIComponent(room.id)}`,
                reused: false,
            };
        },
    );

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
    ctx.registerSpaRoute?.({
        id: "social-messages-page",
        pattern: "^/messages(?:/[^/]+)?$",
        base: "/messages",
        scriptUrl: "/static/adapters/social/messages/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/social/messages/messages.css",
        ],
        isEnabled: () => ctx.isGatewayEnabled() && ctx.isAdapterEnabled(),
    });
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
