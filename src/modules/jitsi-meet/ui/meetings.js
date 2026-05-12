import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";

const jitsiExternalApiLoaders = new Map();
const ACCOUNT_STORAGE_KEY = "cognis_account";
const DISPLAY_NAME_STORAGE_KEY = "cognis_display_name";

let i18n = null;
let composer = null;
let allEligibleUsers = [];
let selectedUsers = [];
let searchResults = [];
let meetings = [];
let activeMeetingId = null;
let activeMeetingSession = null;
let jitsiApi = null;
let userProfile = null;

/**
 * Returns the account IDs currently selected for the meeting.
 *
 * @returns {string[]}
 */
function selectedUserIds() {
    return selectedUsers.map((user) => user.accountId);
}

/**
 * Builds a human-readable label for a user entry.
 *
 * @param {{ displayName?: string, handle?: string, accountId: string }} user
 * @returns {string}
 */
function userLabel(user) {
    return user.displayName || user.handle || user.accountId;
}

function mergeUsers(users) {
    const deduped = new Map();
    for (const user of users) {
        if (!user?.accountId) continue;
        deduped.set(user.accountId, {
            accountId: user.accountId,
            handle: user.handle ?? user.accountId,
            displayName: user.displayName ?? user.handle ?? user.accountId,
            avatarKey: user.avatarKey ?? null,
        });
    }
    return Array.from(deduped.values());
}

async function loadProfile() {
    const response = await apiFetch("/api/v1/profile");
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.data ?? null;
}

