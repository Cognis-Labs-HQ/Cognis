import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import { createCall, getCall, updateCall } from "./client.js";
import { showToast } from "/static/reuse/toast.js";
import { startRingingTone } from "./tone-player.js";

const CALL_UI_CAPABILITY = "social:callUi";
const VOIP_PROVIDER_CAPABILITY = "voip:startCall";
const POLL_INTERVAL_MILLISECONDS = 1_000;
let activeCall = null;
let callI18n = null;
const inboundTones = new Map();

function stopInboundTone(callId) {
    inboundTones.get(callId)?.();
    inboundTones.delete(callId);
}

async function getCallI18n() {
    callI18n ??= createI18n({
        componentStringBaseUrls: ["/static/adapters/social/call/languages"],
    });
    return callI18n;
}

function announceRoomCall(roomId, active) {
    window.dispatchEvent(
        new CustomEvent("cognis:room-call-state", {
            detail: { roomId, active },
        }),
    );
}

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
    const i18n = await getCallI18n();
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
    stage.dataset.roomId = call.roomId;
    stage.innerHTML = `<div class="call-stage-toolbar"><button type="button" class="call-stage-back btn-neutral" title="${i18n.t("adapter.social.call.move_to_pip")}" aria-label="${i18n.t("adapter.social.call.move_to_pip")}" hidden><span class="call-stage-back-icon" aria-hidden="true"></span></button><strong>${i18n.t("adapter.social.call.window_title")}</strong></div><div class="call-stage-ringing"><p>${i18n.t("adapter.social.call.ringing").replace("{{user}}", otherParticipantLabel(call))}</p><button type="button" class="call-stage-hangup btn-cancel" title="${i18n.t("adapter.social.call.hangup")}" aria-label="${i18n.t("adapter.social.call.hangup")}"><img src="/static/adapters/social/call/hangup.svg" alt="" /></button></div>`;
    headerSlot.after(stage);
    thread.classList.add("messages-thread--call-active");
    let componentWindow = null;
    let releaseFloatingWindow = null;
    let isFloating = false;
    let closeObserver = null;
    const cleanup = async () => {
        closeObserver?.disconnect();
        releaseFloatingWindow?.();
        await componentWindow?.discard?.();
        stage.remove();
        thread.classList.remove("messages-thread--call-active");
        callButton?.classList.remove("active");
        callButton?.setAttribute("aria-pressed", "false");
        if (callButton instanceof HTMLButtonElement)
            callButton.disabled = false;
        if (activeCall?.stage === stage) activeCall = null;
    };
    activeCall = { callId: call.id, cleanup, stage };
    announceRoomCall(call.roomId, true);
    stage.querySelector(".call-stage-hangup")?.addEventListener(
        "click",
        async () => {
            try {
                await updateCall(call.id, "hangup");
                await cleanup();
                announceRoomCall(call.roomId, false);
                showToast(i18n.t("adapter.social.call.cancelled"), {
                    variant: "info",
                });
            } catch (error) {
                console.error("[calls] Failed to cancel call", error);
                showToast(i18n.t("adapter.social.call.cancel_failed"), {
                    variant: "error",
                });
            }
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
        isFloating: () => isFloating,
        markFloating() {
            isFloating = true;
        },
        setCloseObserver(value) {
            closeObserver = value;
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
            if (callStage.isFloating()) return;
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
            callStage.markFloating();
            componentWindow.restoreHostLayout?.();
            backButton.hidden = true;
            callStage.stage.hidden = true;
            document
                .querySelector(".messages-thread")
                ?.classList.remove("messages-thread--call-active");
            const callButton = document.getElementById(
                "messages-room-call-btn",
            );
            callButton?.classList.remove("active");
            callButton?.setAttribute("aria-pressed", "false");
            if (callButton instanceof HTMLButtonElement) {
                callButton.disabled = true;
            }
            window.dispatchEvent(
                new CustomEvent("cognis:call-moved-to-pip", {
                    detail: { roomId: callStage.stage.dataset.roomId },
                }),
            );
            const closeObserver = new MutationObserver(() => {
                if (windowElement.isConnected) return;
                closeObserver.disconnect();
                void callStage.cleanup();
            });
            closeObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });
            callStage.setCloseObserver(closeObserver);
        },
        { signal },
    );
    return true;
}

