import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

const API_BASE = "/api/v1/modules/jitsi-meet";
const DEFAULT_TITLE = "Cognis Meeting";

let i18n = null;
let composer = null;
let followers = [];
let activeMeeting = null;
let jitsiApi = null;
let jitsiScriptPromise = null;
let meetingContainer = null;
let pipWindow = null;
let moderatorAuthPromptOpen = false;
let jitsiMessageCleanup = null;

function getJitsiOrigin(meeting) {
    return `https://${meeting.domain}`;
}

function getMeetingRoomPath(meeting) {
    return meeting.tenant
        ? `${meeting.tenant}/${meeting.roomName}`
        : meeting.roomName;
}

function getMeetingUrl(meeting) {
    return `${getJitsiOrigin(meeting)}/${getMeetingRoomPath(meeting)}`;
}

function currentAccount() {
    return localStorage.getItem("cognis_account") ?? "";
}

function currentDisplayName() {
    return (
        localStorage.getItem("cognis_display_name") || currentAccount() || ""
    );
}

async function readJsonResponse(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Request failed");
    }
    return payload?.data ?? null;
}

async function loadFollowers() {
    const response = await apiFetch(`${API_BASE}/followers`);
    return (await readJsonResponse(response)) ?? [];
}

async function createMeeting(accountId) {
    const response = await apiFetch(`${API_BASE}/meeting`, {
        method: "POST",
        body: JSON.stringify({ accountId, title: DEFAULT_TITLE }),
    });
    return readJsonResponse(response);
}

function loadJitsiScript(domain) {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (jitsiScriptPromise) return jitsiScriptPromise;
    jitsiScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("jitsi_api_load_failed"));
        document.head.appendChild(script);
    });
    return jitsiScriptPromise;
}

function getAvatarUrl(user) {
    if (!user?.avatarKey) return undefined;
    return `/api/v1/files/${user.avatarKey}`;
}

function buildJitsiOptions(meeting) {
    const roomName = getMeetingRoomPath(meeting);
    const userInfo = {
        displayName:
            meeting.user?.displayName ||
            meeting.user?.handle ||
            currentDisplayName(),
    };
    const avatarUrl = getAvatarUrl(meeting.user);
    if (avatarUrl) userInfo.avatarUrl = avatarUrl;

    return {
        roomName,
        parentNode: meetingContainer,
        userInfo,
        configOverwrite: {
            apiLogLevels: ["error", "warn", "info", "debug"],
            subject: meeting.title || DEFAULT_TITLE,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            toolbarButtons: [
                "microphone",
                "camera",
                "closedcaptions",
                "desktop",
                "fullscreen",
                "fodeviceselection",
                "hangup",
                "profile",
                "recording",
                "livestreaming",
                "etherpad",
                "sharedvideo",
                "settings",
                "raisehand",
                "videoquality",
                "filmstrip",
                "feedback",
                "stats",
                "shortcuts",
                "tileview",
                "videobackgroundblur",
                "download",
                "help",
                "mute-everyone",
                "security",
            ],
        },
        interfaceConfigOverwrite: {
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_JITSI_WATERMARK: false,
        },
    };
}

function disposeJitsi() {
    jitsiMessageCleanup?.();
    jitsiMessageCleanup = null;
    jitsiApi?.dispose?.();
    jitsiApi = null;
}

function eventMentionsModeratorAuth(payload) {
    let text = "";
    try {
        text = JSON.stringify(payload ?? "").toLowerCase();
    } catch {
        text = String(payload ?? "").toLowerCase();
    }
    const mentionsModerator =
        text.includes("moderator") ||
        text.includes("host") ||
        text.includes("owner");
    const mentionsAuth =
        text.includes("auth") ||
        text.includes("login") ||
        text.includes("log in") ||
        text.includes("sign in") ||
        text.includes("waiting for") ||
        text.includes("wait for");
    return mentionsModerator && mentionsAuth;
}

function renderModeratorAuthPlaceholder() {
    meetingContainer?.replaceChildren();
    const placeholder = document.createElement("div");
    placeholder.className = "meet-empty";
    placeholder.innerHTML = `
      <strong>${escapeHtml(i18n.t("module.jitsiMeet.moderator_auth.title"))}</strong>
      <span>${escapeHtml(i18n.t("module.jitsiMeet.moderator_auth.detected"))}</span>
    `;
    meetingContainer?.append(placeholder);
}

function openModeratorAuthWindow() {
    if (!activeMeeting) return null;
    const authWindow = window.open(
        getMeetingUrl(activeMeeting),
        "cognis-jitsi-moderator-auth",
        "popup=yes,width=1080,height=760",
    );
    if (!authWindow) return null;
    authWindow.opener = null;
    authWindow.focus?.();
    return authWindow;
}