async function loadEligibleUsers() {
    if (!userProfile?.handle) {
        allEligibleUsers = [];
        return;
    }
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(userProfile.handle)}/followers`,
    );
    if (!response.ok) {
        allEligibleUsers = [];
        return;
    }
    const payload = await response.json();
    allEligibleUsers = mergeUsers(payload?.data ?? []);
}

async function searchUsers(query) {
    const trimmed = query.trim();
    if (!trimmed) {
        searchResults = [];
        return;
    }
    const response = await apiFetch(
        `/api/v1/users/search?q=${encodeURIComponent(trimmed)}`,
    );
    if (!response.ok) {
        searchResults = [];
        return;
    }
    const payload = await response.json();
    searchResults = mergeUsers(payload?.data ?? []);
}

async function loadMeetings() {
    const response = await apiFetch("/api/v1/modules/jitsi-meet/meetings");
    if (!response.ok) {
        meetings = [];
        return;
    }
    const payload = await response.json();
    meetings = Array.isArray(payload?.data) ? payload.data : [];
}

function renderUserCard(user) {
    return `
        <li class="meetings-user" draggable="true" data-user-id="${escapeHtml(user.accountId)}">
            <div>
                <div class="meetings-user-title">${escapeHtml(userLabel(user))}</div>
                <div class="meetings-user-subtitle">@${escapeHtml(user.handle || user.accountId)}</div>
            </div>
        </li>
    `;
}

function availableUsersForRender() {
    const selectedIds = new Set(selectedUserIds());
    const merged = mergeUsers([...searchResults, ...allEligibleUsers]);
    return merged.filter((user) => !selectedIds.has(user.accountId));
}

function renderMeetingPanel() {
    return `
        <section class="meetings-panel">
            <div class="meetings-toolbar">
                <button type="button" class="btn-neutral btn-animated" data-meetings-refresh-session>
                    ${escapeHtml(i18n.t("module.jitsi_meet.refresh_session"))}
                </button>
                <button type="button" class="btn-neutral btn-animated" data-meetings-new-tab>
                    ${escapeHtml(i18n.t("module.jitsi_meet.open_new_tab"))}
                </button>
            </div>
            <div class="meetings-stage">
                <div id="jitsi-meet-container" class="meetings-stage-frame"></div>
                <div class="meetings-overlay">
                    <button type="button" class="btn-confirm btn-animated" data-meetings-restart>
                        ${escapeHtml(i18n.t("module.jitsi_meet.restart_meeting"))}
                    </button>
                </div>
            </div>
            <p class="meetings-status">${escapeHtml(activeMeetingSession ? activeMeetingSession.title : i18n.t("module.jitsi_meet.no_session"))}</p>
        </section>
    `;
}

function renderParticipantsPanel() {
    const availableUsers = availableUsersForRender();
    const meetingsOptions = meetings
        .map(
            (meeting) =>
                `<option value="${escapeHtml(meeting.id)}">${escapeHtml(meeting.title)} • ${escapeHtml(meeting.id)}</option>`,
        )
        .join("");
    return `
        <section class="meetings-panel">
            <div class="meetings-row">
                <input type="text" class="theme-input meetings-input" placeholder="${escapeHtml(i18n.t("module.jitsi_meet.search_users"))}" data-meetings-user-search />
            </div>
            <div class="meetings-row">
                <input type="text" class="theme-input meetings-input" placeholder="${escapeHtml(i18n.t("module.jitsi_meet.classroom_id"))}" data-meetings-classroom-id />
            </div>
            <div class="meetings-row">
                <button type="button" class="btn-confirm btn-animated" data-meetings-create>
                    ${escapeHtml(i18n.t("module.jitsi_meet.start_meeting"))}
                </button>
                <select class="theme-select" data-meetings-existing>
                    <option value="">${escapeHtml(i18n.t("ui.reuse.loading"))}</option>
                    ${meetingsOptions}
                </select>
            </div>
            <p class="meetings-status">${escapeHtml(i18n.t("module.jitsi_meet.drag_hint"))}</p>
            <div class="meetings-columns">
                <div>
                    <h3>${escapeHtml(i18n.t("module.jitsi_meet.available_users"))}</h3>
                    <ul class="meetings-list" data-meetings-available>
                        ${availableUsers.map((user) => renderUserCard(user)).join("")}
                    </ul>
                </div>
                <div>
                    <h3>${escapeHtml(i18n.t("module.jitsi_meet.selected_users"))}</h3>
                    <ul class="meetings-list" data-meetings-selected>
                        ${selectedUsers.map((user) => renderUserCard(user)).join("")}
                    </ul>
                </div>
            </div>
        </section>
    `;
}

function renderChatPanel() {
    const hasChatroom = Boolean(activeMeetingSession?.chatroomId);
    return `
        <section class="meetings-panel">
            <p class="meetings-status">
                ${escapeHtml(
                    hasChatroom
                        ? i18n.t("module.jitsi_meet.chat_ready")
                        : i18n.t("module.jitsi_meet.chat_unavailable"),
                )}
            </p>
            <button
                type="button"
                class="btn-neutral btn-animated"
                data-meetings-open-chat
                ${hasChatroom ? "" : "disabled"}
            >
                ${escapeHtml(i18n.t("module.jitsi_meet.chat_open"))}
            </button>
        </section>
    `;
}

function getElements() {
    return [
        {
            id: "meeting-window",
            label: i18n.t("module.jitsi_meet.meeting_panel"),
            gridSize: { default: [8, 6], min: [4, 4], max: ["full", "fill"] },
            render: renderMeetingPanel,
        },
        {
            id: "meeting-participants",
            label: i18n.t("module.jitsi_meet.participants_panel"),
            gridSize: { default: [4, 6], min: [3, 4], max: ["half", "fill"] },
            render: renderParticipantsPanel,
        },
        {
            id: "meeting-chat",
            label: i18n.t("module.jitsi_meet.chat_panel"),
            gridSize: { default: [4, 4], min: [3, 3], max: ["half", "fill"] },
            render: renderChatPanel,
        },
    ];
}

async function ensureExternalApi(baseUrl) {
    if (jitsiExternalApiLoaders.has(baseUrl)) {
        return jitsiExternalApiLoaders.get(baseUrl);
    }
    const loadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `${baseUrl.replace(/\/+$/, "")}/external_api.js`;
        script.async = true;
        script.onload = () => resolve(window.JitsiMeetExternalAPI);
        script.onerror = () =>
            reject(new Error("Failed to load Jitsi external_api.js"));
        document.head.appendChild(script);
    });
    loadingPromise.catch(() => {
        jitsiExternalApiLoaders.delete(baseUrl);
    });
    jitsiExternalApiLoaders.set(baseUrl, loadingPromise);
    return loadingPromise;
}

async function promptForModeratorPassword() {
    let password = "";
    const action = await openPopup({
        title: i18n.t("module.jitsi_meet.password_title"),
        body: `
            <label class="stack">
                ${escapeHtml(i18n.t("module.jitsi_meet.password_label"))}
                <input type="password" id="jitsi-moderator-password" class="theme-input" autocomplete="off" />
            </label>
        `,
        actions: [
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
            {
                id: "submit",
                label: i18n.t("module.jitsi_meet.password_submit"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            overlay.querySelector("#jitsi-moderator-password")?.focus();
        },
        onAction: (actionId, overlay) => {
            if (actionId !== "submit") return true;
            const input = overlay.querySelector("#jitsi-moderator-password");
            password = (input?.value ?? "").trim();
            return Boolean(password);
        },
    });
    if (action !== "submit") return null;
    return password || null;
}

async function startSession(meetingId) {
    const response = await apiFetch(
        `/api/v1/modules/jitsi-meet/meeting-session?meetingId=${encodeURIComponent(meetingId)}`,
    );
    if (!response.ok) {
        showToast({
            type: "error",
            message: i18n.t("ui.reuse.error"),
        });
        return;
    }
    const payload = await response.json();
    activeMeetingSession = payload?.data ?? null;
    activeMeetingId = activeMeetingSession?.id ?? null;
    composer.refresh(getElements());
    await bootJitsiIfReady();
}

async function bootJitsiIfReady() {
    const session = activeMeetingSession;
    const container = document.querySelector("#jitsi-meet-container");
    if (!session || !container) return;

    const externalApi = await ensureExternalApi(session.baseUrl);
    if (!externalApi) {
        showToast({ type: "error", message: i18n.t("ui.reuse.error") });
        return;
    }

    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }

    const jitsiUrl = new URL(session.baseUrl);
    const displayName =
        localStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ||
        localStorage.getItem(ACCOUNT_STORAGE_KEY) ||
        i18n.t("module.jitsi_meet.default_user");

    jitsiApi = new externalApi(jitsiUrl.host, {
        roomName: session.roomName,
        parentNode: container,
        configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            disableProfile: true,
            requireDisplayName: false,
            subject: session.title,
            toolbarButtons: [
                "microphone",
                "camera",
                "desktop",
                "participants-pane",
                "tileview",
                "raisehand",
                "hangup",
                "settings",
                "toggle-camera",
            ],
        },
        interfaceConfigOverwrite: {
            DISABLE_CHAT: true,
            DISABLE_PROFILE: true,
        },
        userInfo: {
            displayName,
            avatarURL: userProfile?.avatarKey
                ? `/api/v1/profile/avatar/${encodeURIComponent(userProfile.avatarKey)}`
                : undefined,
        },
    });

    jitsiApi.addListener("passwordRequired", async () => {
        const password = await promptForModeratorPassword();
        if (!password) return;
        jitsiApi.executeCommand("password", password);
    });

    jitsiApi.addListener("readyToClose", () => {
        const restartButton = document.querySelector("[data-meetings-restart]");
        if (restartButton) restartButton.hidden = false;
    });

    const restartButton = document.querySelector("[data-meetings-restart]");
    if (restartButton) restartButton.hidden = true;
}

async function handleCreateMeeting(root) {
    const classroomInput = root.querySelector("[data-meetings-classroom-id]");
    const classroomId = classroomInput?.value?.trim() || null;

    const payload = {
        participantIds: selectedUserIds(),
        classroomId,
        title: i18n.t("module.jitsi_meet.default_meeting_title"),
    };
    const response = await apiFetch("/api/v1/modules/jitsi-meet/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const failurePayload = await response.json().catch(() => null);
        showToast({
            type: "error",
            message: failurePayload?.error?.message || i18n.t("ui.reuse.error"),
        });
        return;
    }

    const createdPayload = await response.json();
    const meeting = createdPayload?.data;
    if (!meeting?.id) return;

    await loadMeetings();
    await startSession(meeting.id);
    showToast({ type: "success", message: i18n.t("ui.reuse.done") });
}

function setupDnD(root) {
    const availableList = root.querySelector("[data-meetings-available]");
    const selectedList = root.querySelector("[data-meetings-selected]");
    if (!availableList || !selectedList) return;

    function bindListItems() {
        root.querySelectorAll('.meetings-user[draggable="true"]').forEach(
            (item) => {
                item.addEventListener("dragstart", (event) => {
                    event.dataTransfer?.setData(
                        "text/plain",
                        item.dataset.userId || "",
                    );
                    if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = "move";
                    }
                });
            },
        );
    }

    function bindDropZone(zone, mode) {
        zone.addEventListener("dragover", (event) => {
            event.preventDefault();
            zone.classList.add("meetings-list--drop");
        });
        zone.addEventListener("dragleave", () => {
            zone.classList.remove("meetings-list--drop");
        });
        zone.addEventListener("drop", (event) => {
            event.preventDefault();
            zone.classList.remove("meetings-list--drop");
            const userId = event.dataTransfer?.getData("text/plain") || "";
            if (!userId) return;
            const sourceUser = mergeUsers([
                ...allEligibleUsers,
                ...searchResults,
                ...selectedUsers,
            ]).find((user) => user.accountId === userId);
            if (!sourceUser) return;

            if (mode === "select") {
                selectedUsers = mergeUsers([...selectedUsers, sourceUser]);
            } else {
                selectedUsers = selectedUsers.filter(
                    (user) => user.accountId !== userId,
                );
            }
            composer.refresh(getElements());
        });
    }

    bindDropZone(selectedList, "select");
    bindDropZone(availableList, "remove");
    bindListItems();
}

function bindActions(root) {
    root.querySelector("[data-meetings-create]")?.addEventListener(
        "click",
        async () => {
            await handleCreateMeeting(root);
        },
    );

    root.querySelector("[data-meetings-refresh-session]")?.addEventListener(
        "click",
        async () => {
            if (!activeMeetingId) return;
            await startSession(activeMeetingId);
        },
    );

    root.querySelector("[data-meetings-restart]")?.addEventListener(
        "click",
        async () => {
            if (!activeMeetingId) return;
            await startSession(activeMeetingId);
        },
    );

    root.querySelector("[data-meetings-new-tab]")?.addEventListener(
        "click",
        () => {
            if (!activeMeetingSession?.joinUrl) return;
            window.open(
                activeMeetingSession.joinUrl,
                "_blank",
                "noopener,noreferrer",
            );
        },
    );

    root.querySelector("[data-meetings-open-chat]")?.addEventListener(
        "click",
        () => {
            if (!activeMeetingSession?.chatroomId) return;
            navigateTo(
                `/messages/${encodeURIComponent(activeMeetingSession.chatroomId)}`,
            );
        },
    );

    root.querySelector("[data-meetings-existing]")?.addEventListener(
        "change",
        async (event) => {
            const meetingId = event.target.value;
            if (!meetingId) return;
            await startSession(meetingId);
        },
    );

    root.querySelector("[data-meetings-user-search]")?.addEventListener(
        "input",
        async (event) => {
            await searchUsers(event.target.value || "");
            composer.refresh(getElements());
        },
    );

    setupDnD(root);
}

/**
 * Mounts the Jitsi Meetings page into the dashboard shell.
 *
 * @param {HTMLElement} root
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */
export async function mount(root, { signal } = {}) {
    i18n = await createI18n({
        componentStringBaseUrls: ["/static/modules/jitsi-meet/ui/languages"],
    });
    applyDocumentTitle(i18n, "module.jitsi_meet.page_title");

    const pingResponse = await apiFetch("/api/v1/modules/jitsi-meet/ping");
    if (!pingResponse.ok) {
        showToast({ type: "error", message: i18n.t("ui.reuse.error") });
        return;
    }

    userProfile = await loadProfile();
    selectedUsers = mergeUsers([
        {
            accountId:
                userProfile?.accountId ||
                localStorage.getItem(ACCOUNT_STORAGE_KEY) ||
                "",
            handle:
                userProfile?.handle ||
                localStorage.getItem(ACCOUNT_STORAGE_KEY) ||
                "",
            displayName:
                userProfile?.displayName ||
                localStorage.getItem(DISPLAY_NAME_STORAGE_KEY) ||
                localStorage.getItem(ACCOUNT_STORAGE_KEY) ||
                "",
            avatarKey: userProfile?.avatarKey || null,
        },
    ]).filter((user) => user.accountId);

    await Promise.all([loadEligibleUsers(), loadMeetings()]);

    composer = createPageComposer(root, {
        allowCustomization: true,
        elements: getElements(),
        preferenceKey: "jitsi-meetings-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.jitsi_meet.page_title"),
            subtitle: i18n.t("module.jitsi_meet.page_subtitle"),
        },
        onRender: () => bindActions(root),
    });

    await composer.init();

    const queryMeetingId = new URL(window.location.href).searchParams.get(
        "meetingId",
    );
    if (queryMeetingId) {
        await startSession(queryMeetingId);
    }

    if (signal) {
        signal.addEventListener("abort", () => {
            if (jitsiApi) {
                jitsiApi.dispose();
                jitsiApi = null;
            }
        });
    }
}

await mount(document.querySelector("#app"));
