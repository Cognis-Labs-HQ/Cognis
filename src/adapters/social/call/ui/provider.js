import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import { createCall, getCall, updateCall } from "./client.js";

const CALL_UI_CAPABILITY = "social:callUi";
const VOIP_PROVIDER_CAPABILITY = "voip:startCall";
const POLL_INTERVAL_MILLISECONDS = 1_000;
let activeCall = null;

function ensureCallStyles() {
    const href = "/static/adapters/social/call/call.css";
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
}

function currentAccountId() {
    return String(localStorage.getItem("cognis_account") ?? "");
}

function callParticipants(call) {
    return (call.participants ?? []).map((participant) => ({
        ...participant,
        isCurrentUser: participant.accountId === currentAccountId(),
    }));
}

async function resolveProviderAction(call) {
    const provider = uiCtx.capabilities.get(VOIP_PROVIDER_CAPABILITY);
    if (typeof provider !== "function") return null;
    return provider({
        source: "messages",
        phase: "connect",
        call: { id: call.id, status: call.status },
        room: { id: call.roomId, kind: "dm", title: "" },
        users: callParticipants(call),
        supportedActions: ["component", "navigate"],
    });
}

function otherParticipantLabel(call) {
    const others = callParticipants(call).filter(
        (participant) => !participant.isCurrentUser,
    );
    return others
        .map(
            (participant) =>
                participant.displayName ||
                participant.handle ||
                participant.accountId,
        )
        .join(", ");
}

async function createStage(call, signal) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/call/languages"],
    });
    ensureCallStyles();
    const thread = document.querySelector(".messages-thread");
    const headerSlot = document.getElementById("messages-thread-header-slot");
    if (!(thread instanceof HTMLElement) || !headerSlot) return null;
    await activeCall?.cleanup();
    const callButton = document.getElementById("messages-room-call-btn");
    callButton?.classList.add("active");
    callButton?.setAttribute("aria-pressed", "true");
    const stage = document.createElement("section");
    stage.className = "call-stage";
    stage.dataset.callId = call.id;
    stage.innerHTML = `<div class="call-stage-toolbar"><button type="button" class="call-stage-back btn-neutral" title="${i18n.t("adapter.social.call.move_to_pip")}" aria-label="${i18n.t("adapter.social.call.move_to_pip")}" hidden><span class="call-stage-back-icon" aria-hidden="true"></span></button><strong>${i18n.t("adapter.social.call.window_title")}</strong></div><div class="call-stage-ringing"><p>${i18n.t("adapter.social.call.ringing").replace("{{user}}", otherParticipantLabel(call))}</p><button type="button" class="call-stage-hangup btn-cancel" title="${i18n.t("adapter.social.call.hangup")}" aria-label="${i18n.t("adapter.social.call.hangup")}"><img src="/static/adapters/social/call/hangup.svg" alt="" /></button></div>`;
    headerSlot.after(stage);
    thread.classList.add("messages-thread--call-active");
    let componentWindow = null;
    let releaseFloatingWindow = null;
    const cleanup = async () => {
        releaseFloatingWindow?.();
        await componentWindow?.discard?.();
        stage.remove();
        thread.classList.remove("messages-thread--call-active");
        callButton?.classList.remove("active");
        callButton?.setAttribute("aria-pressed", "false");
        if (activeCall?.stage === stage) activeCall = null;
    };
    activeCall = { callId: call.id, cleanup, stage };
    stage.querySelector(".call-stage-hangup")?.addEventListener(
        "click",
        async () => {
            await updateCall(call.id, "hangup").catch(() => null);
            await cleanup();
        },
        { signal },
    );
    return {
        stage,
        i18n,
        cleanup,
        setComponentWindow(value) {
            componentWindow = value;
        },
        setFloatingRelease(value) {
            releaseFloatingWindow = value;
        },
    };
}

async function mountProviderAction(action, callStage, signal) {
    if (action?.action === "navigate") {
        await callStage.cleanup();
        await uiCtx.capabilities.get("ui:navigate")?.(action.url);
        return true;
    }
    if (action?.action !== "component") return false;
    const ringing = callStage.stage.querySelector(".call-stage-ringing");
    ringing?.remove();
    const componentHost = document.createElement("div");
    componentHost.id = `call-component-${callStage.stage.dataset.callId}`;
    componentHost.className = "call-stage-component";
    callStage.stage.append(componentHost);
    const componentWindow = await uiCtx.capabilities.get(
        "component-pages:spawn",
    )?.({
        componentUuid: action.componentUuid,
        routeId: action.routeId,
        elementId: componentHost.id,
        mode: action.mode ?? "overlay",
        context: action.context ?? {},
        signal,
        borderless: action.borderless !== false,
    });
    if (!componentWindow) return false;
    callStage.setComponentWindow(componentWindow);
    const backButton = callStage.stage.querySelector(".call-stage-back");
    backButton.hidden = false;
    backButton.addEventListener(
        "click",
        () => {
            const windowElement = componentHost.querySelector(
                ".component-page-window",
            );
            const makeFloatingWindow = uiCtx.capabilities.get(
                "ui:makeFloatingWindow",
            );
            if (!(windowElement instanceof HTMLElement) || !makeFloatingWindow)
                return;
            callStage.setFloatingRelease(
                makeFloatingWindow(windowElement, { signal }),
            );
            componentWindow.restoreHostLayout?.();
            callStage.stage.hidden = true;
        },
        { signal },
    );
    return true;
}

async function waitForAnswer(call, callStage, signal) {
    while (!signal?.aborted) {
        const current = await getCall(call.id);
        if (current.status === "active") {
            const action = await resolveProviderAction(current);
            return mountProviderAction(action, callStage, signal);
        }
        if (["ended", "expired"].includes(current.status)) {
            await callStage.cleanup();
            return false;
        }
        await new Promise((resolve) =>
            setTimeout(resolve, POLL_INTERVAL_MILLISECONDS),
        );
    }
    return false;
}

async function resolveRoomCall(room) {
    if (
        typeof uiCtx.capabilities.get(VOIP_PROVIDER_CAPABILITY) !== "function"
    ) {
        return null;
    }
    if (!room || !["dm", "group"].includes(room.kind)) return null;
    return { roomId: String(room.id), room };
}

async function startRoomCall(action, { signal } = {}) {
    const call = await createCall(action.roomId);
    const callStage = await createStage(call, signal);
    if (!callStage) return false;
    return waitForAnswer(call, callStage, signal);
}

async function answerRequestedCall({ signal } = {}) {
    const url = new URL(window.location.href);
    const callId = url.searchParams.get("call");
    if (!callId || url.searchParams.get("answer") !== "1") return false;
    const call = await updateCall(callId, "answer");
    const callStage = await createStage(call, signal);
    if (!callStage) return false;
    history.replaceState(
        {},
        "",
        `/messages/${encodeURIComponent(call.roomId)}`,
    );
    const action = await resolveProviderAction(call);
    return mountProviderAction(action, callStage, signal);
}

uiCtx.capabilities.contribute(CALL_UI_CAPABILITY, {
    resolveRoomCall,
    startRoomCall,
    answerRequestedCall,
});
