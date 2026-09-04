import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import type {
    SocialAdapter,
    SocialAdapterBootstrapCtx,
} from "../../../gateways/social/gateway.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { CallStore } from "./store.js";
import { createCallRoutes } from "./routes/index.js";

let adapterReady = false;
const CALL_NOTIFICATION_LOCALES = ["de", "en", "id", "ja"];

async function loadNotificationTranslations(uiDir: string) {
    const entries = await Promise.all(
        CALL_NOTIFICATION_LOCALES.map(async (locale) => {
            const xml = await readFile(
                path.join(uiDir, "languages", locale, "strings.xml"),
                "utf8",
            );
            const readString = (key: string) =>
                xml.match(
                    new RegExp(`<string name="${key}">([^<]*)</string>`),
                )?.[1] ?? "";
            return [
                locale,
                {
                    incomingCall: readString(
                        "adapter.social.call.incoming_call",
                    ),
                    incomingCallFrom: readString(
                        "adapter.social.call.incoming_call_from",
                    ),
                },
            ] as const;
        }),
    );
    return Object.fromEntries(entries);
}

async function loadNotificationActionIcons(uiDir: string) {
    const [answer, decline] = await Promise.all([
        readFile(path.join(uiDir, "answer.svg"), "utf8"),
        readFile(path.join(uiDir, "decline.svg"), "utf8"),
    ]);
    return { answer, decline };
}

export function createSocialAdapter(): SocialAdapter {
    return {
        adapterId: "call",
        adapterName: "Calls",
        isConfigured: () => adapterReady,
    };
}

export async function bootstrapSocialAdapter(
    ctx: SocialAdapterBootstrapCtx,
): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    type ResolveRoom = (input: {
        roomId: string;
        accountId: string;
    }) => Promise<{
        room: { id: string; kind: string; title: string };
        participants: Array<{
            accountId: string;
            handle: string;
            displayName: string;
        }>;
    } | null>;
    const resolveRoom = (input: { roomId: string; accountId: string }) =>
        ctx.capabilities.get<ResolveRoom>("social:messages:callContext")?.(
            input,
        ) ?? Promise.resolve(null);
    if (!routeContext) {
        ctx.log?.("error", "Call adapter dependencies are unavailable.", {
            component: "social-call-adapter",
            operation: "bootstrap",
            hasRouteContext: Boolean(routeContext),
        });
        return;
    }
    const dispatch =
        ctx.capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                senderName?: string;
                actionUrl?: string;
                metadata?: Record<string, unknown>;
            }) => Promise<unknown>
        >("notify:dispatch");
    type AppendCallEvent = Parameters<
        NonNullable<Parameters<typeof createCallRoutes>[4]>
    >[0];
    const appendRoomEvent = (input: AppendCallEvent) =>
        ctx.capabilities.get<(value: AppendCallEvent) => Promise<unknown>>(
            "social:messages:appendCallEvent",
        )?.(input) ?? Promise.resolve();
    const uiDir = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "ui",
    );
    const notificationTranslations = await loadNotificationTranslations(uiDir);
    const notificationActionIcons = await loadNotificationActionIcons(uiDir);
    ctx.capabilities.get<(id: string, label: string) => void>(
        "notify:registerCategory",
    )?.("calls", "Calls");
    const store = new CallStore();
    ctx.registerRoute(
        createCallRoutes(
            store,
            resolveRouteContext(routeContext),
            resolveRoom,
            dispatch,
            appendRoomEvent,
            notificationTranslations,
            notificationActionIcons,
        ),
        "social",
    );
    ctx.registerAdapterStaticDir?.("social", "call", uiDir);
    ctx.registerCapabilityProvider?.({
        scriptUrl: "/static/adapters/social/call/provider.js",
        providesCapabilities: ["social:callUi"],
        isEnabled: () => ctx.isGatewayEnabled() && ctx.isAdapterEnabled(),
    });
    adapterReady = true;
    ctx.log?.("info", "Call adapter initialized.", {
        component: "social-call-adapter",
        operation: "bootstrap",
        notificationDispatchAvailable: Boolean(dispatch),
    });
}