async function waitForAnswer(call, callStage, signal) {
    while (!signal?.aborted && activeCall?.callId === call.id) {
        const current = await getCall(call.id);
        if (current.status === "active") {
            const action = await resolveProviderAction(current);
            return mountProviderAction(action, callStage, signal);
        }
        if (["ended", "expired"].includes(current.status)) {
            await callStage.cleanup();
            announceRoomCall(current.roomId, false);
            const i18n = await getCallI18n();
            const key =
                current.status === "expired"
                    ? "adapter.social.call.no_answer"
                    : current.endedBy === currentAccountId()
                      ? "adapter.social.call.cancelled"
                      : "adapter.social.call.declined";
            showToast(i18n.t(key), { variant: "warning" });
            return true;
        }
        await new Promise((resolve) =>
            setTimeout(resolve, POLL_INTERVAL_MILLISECONDS),
        );
    }
    return true;
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
    const stopTone = startRingingTone("outbound");
    const callStage = await createStage(call, signal);
    if (!callStage) {
        stopTone();
        return false;
    }
    try {
        return await waitForAnswer(call, callStage, signal);
    } finally {
        stopTone();
    }
}

async function answerRequestedCall({ signal } = {}) {
    const url = new URL(window.location.href);
    const callId = url.searchParams.get("call");
    if (!callId || url.searchParams.get("answer") !== "1") return false;
    const call = await updateCall(callId, "answer");
    stopInboundTone(callId);
    const callStage = await createStage(call, signal);
    if (!callStage) return false;
    history.replaceState(
        {},
        "",
        `/messages/${encodeURIComponent(call.roomId)}`,
    );
    const action = await resolveProviderAction(call);
    const mounted = await mountProviderAction(action, callStage, signal);
    if (!mounted) {
        await callStage.cleanup();
        showToast(
            (await getCallI18n()).t("adapter.social.call.provider_declined"),
            { variant: "warning" },
        );
    }
    return true;
}

async function declineCall(callId, roomId) {
    if (!callId) return;
    const i18n = await getCallI18n();
    try {
        await updateCall(callId, "hangup");
        announceRoomCall(roomId, false);
        showToast(i18n.t("adapter.social.call.declined_self"), {
            variant: "info",
        });
    } catch (error) {
        console.error("[calls] Failed to decline call", error);
        showToast(i18n.t("adapter.social.call.decline_failed"), {
            variant: "error",
        });
    }
}

async function answerCall(callId, roomId) {
    if (!callId || !roomId) return false;
    await uiCtx.capabilities.get("ui:navigate")?.(
        `/messages/${encodeURIComponent(roomId)}?call=${encodeURIComponent(callId)}&answer=1`,
    );
    return true;
}

window.addEventListener("cognis:call-decline-requested", (event) => {
    void declineCall(
        String(event.detail?.callId ?? ""),
        String(event.detail?.roomId ?? ""),
    );
});

window.addEventListener("cognis:notification-arrival", (event) => {
    const notification = event.detail?.notification;
    if (notification?.category !== "calls") return;
    const callId = String(notification.metadata?.callId ?? "");
    if (!callId || inboundTones.has(callId)) return;
    inboundTones.set(callId, startRingingTone("inbound"));
});

window.addEventListener("cognis:room-call-state", (event) => {
    if (event.detail?.active) return;
    for (const [callId, stopTone] of inboundTones) {
        stopTone();
        inboundTones.delete(callId);
    }
});

uiCtx.capabilities.contribute(CALL_UI_CAPABILITY, {
    resolveRoomCall,
    startRoomCall,
    answerRequestedCall,
    answerCall,
    declineCall,
});
