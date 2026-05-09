import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
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
        script.onerror = () =>
            reject(new Error("Jitsi Meet API failed to load"));
        document.head.appendChild(script);
    });
    return jitsiScriptPromise;
}

function getAvatarUrl(user) {
    if (!user?.avatarKey) return undefined;
    return `/api/v1/files/${user.avatarKey}`;
}

function buildJitsiOptions(meeting, jwt) {
    const roomName = meeting.tenant
        ? `${meeting.tenant}/${meeting.roomName}`
        : meeting.roomName;
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
        jwt: jwt || undefined,
        configOverwrite: {
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

async function mountJitsi(meeting, jwt = "") {
    if (!meetingContainer) return;
    jitsiApi?.dispose?.();
    meetingContainer.replaceChildren();
    await loadJitsiScript(meeting.domain);
    jitsiApi = new window.JitsiMeetExternalAPI(
        meeting.domain,
        buildJitsiOptions(meeting, jwt),
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
    const authPanel = activeMeeting?.authenticationRequired
        ? `<div class="meet-auth-panel">
          <label for="meet-auth-token">${escapeHtml(i18n.t("module.jitsiMeet.auth_token"))}</label>
          <div class="meet-auth-row">
            <input id="meet-auth-token" type="password" autocomplete="off" />
            <button class="btn-confirm btn-animated" type="button" data-meet-action="join-authenticated">${escapeHtml(i18n.t("module.jitsiMeet.join"))}</button>
          </div>
        </div>`
        : "";
    return `
      <div class="meet-panel">
        <div class="meet-selector">
          <label for="meet-follower-select">${escapeHtml(i18n.t("module.jitsiMeet.meet_with"))}</label>
          <select id="meet-follower-select">${renderFollowerOptions()}</select>
          <button class="btn-confirm btn-animated" type="button" data-meet-action="start" ${followers.length ? "" : "disabled"}>${escapeHtml(i18n.t("module.jitsiMeet.start"))}</button>
        </div>
        ${authPanel}
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
        if (!activeMeeting.authenticationRequired) {
            meetingContainer = document.querySelector("#jitsi-meeting-stage");
            await mountJitsi(activeMeeting);
        } else {
            showToast(i18n.t("module.jitsiMeet.auth_required"), {
                variant: "info",
            });
        }
    } catch (error) {
        showToast(error.message || i18n.t("module.jitsiMeet.start_failed"), {
            variant: "error",
        });
    }
}

async function joinAuthenticatedMeeting() {
    if (!activeMeeting) return;
    const token = document.querySelector("#meet-auth-token")?.value ?? "";
    if (activeMeeting.authMode === "jwt" && !token.trim()) {
        showToast(i18n.t("module.jitsiMeet.token_required"), {
            variant: "warning",
        });
        return;
    }
    meetingContainer = document.querySelector("#jitsi-meeting-stage");
    await mountJitsi(activeMeeting, token.trim());
}

function openMeetingTab() {
    if (!activeMeeting) return;
    const roomName = activeMeeting.tenant
        ? `${activeMeeting.tenant}/${activeMeeting.roomName}`
        : activeMeeting.roomName;
    window.open(
        `https://${activeMeeting.domain}/${roomName}`,
        "_blank",
        "noopener",
    );
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
            if (action === "join-authenticated")
                await joinAuthenticatedMeeting();
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
            onUnmount: () => jitsiApi?.dispose?.(),
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
    signal?.addEventListener("abort", () => jitsiApi?.dispose?.(), {
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