async function promptForModeratorAuth({ detected = false } = {}) {
    if (!activeMeeting || moderatorAuthPromptOpen) return false;
    moderatorAuthPromptOpen = true;
    let authWindow = null;

    const result = await openPopup({
        title: i18n.t("module.jitsiMeet.moderator_auth.title"),
        body: `
          <p>${escapeHtml(
              detected
                  ? i18n.t("module.jitsiMeet.moderator_auth.detected")
                  : i18n.t("module.jitsiMeet.moderator_auth.body"),
          )}</p>
          <p>${escapeHtml(i18n.t("module.jitsiMeet.moderator_auth.instructions"))}</p>
        `,
        maxWidth: "560px",
        actions: [
            {
                id: "open-login",
                label: i18n.t("module.jitsiMeet.moderator_auth.open"),
                variant: "confirm",
            },
            {
                id: "done",
                label: i18n.t("module.jitsiMeet.moderator_auth.done"),
                variant: "neutral",
            },
            {
                id: "cancel",
                label: i18n.t("module.jitsiMeet.moderator_auth.cancel"),
                variant: "cancel",
            },
        ],
        onAction: (actionId) => {
            if (actionId !== "open-login") return true;
            authWindow = openModeratorAuthWindow();
            if (authWindow) {
                showToast(i18n.t("module.jitsiMeet.moderator_auth.opened"), {
                    variant: "info",
                });
            } else {
                showToast(i18n.t("module.jitsiMeet.moderator_auth.blocked"), {
                    variant: "warning",
                });
            }
            return false;
        },
    });

    if (authWindow && !authWindow.closed) {
        authWindow.close();
    }
    moderatorAuthPromptOpen = false;
    return result === "done";
}

async function handleModeratorAuthRequired(payload) {
    if (!eventMentionsModeratorAuth(payload) || !activeMeeting) return;
    if (moderatorAuthPromptOpen) return;
    disposeJitsi();
    renderModeratorAuthPlaceholder();
    const shouldRetry = await promptForModeratorAuth({ detected: true });
    if (shouldRetry && activeMeeting) {
        meetingContainer = document.querySelector("#jitsi-meeting-stage");
        await mountJitsi(activeMeeting);
    }
}

function bindJitsiMessageCapture(meeting) {
    jitsiMessageCleanup?.();
    const expectedOrigin = getJitsiOrigin(meeting);
    const messageHandler = (messageEvent) => {
        if (messageEvent.origin !== expectedOrigin) return;
        void handleModeratorAuthRequired(messageEvent.data);
    };
    window.addEventListener("message", messageHandler);
    jitsiMessageCleanup = () =>
        window.removeEventListener("message", messageHandler);
}

async function mountJitsi(meeting) {
    if (!meetingContainer) return;
    disposeJitsi();
    meetingContainer.replaceChildren();
    await loadJitsiScript(meeting.domain);
    bindJitsiMessageCapture(meeting);
    jitsiApi = new window.JitsiMeetExternalAPI(
        meeting.domain,
        buildJitsiOptions(meeting),
    );
    jitsiApi.addListener("videoConferenceJoined", () => {
        jitsiApi.executeCommand("subject", meeting.title || DEFAULT_TITLE);
        showToast(i18n.t("module.jitsiMeet.joined"), { variant: "success" });
    });
    jitsiApi.addListener("readyToClose", () => {
        showToast(i18n.t("module.jitsiMeet.left"), { variant: "info" });
    });
    jitsiApi.addListener("participantRoleChanged", (event) => {
        if (event?.role === "moderator") {
            jitsiApi.executeCommand("subject", meeting.title || DEFAULT_TITLE);
        }
    });
    jitsiApi.addListener("notificationTriggered", (event) => {
        void handleModeratorAuthRequired(event);
    });
    jitsiApi.addListener("errorOccurred", (event) => {
        void handleModeratorAuthRequired(event);
    });
    jitsiApi.addListener("log", (event) => {
        void handleModeratorAuthRequired(event);
    });
}

function renderFollowerOptions() {
    if (!followers.length) {
        return `<option value="">${escapeHtml(i18n.t("module.jitsiMeet.no_followers"))}</option>`;
    }
    return [
        `<option value="">${escapeHtml(i18n.t("module.jitsiMeet.select_follower"))}</option>`,
        ...followers.map((user) => {
            const label = user.displayName || user.handle || user.accountId;
            return `<option value="${escapeHtml(user.accountId)}">${escapeHtml(label)}</option>`;
        }),
    ].join("");
}

