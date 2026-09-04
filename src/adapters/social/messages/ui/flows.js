import { uiCtx } from "/static/reuse/ui-ctx.js";

export const ROOM_ACTIONS_FLOW = "messages:compose-room-actions";
export const ROOM_ACTION_FLOW = "messages:activate-room-action";

for (const [flowId, stages] of [
    [ROOM_ACTIONS_FLOW, ["contribute", "finalize"]],
    [ROOM_ACTION_FLOW, ["validate", "activate"]],
]) {
    if (!uiCtx.flowExists(flowId)) uiCtx.registerFlow(flowId, stages);
}

window.dispatchEvent(new CustomEvent("cognis:messages-flows-ready"));

export async function resolveRoomActions(room) {
    const result = await uiCtx.runFlow(ROOM_ACTIONS_FLOW, { room });
    return Array.isArray(result.data.actions) ? result.data.actions : [];
}

export async function activateRoomAction(action, room, options) {
    return uiCtx.runFlow(ROOM_ACTION_FLOW, { action, room, options });
}
