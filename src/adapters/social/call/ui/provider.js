import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import {
    createCall,
    getCall,
    getRoomCall,
    setCallRinging,
    updateCall,
} from "./client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { startRingingTone } from "./tone-player.js";

const CALL_UI_CAPABILITY = "social:callUi";
const VOIP_PROVIDER_CAPABILITY = "voip:startCall";
const ROOM_ACTIONS_FLOW = "messages:compose-room-actions";
const ROOM_ACTION_FLOW = "messages:activate-room-action";
const POLL_INTERVAL_MILLISECONDS = 1_000;
let activeCall = null;
let callI18n = null;
const inboundTones = new Map();
const answerSpawnPermits = new Map();
const ringerId = window.crypto.randomUUID();

function stopInboundTone(callId) {
    const tone = inboundTones.get(callId);
    inboundTones.delete(callId);
    if (!tone) return;
    window.clearInterval(tone.renewalId);
    tone.stop();
    void setCallRinging(callId, ringerId, false);
}

async function startInboundTone(callId) {
    if (!callId || inboundTones.has(callId)) return;
    inboundTones.set(callId, null);
    if (!(await setCallRinging(callId, ringerId))) {
        inboundTones.delete(callId);
        return;
    }
    const stop = startRingingTone("inbound");
    const renewalId = window.setInterval(
        () => void setCallRinging(callId, ringerId),
        4_000,
    );
    inboundTones.set(callId, { stop, renewalId });
}