function renderMeetingWindow() {
    return `
      <div class="meet-panel">
        <div class="meet-selector">
          <label for="meet-follower-select">${escapeHtml(i18n.t("module.jitsiMeet.meet_with"))}</label>
          <select id="meet-follower-select">${renderFollowerOptions()}</select>
          <button class="btn-confirm btn-animated" type="button" data-meet-action="start" ${followers.length ? "" : "disabled"}>${escapeHtml(i18n.t("module.jitsiMeet.start"))}</button>
        </div>
        <div class="meet-stage-wrap">
          <div id="jitsi-meeting-stage" class="meet-stage">
            <div class="meet-empty">
              <strong>${escapeHtml(i18n.t("module.jitsiMeet.ready_title"))}</strong>
              <span>${escapeHtml(i18n.t("module.jitsiMeet.ready_body"))}</span>
            </div>
          </div>
          <div class="meet-overlay-actions" aria-label="${escapeHtml(i18n.t("module.jitsiMeet.actions"))}">
            <button type="button" data-meet-action="toggle-audio">♫ ${escapeHtml(i18n.t("module.jitsiMeet.audio"))}</button>
            <button type="button" data-meet-action="toggle-video">◉ ${escapeHtml(i18n.t("module.jitsiMeet.video"))}</button>
            <button type="button" data-meet-action="pip">▣ ${escapeHtml(i18n.t("module.jitsiMeet.pop_out"))}</button>
            <button type="button" data-meet-action="tab">↗ ${escapeHtml(i18n.t("module.jitsiMeet.new_tab"))}</button>
          </div>
        </div>
      </div>`;
}

function renderChatWindow() {
    return `
      <div class="meet-chat-placeholder">
        <h3>${escapeHtml(i18n.t("module.jitsiMeet.chat_title"))}</h3>
        <p>${escapeHtml(i18n.t("module.jitsiMeet.chat_placeholder"))}</p>
        <div class="meet-chat-bubble">${escapeHtml(i18n.t("module.jitsiMeet.chat_sample"))}</div>
      </div>`;
}

async function startSelectedMeeting() {
    const select = document.querySelector("#meet-follower-select");
    const accountId = select?.value ?? "";
    if (!accountId) {
        showToast(i18n.t("module.jitsiMeet.select_required"), {
            variant: "warning",
        });
        return;
    }
    try {
        activeMeeting = await createMeeting(accountId);
        composer.refresh(elements());
        meetingContainer = document.querySelector("#jitsi-meeting-stage");
        if (activeMeeting.authenticationRequired) {
            const shouldContinue = await promptForModeratorAuth();
            if (!shouldContinue) return;
        }
        await mountJitsi(activeMeeting);
    } catch (error) {
        const message =
            error?.message === "jitsi_api_load_failed"
                ? i18n.t("module.jitsiMeet.api_load_failed")
                : error.message || i18n.t("module.jitsiMeet.start_failed");
        showToast(message, {
            variant: "error",
        });
    }
}

function openMeetingTab() {
    if (!activeMeeting) return;
    window.open(getMeetingUrl(activeMeeting), "_blank", "noopener");
}

async function popOutMeeting() {
    if (!meetingContainer || !jitsiApi) {
        openMeetingTab();
        return;
    }
    if (!window.documentPictureInPicture?.requestWindow) {
        openMeetingTab();
        return;
    }
    pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 960,
        height: 540,
    });
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.append(meetingContainer);
    pipWindow.addEventListener("pagehide", () => {
        document.querySelector(".meet-stage-wrap")?.prepend(meetingContainer);
        pipWindow = null;
    });
}

function bindMeetingActions() {
    meetingContainer = document.querySelector("#jitsi-meeting-stage");
    document.querySelectorAll("[data-meet-action]").forEach((button) => {
        button.addEventListener("click", async () => {
            const action = button.dataset.meetAction;
            if (action === "start") await startSelectedMeeting();
            if (action === "toggle-audio")
                jitsiApi?.executeCommand("toggleAudio");
            if (action === "toggle-video")
                jitsiApi?.executeCommand("toggleVideo");
            if (action === "pip") await popOutMeeting();
            if (action === "tab") openMeetingTab();
        });
    });
}

function elements() {
    return [
        {
            id: "meeting-window",
            label: i18n.t("module.jitsiMeet.meeting_window"),
            pinned: true,
            gridSize: { default: [8, 5], min: [4, 4], max: "full" },
            render: renderMeetingWindow,
            onRender: bindMeetingActions,
            onUnmount: disposeJitsi,
        },
        {
            id: "chat-window",
            label: i18n.t("module.jitsiMeet.chat_window"),
            gridSize: { default: [4, 5], min: [3, 3], max: ["half", 6] },
            render: renderChatWindow,
        },
    ];
}

export async function mount(root, { signal } = {}) {
    i18n = await createI18n();
    applyDocumentTitle(i18n, "module.jitsiMeet.page_title");
    try {
        followers = await loadFollowers();
    } catch (error) {
        followers = [];
        showToast(i18n.t("module.jitsiMeet.followers_failed"), {
            variant: "error",
        });
    }
    signal?.addEventListener("abort", disposeJitsi, {
        once: true,
    });
    composer = createPageComposer(root, {
        allowCustomization: true,
        elements: elements(),
        preferenceKey: "jitsi-meet-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.jitsiMeet.page_title"),
            subtitle: i18n.t("module.jitsiMeet.page_subtitle"),
        },
    });
    await composer.init();
}

if (!globalThis.__spaRouter) {
    const root = document.querySelector("#app");
    if (root) await mount(root);
}
