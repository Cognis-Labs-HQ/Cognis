import { uiCtx } from "/static/reuse/ui-ctx.js";

export const VOIP_PROVIDER_CAPABILITY = "voip:startCall";

const FLOW_ID = "messages:start-voip-call";
const PROVIDER_STAGE_ID = "request-provider-call";
let nextCallStageId = 0;

if (!uiCtx.flowExists(FLOW_ID)) {
    uiCtx.registerFlow(FLOW_ID, [PROVIDER_STAGE_ID]);
    uiCtx.extendFlow(
        FLOW_ID,
        PROVIDER_STAGE_ID,
        { id: "social-messages:request-voip-call" },
        ({ input }) =>
            uiCtx.capabilities.get(VOIP_PROVIDER_CAPABILITY)?.(input),
    );
}

export function hasVoipProvider() {
    return (
        typeof uiCtx.capabilities.get(VOIP_PROVIDER_CAPABILITY) === "function"
    );
}

function createRoomCallInput(room, currentAccountId) {
    return {
        source: "messages",
        room: {
            id: String(room.id ?? ""),
            kind: String(room.kind ?? ""),
            title: String(room.title ?? ""),
        },
        users: (room.members ?? []).map((member) => ({
            accountId: String(member.accountId ?? ""),
            handle: String(member.handle ?? ""),
            displayName: String(member.displayName ?? member.username ?? ""),
            isCurrentUser: String(member.accountId ?? "") === currentAccountId,
        })),
        supportedActions: ["component", "navigate"],
    };
}

function normalizeCallAction(value) {
    if (!value || typeof value !== "object") return null;
    if (value.action === "navigate") {
        const url = new URL(String(value.url ?? ""), window.location.origin);
        if (url.origin !== window.location.origin) return null;
        return {
            action: "navigate",
            url: `${url.pathname}${url.search}${url.hash}`,
        };
    }
    if (value.action !== "component") return null;
    const componentUuid = String(value.componentUuid ?? "").trim();
    const routeId = String(value.routeId ?? "").trim();
    if (!componentUuid || !routeId) return null;
    return {
        action: "component",
        componentUuid,
        routeId,
        context:
            value.context && typeof value.context === "object"
                ? value.context
                : {},
        mode: String(value.mode ?? "pip"),
        borderless: value.borderless !== false,
    };
}

export async function resolveRoomCallAction(room, currentAccountId) {
    if (!hasVoipProvider() || !room) return null;
    const result = await uiCtx.runFlow(
        FLOW_ID,
        createRoomCallInput(room, currentAccountId),
    );
    const providerResults = result.stageResults?.[PROVIDER_STAGE_ID] ?? [];
    return normalizeCallAction(
        providerResults.findLast((value) => value != null),
    );
}

export async function startRoomCall(action, { signal } = {}) {
    if (action?.action === "navigate") {
        const navigate = uiCtx.capabilities.get("ui:navigate");
        if (typeof navigate !== "function") return false;
        await navigate(action.url);
        return true;
    }
    if (action?.action !== "component") return false;
    const spawn = uiCtx.capabilities.get("component-pages:spawn");
    if (typeof spawn !== "function") return false;
    nextCallStageId += 1;
    const elementId = `messages-voip-stage-${nextCallStageId}`;
    const stage = document.createElement("section");
    stage.id = elementId;
    document.body.append(stage);
    try {
        const handle = await spawn({
            componentUuid: action.componentUuid,
            routeId: action.routeId,
            elementId,
            mode: action.mode,
            context: action.context,
            signal,
            borderless: action.borderless,
            removeStageOnDiscard: true,
        });
        if (!handle) stage.remove();
        return Boolean(handle);
    } catch (error) {
        stage.remove();
        throw error;
    }
}
