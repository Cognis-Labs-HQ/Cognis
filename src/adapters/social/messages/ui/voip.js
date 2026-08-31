import { uiCtx } from "/static/reuse/ui-ctx.js";

export const VOIP_PROVIDER_CAPABILITY = "voip:startCall";

const FLOW_ID = "messages:start-voip-call";
const PROVIDER_STAGE_ID = "request-provider-call";

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

export async function startRoomCall(room, currentAccountId) {
    if (!hasVoipProvider() || !room) return false;
    const users = (room.members ?? []).map((member) => ({
        accountId: String(member.accountId ?? ""),
        handle: String(member.handle ?? ""),
        displayName: String(member.displayName ?? member.username ?? ""),
        isCurrentUser: String(member.accountId ?? "") === currentAccountId,
    }));
    await uiCtx.runFlow(FLOW_ID, {
        source: "messages",
        room: {
            id: String(room.id ?? ""),
            kind: String(room.kind ?? ""),
            title: String(room.title ?? ""),
        },
        users,
        presentation: "pip",
    });
    return true;
}
