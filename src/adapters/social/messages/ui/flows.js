import { uiCtx } from "/static/reuse/ui-ctx.js";

export const ROOM_ACTIONS_FLOW = "messages:compose-room-actions";
export const ROOM_ACTION_FLOW = "messages:activate-room-action";
export const ROOM_EVENT_TEXT_FLOW = "messages:formatRoomEvent";

for (const [flowId, stages] of [
    [ROOM_ACTIONS_FLOW, ["contribute", "finalize"]],
    [ROOM_ACTION_FLOW, ["validate", "activate"]],
    [ROOM_EVENT_TEXT_FLOW, ["format", "finalize"]],
]) {
    if (!uiCtx.flowExists(flowId)) uiCtx.registerFlow(flowId, stages);
}

uiCtx.extendFlow(
    ROOM_EVENT_TEXT_FLOW,
    "format",
    { id: "social-messages:format-owned-room-events" },
    ({ input, data }) => {
        const eventKeys = {
            member_joined: "module.social.messages.event_member_joined",
            member_left: "module.social.messages.event_member_left",
            profile_display_name_changed:
                "module.social.messages.event_display_name_changed",
            profile_avatar_changed:
                "module.social.messages.event_avatar_changed",
        };
        const key = eventKeys[input.event?.eventType];
        if (key)
            data.text = input.i18n.t(key).replace("{name}", input.subjectLabel);
    },
);

window.dispatchEvent(new CustomEvent("cognis:messages-flows-ready"));

export async function resolveRoomActions(room) {
    const result = await uiCtx.runFlow(ROOM_ACTIONS_FLOW, { room });
    return Array.isArray(result.data.actions) ? result.data.actions : [];
}

export async function activateRoomAction(action, room, options) {
    return uiCtx.runFlow(ROOM_ACTION_FLOW, { action, room, options });
}

export async function formatRoomEvent(event, subjectLabel, i18n) {
    const result = await uiCtx.runFlow(ROOM_EVENT_TEXT_FLOW, {
        event,
        subjectLabel,
        i18n,
    });
    return typeof result.data.text === "string" ? result.data.text : null;
}
