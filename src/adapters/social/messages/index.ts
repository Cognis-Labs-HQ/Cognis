import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    SocialAdapter,
    SocialAdapterBootstrapCtx,
} from "../../../gateways/social/gateway.js";
import { DbMessagesStore } from "./store.js";
import { createMessagesRoutes } from "./routes/index.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { SocialMessagesProfileStore } from "./profile-store-contract.js";
import {
    CTX_CAPABILITY,
    MESSAGING_FLOW_CATALOG,
    registerCanonicalFlow,
} from "@cognis/core";
import type { Ctx } from "@cognis/core";
import { createChatroomMembershipCapability } from "./membership.js";
import { createChatroomDeletionCapability } from "./chatroom-deletion.js";
import { createRoomMembershipResolver } from "./room-membership.js";

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
function createMessagesPageRoutes(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
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
        if (!ctx.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        try {
            const file = await readFile(
                path.join(ADAPTER_UI_ROOT, "index.html"),
            );
            ctx.setPageSecurityHeaders(res);
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

export async function bootstrapSocialAdapter(
    ctx: SocialAdapterBootstrapCtx,
): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const profileStore = ctx.capabilities.get<SocialMessagesProfileStore>(
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
    const dbExecutor = ctx.capabilities.get("db:executor");
    if (!dbExecutor) {
        ctx.log?.(
            "warn",
            "Messages adapter: no database executor available — messages disabled.",
            { component: "social-messages-adapter" },
        );
        return;
    }

    const messagesStore = new DbMessagesStore(dbExecutor);
    await messagesStore.ensureSchema();
    const membership = createChatroomMembershipCapability(
        messagesStore,
        profileStore,
    );
    ctx.capabilities.contribute("social:messages:membership", membership);
    const systemCtx = ctx.capabilities.get<Ctx>(CTX_CAPABILITY);
    systemCtx?.contributeCapability("social:messages:membership", membership);
    const resolveRoomMembership = createRoomMembershipResolver(messagesStore);
    ctx.capabilities.contribute(
        "social:messages:resolveRoomMembership",
        resolveRoomMembership,
    );
    systemCtx?.contributeCapability(
        "social:messages:resolveRoomMembership",
        resolveRoomMembership,
    );
    const resolveCallContext = async (input: {
        roomId: string;
        accountId: string;
    }) => {
        const [room, member, members] = await Promise.all([
            messagesStore.getRoom(input.roomId),
            messagesStore.getMember(input.roomId, input.accountId),
            messagesStore.listMembers(input.roomId),
        ]);
        if (!room || !member || member.archived) return null;
        const participants = await Promise.all(
            members
                .filter((roomMember) => !roomMember.archived)
                .map(async (roomMember) => {
                    const profile = await profileStore.getProfile(
                        roomMember.accountId,
                    );
                    return {
                        accountId: roomMember.accountId,
                        handle: profile?.handle ?? roomMember.accountId,
                        displayName:
                            profile?.displayName ??
                            profile?.handle ??
                            roomMember.accountId,
                    };
                }),
        );
        return {
            room: {
                id: room.id,
                kind: room.kind,
                title: room.title ?? "",
            },
            participants,
        };
    };
    ctx.capabilities.contribute(
        "social:messages:callContext",
        resolveCallContext,
    );
    systemCtx?.contributeCapability(
        "social:messages:callContext",
        resolveCallContext,
    );
    const appendRoomEvent = (input: {
        roomId: string;
        actorId: string;
        eventType: string;
        subjectAccountId: string;
        subjectHandle?: string | null;
        subjectDisplayName?: string | null;
        details?: Record<string, unknown>;
    }) => messagesStore.appendRoomEvent(input);
    ctx.capabilities.contribute(
        "social:messages:appendRoomEvent",
        appendRoomEvent,
    );
    systemCtx?.contributeCapability(
        "social:messages:appendRoomEvent",
        appendRoomEvent,
    );
    const deleteChatroom = createChatroomDeletionCapability(
        messagesStore,
        ctx.log,
    );
    if (systemCtx && !systemCtx.hasFlow("delete-chatroom")) {
        systemCtx.registerFlow({
            id: "delete-chatroom",
            description:
                "Deletes a chatroom through staged validation, authorization, and cleanup.",
            stages: [
                "validate-request",
                "authorize-and-delete",
                "after-delete",
            ],
        });
    }
    ctx.flow.extend(
        "delete-chatroom",
        "authorize-and-delete",
        { id: "social-messages-adapter:authorize-and-delete" },
        async (stageCtx) => deleteChatroom(stageCtx.input as never),
    );
    const runDeleteChatroomFlow = async (input: {
        roomId?: unknown;
        actorAccountId?: unknown;
    }) => {
        await ctx.flow.run("delete-chatroom", input);
    };
    ctx.capabilities.contribute(
        "social:messages:deleteChatroom",
        runDeleteChatroomFlow,
    );
    systemCtx?.contributePublicCapability(
        "social:messages:deleteChatroom",
        runDeleteChatroomFlow,
    );

    type ExternalRoomAuthorizer = (input: {
        claims: { sub: string; role: string };
        roomId: string;
        requiredCapability: "chat:read" | "chat:write";
    }) => Promise<{ external: boolean; authorized: boolean }>;
    const externalRoomAuthorizers = new Set<ExternalRoomAuthorizer>();
    ctx.capabilities.contribute(
        "social:messages:registerExternalRoomAuthorizer",
        (authorizer: ExternalRoomAuthorizer) => {
            externalRoomAuthorizers.add(authorizer);
            return () => externalRoomAuthorizers.delete(authorizer);
        },
    );
    ctx.capabilities.contribute(
        "social:messages:authorizeExternalRoomAccess",
        async (input: Parameters<ExternalRoomAuthorizer>[0]) => {
            for (const authorize of externalRoomAuthorizers) {
                const result = await authorize(input);
                if (result.external) return result;
            }
            return { external: false, authorized: false };
        },
    );
    const deleteAccountActivity = async (
        accountId: string,
        subjectHandle = accountId,
    ) => {
        const rooms = await messagesStore.listRoomsForAccount(accountId);
        for (const room of rooms) {
            await membership.remove({
                roomId: room.id,
                actorAccountId: accountId,
                userAccountId: accountId,
                userHandle: subjectHandle,
            });
        }
        await dbExecutor.transaction(async (transactionDb) => {
            for (const table of [
                "chatroom_typing",
                "chat_message_reactions",
                "chat_emoji_usage",
            ]) {
                await transactionDb.executeCommand({
                    option: "DELETE",
                    table,
                    where: [{ column: "account_id", value: accountId }],
                });
            }
            for (const column of ["from_account_id", "to_account_id"]) {
                await transactionDb.executeCommand({
                    option: "DELETE",
                    table: "chat_message_requests",
                    where: [{ column, value: accountId }],
                });
            }
        });
        ctx.log?.("info", "Deleted user messaging activity.", {
            component: "social-messages-adapter",
            operation: "delete_user_activity",
            accountId,
        });
    };
    ctx.capabilities.get<
        (ownerId: string, purge: (accountId: string) => Promise<void>) => void
    >("auth:registerAccountDataOwner")?.("messages", deleteAccountActivity);
    ctx.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "social-messages:delete-user-activity" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                username?: string;
                action?: string;
            };
            const persistResult = (stageCtx.stageResults["persist-state"] ??
                []) as Array<{ persisted?: boolean }>;
            if (
                input.action !== "delete" ||
                !input.username ||
                !persistResult[0]?.persisted
            ) {
                return { cleaned: false };
            }
            const accountId = input.username.trim().toLowerCase();
            await deleteAccountActivity(accountId, input.username);
            return { cleaned: true, accountId };
        },
    );
    ctx.log?.("info", "Messages adapter: schema ready.", {
        component: "social-messages-adapter",
    });

    // Foundational namespace registration for chatroom attachments/avatars.
    // Group-scoped ACL wiring (granting all room members read access to a
    // room's uploaded avatar) is deferred to when full attachment support is
    // built; until then, uploaded room avatars are visible only to their
    // uploader.
    ctx.capabilities.get<
        (definition: {
            id: string;
            ownerComponent: string;
            acl: { visibility: string };
        }) => void
    >("files:registerNamespace")?.({
        id: "chats",
        ownerComponent: "social-messages",
        acl: { visibility: "private-group" },
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
        registerCategory("message-requests", "Message Requests");
    }

    /**
     * social:messages:onProfileChanged — propagates profile updates into room
     * event history.
     */
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

    /**
     * social:messages:resolveGroupChatUrl — resolves or creates a reusable
     * group-chat URL for participants.
     */
    ctx.capabilities.contribute(
        "social:messages:resolveGroupChatUrl",
        async (input: {
            usernames: string[];
            title?: string | null;
            createdByAccountId?: string;
            allowSingleMember?: boolean;
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
            const minAccounts = input.allowSingleMember ? 1 : 2;
            if (accountIds.length < minAccounts) {
                throw new Error(
                    minAccounts === 1
                        ? "At least one valid participant is required for group chat resolution."
                        : "At least two valid participants are required for group chat resolution.",
                );
            }

            const title =
                typeof input.title === "string" && input.title.trim().length > 0
                    ? input.title.trim()
                    : null;
            const existing =
                await messagesStore.findGroupByExactMembers(accountIds);
            if (existing) {
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
            await messagesStore.generateAndStoreRoomKey(room.id);
            for (const accountId of accountIds) {
                await membership.add({
                    roomId: room.id,
                    actorAccountId: ownerAccountId,
                    userAccountId: accountId,
                    role: accountId === ownerAccountId ? "owner" : "member",
                });
            }
            return {
                roomId: room.id,
                url: `/messages/${encodeURIComponent(room.id)}`,
                reused: false,
            };
        },
    );

    ctx.capabilities.contribute("social:messages:uiResources", {
        languageBaseUrls: [
            "/static/adapters/social/messages/languages",
            "/static/gateways/social/languages",
        ],
        stylesheetUrls: [
            "/static/adapters/social/messages/messages-chat-shared.css",
            "/static/adapters/social/messages/messages-style-variants.css",
        ],
        reactionHelpersModuleUrl:
            "/static/adapters/social/messages/reactions.js",
        chatLoadingModuleUrl:
            "/static/adapters/social/messages/chat-loading.js",
    });

    ctx.registerRoute(
        createMessagesRoutes({
            messagesStore,
            profileStore,
            dispatch: dispatch ?? null,
            isAdapterEnabled: () => ctx.isGatewayEnabled(),
            routeContext,
            flow: ctx.flow,
            membership,
        }),
        "social",
    );

    if (!ctx.flow.exists("send-message")) {
        const sendMessageFlow = MESSAGING_FLOW_CATALOG.find(
            (flow) => flow.id === "send-message",
        );
        if (systemCtx && sendMessageFlow) {
            registerCanonicalFlow(systemCtx, sendMessageFlow);
        } else if (!systemCtx) {
            ctx.log?.(
                "warn",
                "Messages adapter: cannot register send-message flow because CTX capability is unavailable.",
                { component: "social-messages-adapter" },
            );
        } else {
            ctx.log?.(
                "warn",
                "Messages adapter: send-message canonical flow missing from flow catalog.",
                { component: "social-messages-adapter" },
            );
        }
    }

    const persistHookRegistered = ctx.flow.extend(
        "send-message",
        "persist-message",
        { id: "social-messages-adapter:persist-message" },
        async (stageCtx) => {
            const input = stageCtx.input as {
                roomId: string;
                senderId: string;
                ciphertext: string;
                iv: string;
                authTag?: string;
                contentType?: string;
            };
            const message = await messagesStore.appendMessage({
                roomId: input.roomId,
                senderId: input.senderId,
                ciphertext: input.ciphertext,
                iv: input.iv,
                authTag: input.authTag ?? "",
                contentType: input.contentType ?? "text/plain",
            });
            await messagesStore.setTyping(input.roomId, input.senderId, false);
            return { messageId: message.id, persisted: true, message };
        },
    );
    if (!persistHookRegistered) {
        ctx.log?.(
            "warn",
            "Messages adapter: failed to register send-message persist hook (send-message flow/stage may be missing during bootstrap).",
            { component: "social-messages-adapter" },
        );
    }

    const fanOutHookRegistered = ctx.flow.extend(
        "send-message",
        "fan-out",
        { id: "social-messages-adapter:fan-out" },
        async (stageCtx) => {
            if (!dispatch) return { dispatched: false };
            const persistResults = (stageCtx.stageResults["persist-message"] ??
                []) as Array<{
                messageId?: string;
                persisted?: boolean;
                message?: { id: string };
            }>;
            const persistResult = persistResults[0];
            if (!persistResult?.persisted || !persistResult.messageId) {
                return { dispatched: false };
            }
            const input = stageCtx.input as {
                roomId: string;
                senderId: string;
            };
            const sender = await profileStore.getProfile(input.senderId);
            const senderHandle = sender?.handle ?? sender?.accountId;
            const members = await messagesStore.listMembers(input.roomId);
            for (const otherMember of members) {
                if (
                    otherMember.accountId === input.senderId ||
                    otherMember.muted
                ) {
                    continue;
                }
                const pendingIncoming =
                    await messagesStore.getPendingIncomingRoomMessageRequest(
                        input.roomId,
                        otherMember.accountId,
                    );
                if (pendingIncoming) continue;
                const recipient = await profileStore.getProfile(
                    otherMember.accountId,
                );
                if (!recipient) continue;
                await dispatch({
                    category: "messages",
                    recipientUsername: recipient.handle,
                    subject: "New message",
                    body: "New message",
                    senderName: senderHandle,
                    actionUrl: `/messages/${input.roomId}`,
                    metadata: {
                        roomId: input.roomId,
                        messageId: persistResult.messageId,
                    },
                }).catch(() => undefined);
            }
            return { dispatched: true };
        },
    );
    if (!fanOutHookRegistered) {
        ctx.log?.(
            "warn",
            "Messages adapter: failed to register send-message fan-out hook (send-message flow/stage may be missing during bootstrap).",
            { component: "social-messages-adapter" },
        );
    }

    ctx.registerRoute(
        createMessagesPageRoutes(routeContext, () => ctx.isGatewayEnabled()),
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
            "/static/adapters/social/messages/thread.css",
            "/static/adapters/social/messages/messages-style-variants.css",
            "/static/adapters/social/messages/messages-chat-shared.css",
            "/static/adapters/social/messages/messages-template-composer.css",
            "/static/adapters/social/messages/messages-sidebar.css",
        ],
        isEnabled: () => ctx.isGatewayEnabled() && ctx.isAdapterEnabled(),
    });
    ctx.registerNavbarPlugin(
        "/static/adapters/social/messages/navbar.js",
        () => ctx.isGatewayEnabled() && ctx.isAdapterEnabled(),
        ["social:messagesUiClient"],
    );

    ctx.log?.("info", "Messages adapter: initialized.", {
        component: "social-messages-adapter",
        hasDispatch: Boolean(dispatch),
    });

    adapterReady = true;
}