function resolveCallPrompts(callId, roomId) {
    stopInboundTone(callId);
    window.dispatchEvent(
        new CustomEvent("cognis:notification-resolved", {
            detail: { correlationId: callId },
        }),
    );
    announceRoomCall(roomId, false);
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

async function createStage(call) {
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
    stage.className = "social-call-stage";
    stage.dataset.callId = call.id;
    stage.dataset.roomId = call.roomId;
    stage.innerHTML = `<div class="social-call-stage__toolbar"><button type="button" class="social-call-stage__back btn-neutral" title="${i18n.t("adapter.social.call.move_to_pip")}" aria-label="${i18n.t("adapter.social.call.move_to_pip")}" hidden><span class="social-call-stage__back-icon" aria-hidden="true"></span></button><strong>${i18n.t("adapter.social.call.window_title")}</strong></div><div class="social-call-stage__ringing"><p>${i18n.t("adapter.social.call.ringing").replace("{{user}}", otherParticipantLabel(call))}</p><button type="button" class="social-call-stage__hangup btn-cancel" title="${i18n.t("adapter.social.call.hangup")}" aria-label="${i18n.t("adapter.social.call.hangup")}"><img src="/static/adapters/social/call/hangup.svg" alt="" /></button></div>`;
    headerSlot.after(stage);
    thread.classList.add("messages-thread--call-active");
    let componentWindow = null;
    let releaseFloatingWindow = null;
    let isFloating = false;
    let connected = false;
    let closeObserver = null;
    const lifecycleController = new AbortController();
    const cleanup = async ({ leave = true } = {}) => {
        lifecycleController.abort();
        closeObserver?.disconnect();
        releaseFloatingWindow?.();
        if (connected && leave) {
            connected = false;
            try {
                await updateCall(call.id, "leave");
            } catch (error) {
                console.error("[calls] Failed to leave call", {
                    callId: call.id,
                    roomId: call.roomId,
                    error,
                });
                showToast(
                    (await getCallI18n()).t("adapter.social.call.leave_failed"),
                    { variant: "error" },
                );
            }
        }
        await componentWindow?.discard?.();
        const hostingThread = stage.closest(".messages-thread") ?? thread;
        stage.remove();
        hostingThread.classList.remove("messages-thread--call-active");
        const currentCallButton =
            document.getElementById("messages-room-call-btn") ?? callButton;
        currentCallButton?.classList.remove("active");
        currentCallButton?.setAttribute("aria-pressed", "false");
        if (currentCallButton instanceof HTMLButtonElement)
            currentCallButton.disabled = false;
        if (activeCall?.stage === stage) activeCall = null;
    };
    activeCall = { callId: call.id, cleanup, stage };
    announceRoomCall(call.roomId, true);
    stage.querySelector(".social-call-stage__hangup")?.addEventListener(
        "click",
        async () => {
            try {
                await updateCall(call.id, "hangup");
                await cleanup({ leave: false });
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
        { signal: lifecycleController.signal },
    );
    return {
        stage,
        i18n,
        signal: lifecycleController.signal,
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
        markDocked() {
            isFloating = false;
        },
        markConnected() {
            connected = true;
        },
        setCloseObserver(value) {
            closeObserver = value;
        },
    };
}

function isCurrentMessagesRoom(callStage) {
    return (
        callStage.stage.isConnected &&
        window.location.pathname ===
            `/messages/${encodeURIComponent(callStage.stage.dataset.roomId)}`
    );
}

async function returnCallStageToMessages(callStage) {
    const roomId = callStage.stage.dataset.roomId;
    const navigate = uiCtx.capabilities.get("ui:navigate");
    if (!roomId || typeof navigate !== "function") return false;
    const mounted = await navigate(`/messages/${encodeURIComponent(roomId)}`);
    if (!mounted) return false;
    const thread = document.querySelector(".messages-thread");
    const headerSlot = document.getElementById("messages-thread-header-slot");
    if (!(thread instanceof HTMLElement) || !headerSlot) return false;
    headerSlot.after(callStage.stage);
    return true;
}

async function requestFloatingCallClose(call, callStage) {
    if (isCurrentMessagesRoom(callStage)) return "dock";
    const result = await openPopup({
        title: callStage.i18n.t("adapter.social.call.close_pip_title"),
        body: callStage.i18n.t("adapter.social.call.close_pip_body"),
        actions: [
            {
                id: "return",
                label: callStage.i18n.t(
                    "adapter.social.call.return_to_messages",
                ),
                variant: "confirm",
            },
            {
                id: "hangup",
                label: callStage.i18n.t("adapter.social.call.hangup"),
                variant: "cancel",
            },
            {
                id: "cancel",
                label: callStage.i18n.t("adapter.social.call.cancel"),
                variant: "neutral",
            },
        ],
    });
    if (result === "return") {
        return (await returnCallStageToMessages(callStage)) ? "return" : null;
    }
    if (result === "hangup") {
        await updateCall(call.id, "hangup");
        return "hangup";
    }
    return null;
}

async function mountProviderAction(
    action,
    callStage,
    signal,
    activationPermit,
) {
    if (action?.action === "navigate") {
        await callStage.cleanup();
        await uiCtx.capabilities.get("ui:navigate")?.(action.url);
        return true;
    }
    if (action?.action !== "component") return false;
    const allowNavigation = action.context?.allowNavigation === true;
    const ringing = callStage.stage.querySelector(
        ".social-call-stage__ringing",
    );
    ringing?.remove();
    const componentHost = document.createElement("div");
    componentHost.id = `call-component-${callStage.stage.dataset.callId}`;
    componentHost.className = "social-call-stage__component";
    callStage.stage.append(componentHost);
    const componentWindow = await uiCtx.capabilities.get(
        "component-pages:spawn",
    )?.({
        componentUuid: action.componentUuid,
        routeId: action.routeId,
        elementId: componentHost.id,
        mode: action.mode ?? "overlay",
        context: { ...action.context, voipCall: true },
        signal,
        borderless: action.borderless !== false,
        removeStageOnDiscard: true,
        activationPermit,
        allowNavigation,
    });
    if (!componentWindow) return false;
    callStage.markConnected();
    callStage.setComponentWindow(componentWindow);
    const windowElement = componentHost.querySelector(".component-page-window");
    if (!(windowElement instanceof HTMLElement)) {
        await callStage.cleanup();
        return false;
    }
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
    const backButton = callStage.stage.querySelector(
        ".social-call-stage__back",
    );
    backButton.hidden = false;
    backButton.addEventListener(
        "click",
        () => {
            if (callStage.isFloating()) return;
            const makeFloatingWindow = uiCtx.capabilities.get(
                "ui:makeFloatingWindow",
            );
            if (!(windowElement instanceof HTMLElement) || !makeFloatingWindow)
                return;
            const pipCloseButton = document.createElement("button");
            pipCloseButton.type = "button";
            pipCloseButton.className =
                "social-call-stage__pip-close btn-close btn-neutral";
            pipCloseButton.setAttribute(
                "aria-label",
                callStage.i18n.t("adapter.social.call.return_from_pip"),
            );
            componentHost.append(pipCloseButton);
            const releaseFloatingWindow = makeFloatingWindow(componentHost, {
                portal: allowNavigation,
                topLayer: true,
                minWidth: action.minSize?.width,
                minHeight: action.minSize?.height,
            });
            callStage.setFloatingRelease(releaseFloatingWindow);
            pipCloseButton.addEventListener(
                "click",
                async () => {
                    pipCloseButton.disabled = true;
                    try {
                        const disposition = await requestFloatingCallClose(
                            call,
                            callStage,
                        );
                        if (!disposition) return;
                        releaseFloatingWindow();
                        callStage.setFloatingRelease(null);
                        pipCloseButton.remove();
                        if (disposition === "hangup") {
                            await callStage.cleanup({ leave: false });
                            announceRoomCall(call.roomId, false);
                            showToast(
                                callStage.i18n.t(
                                    "adapter.social.call.cancelled",
                                ),
                                { variant: "info" },
                            );
                            return;
                        }
                        callStage.markDocked();
                        if (disposition === "return") {
                            window.addEventListener(
                                "cognis:route-will-change",
                                () => void callStage.cleanup(),
                                { once: true, signal: callStage.signal },
                            );
                        } else {
                            componentWindow.setNavigationAllowed?.(false);
                        }
                        callStage.stage.classList.remove(
                            "social-call-stage--floating",
                        );
                        document
                            .querySelector(".messages-thread")
                            ?.classList.add("messages-thread--call-active");
                        backButton.hidden = false;
                        const currentCallButton = document.getElementById(
                            "messages-room-call-btn",
                        );
                        currentCallButton?.classList.add("active");
                        currentCallButton?.setAttribute("aria-pressed", "true");
                        if (currentCallButton instanceof HTMLButtonElement) {
                            currentCallButton.disabled = false;
                        }
                    } catch (error) {
                        console.error(
                            "[calls] Failed to close floating call",
                            error,
                        );
                        showToast(
                            callStage.i18n.t(
                                "adapter.social.call.close_pip_failed",
                            ),
                            { variant: "error" },
                        );
                    } finally {
                        pipCloseButton.disabled = false;
                    }
                },
                { signal: callStage.signal },
            );
            callStage.markFloating();
            componentWindow.setNavigationAllowed?.(true);
            componentWindow.restoreHostLayout?.();
            backButton.hidden = true;
            callStage.stage.classList.add("social-call-stage--floating");
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
        },
        { signal: callStage.signal },
    );
    return true;
}

async function waitForAnswer(call, callStage, signal, activationPermit) {
    while (!signal?.aborted && activeCall?.callId === call.id) {
        const current = await getCall(call.id);
        if (current.status === "active") {
            const action = await resolveProviderAction(current);
            return mountProviderAction(
                action,
                callStage,
                signal,
                activationPermit,
            );
        }
        if (["ended", "expired"].includes(current.status)) {
            await callStage.cleanup({ leave: false });
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
    const roomId = String(room.id);
    const call = await getRoomCall(roomId);
    return {
        roomId,
        room,
        call,
        state: call?.status ?? "available",
    };
}

async function startRoomCall(action, { signal } = {}) {
    const activationPermit = uiCtx.capabilities.get(
        "component-pages:createSpawnPermit",
    )?.();
    let call = action.call;
    if (
        call?.status === "ringing" &&
        call.callerAccountId !== currentAccountId()
    ) {
        call = await updateCall(call.id, "answer");
        stopInboundTone(call.id);
    }
    call ??= await createCall(action.roomId);
    const stopTone = startRingingTone("outbound");
    const callStage = await createStage(call);
    if (!callStage) {
        stopTone();
        return false;
    }
    try {
        if (call.status === "active") {
            stopTone();
            const providerAction = await resolveProviderAction(call);
            const mounted = await mountProviderAction(
                providerAction,
                callStage,
                signal,
                activationPermit,
            );
            if (!mounted) await callStage.cleanup();
            return mounted;
        }
        return await waitForAnswer(call, callStage, signal, activationPermit);
    } finally {
        stopTone();
    }
}

async function answerRequestedCall({ signal } = {}) {
    const url = new URL(window.location.href);
    const callId = url.searchParams.get("call");
    if (!callId || url.searchParams.get("answer") !== "1") return false;
    const call = await updateCall(callId, "answer");
    const activationPermit = answerSpawnPermits.get(callId) ?? null;
    answerSpawnPermits.delete(callId);
    stopInboundTone(callId);
    resolveCallPrompts(callId, call.roomId);
    const callStage = await createStage(call);
    if (!callStage) return false;
    history.replaceState(
        {},
        "",
        `/messages/${encodeURIComponent(call.roomId)}`,
    );
    const action = await resolveProviderAction(call);
    const mounted = await mountProviderAction(
        action,
        callStage,
        signal,
        activationPermit,
    );
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
        resolveCallPrompts(callId, roomId);
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
    const activationPermit = uiCtx.capabilities.get(
        "component-pages:createSpawnPermit",
    )?.();
    if (activationPermit) answerSpawnPermits.set(callId, activationPermit);
    await uiCtx.capabilities.get("ui:navigate")?.(
        `/messages/${encodeURIComponent(roomId)}?call=${encodeURIComponent(callId)}&answer=1`,
    );
    return true;
}

window.addEventListener("cognis:notification-command", (event) => {
    const { actionId, notification } = event.detail ?? {};
    const callId = String(notification?.metadata?.callId ?? "");
    const roomId = String(notification?.metadata?.roomId ?? "");
    if (actionId === "answer") {
        void answerCall(callId, roomId);
    }
    if (actionId === "decline") void declineCall(callId, roomId);
});

window.addEventListener("cognis:notification-arrival", (event) => {
    const notification = event.detail?.notification;
    if (notification?.category !== "calls") return;
    const callId = String(notification.metadata?.callId ?? "");
    void startInboundTone(callId);
});

window.addEventListener("cognis:room-call-state", (event) => {
    if (event.detail?.active) return;
    for (const callId of inboundTones.keys()) stopInboundTone(callId);
});

uiCtx.capabilities.contribute(CALL_UI_CAPABILITY, {
    resolveRoomCall,
    startRoomCall,
    answerRequestedCall,
    answerCall,
    declineCall,
});

function installMessagesFlowHooks() {
    if (
        !uiCtx.flowExists(ROOM_ACTIONS_FLOW) ||
        !uiCtx.flowExists(ROOM_ACTION_FLOW)
    )
        return;
    uiCtx.extendFlow(
        ROOM_ACTIONS_FLOW,
        "contribute",
        { id: "social-call:contribute-room-action" },
        async (stageContext) => {
            const action = await resolveRoomCall(stageContext.input.room);
            if (!action) return;
            const i18n = await getCallI18n();
            stageContext.data.actions ??= [];
            stageContext.data.actions.push({
                ...action,
                id: "social-call:start",
                elementId: "messages-room-call-btn",
                className: "messages-room-call-btn btn-confirm",
                label: i18n.t("adapter.social.call.start_video_call"),
                active: action.state === "active",
                iconSvg:
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 8.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2.5l5 3.5a1 1 0 0 0 1.57-.82V6.82A1 1 0 0 0 20 6l-5 3.5Z"/></svg>',
            });
            if (
                action.call?.status === "ringing" &&
                action.call.callerAccountId !== currentAccountId()
            ) {
                stageContext.data.actions.push({
                    id: "social-call:incoming-prompt",
                    placement: "after-header",
                    label: i18n.t("adapter.social.call.incoming_call"),
                    actions: [
                        {
                            id: "call:answer",
                            callId: action.call.id,
                            roomId: action.roomId,
                            label: i18n.t("adapter.social.call.answer"),
                            className: "btn-confirm",
                            iconSvg:
                                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8c1.5 2.9 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"/></svg>',
                        },
                        {
                            id: "call:decline",
                            callId: action.call.id,
                            roomId: action.roomId,
                            label: i18n.t("adapter.social.call.decline"),
                            className: "btn-cancel",
                            iconSvg:
                                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.6 13.2 2.3 2.2c.2.2.3.6.2 1-.4 1.1-.6 2.3-.6 3.6 0 .6-.4 1-1 1H4c-.6 0-1-.4-1-1 0-9.4 7.6-17 17-17 .6 0 1 .4 1 1v3.5c0 .6-.4 1-1 1-1.3 0-2.5.2-3.6.6-.4.2-.8.1-1-.2l-2.2-2.2c-2.8 1.4-5.2 3.7-6.6 6.5Z"/></svg>',
                        },
                    ],
                });
            }
        },
    );
    uiCtx.extendFlow(
        ROOM_ACTION_FLOW,
        "activate",
        { id: "social-call:activate-room-action" },
        async ({ input }) => {
            if (input.action?.id === "social-call:start") {
                return startRoomCall(input.action, input.options);
            }
            if (input.action?.id === "call:answer") {
                return answerCall(input.action.callId, input.action.roomId);
            }
            if (input.action?.id === "call:decline") {
                return declineCall(input.action.callId, input.action.roomId);
            }
            if (input.action?.id === "page:mounted") {
                return answerRequestedCall(input.options);
            }
        },
    );
}

installMessagesFlowHooks();
window.addEventListener(
    "cognis:messages-flows-ready",
    installMessagesFlowHooks,
);
