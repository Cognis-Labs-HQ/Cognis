import { apiFetch } from "/static/reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    readPreferredLanguages,
} from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { openPopup } from "/static/reuse/popup.js";
import { MODULE_STRING_BASE_URL } from "/static/modules/jitsi-meet/reuse/paths.js";

let i18n = null;
let composer = null;
let selfProfile = null;
let participantFilter = "followers";
let participantSearch = "";
let availableParticipants = [];
let selectedParticipantIds = [];
let activeMeeting = null;
let activeNativeChatRoomId = null;
let jitsiApi = null;
let draggedParticipantId = null;
let refreshParticipantsToken = 0;

function getCurrentAccountId() {
    return String(
        selfProfile?.accountId ?? localStorage.getItem("cognis_account") ?? "",
    ).trim();
}

function getSelectedParticipants() {
    const selectedSet = new Set(selectedParticipantIds);
    return availableParticipants.filter((participant) =>
        selectedSet.has(String(participant.accountId)),
    );
}

function getAvailablePoolParticipants() {
    const selectedSet = new Set(selectedParticipantIds);
    return availableParticipants.filter(
        (participant) => !selectedSet.has(String(participant.accountId)),
    );
}

async function loadSelfProfile() {
    const response = await apiFetch("/api/v1/profile");
    if (!response.ok) return null;
    const payload = await response.json();
    const profile = payload?.data ?? null;
    if (!profile) return null;
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        displayName: profile.displayName || profile.handle,
        avatarKey: profile.avatarKey || null,
        avatarUrl: profile.avatarKey
            ? `/api/v1/files/${profile.avatarKey}`
            : null,
    };
}

async function loadParticipants() {
    const token = ++refreshParticipantsToken;
    const requestUrl = new URL(
        "/api/v1/modules/jitsi-meet/participants",
        window.location.origin,
    );
    requestUrl.searchParams.set("filter", participantFilter);
    if (participantSearch.trim()) {
        requestUrl.searchParams.set("q", participantSearch.trim());
    }

    const response = await apiFetch(
        `${requestUrl.pathname}${requestUrl.search}`,
    );
    if (!response.ok) {
        if (token === refreshParticipantsToken) {
            availableParticipants = [];
        }
        return;
    }

    const payload = await response.json();
    if (token !== refreshParticipantsToken) return;

    availableParticipants = Array.isArray(payload?.data) ? payload.data : [];
    const allowedIds = new Set(
        availableParticipants.map((entry) => String(entry.accountId)),
    );
    selectedParticipantIds = selectedParticipantIds.filter((accountId) =>
        allowedIds.has(String(accountId)),
    );
}

async function resolveNativeChatRoomForMeeting() {
    if (!activeMeeting || !Array.isArray(activeMeeting.members)) {
        activeNativeChatRoomId = null;
        return;
    }

    const currentAccountId = getCurrentAccountId();
    const memberIds = activeMeeting.members
        .map((member) => String(member.accountId ?? "").trim())
        .filter(Boolean);

    if (memberIds.length !== 2 || !memberIds.includes(currentAccountId)) {
        activeNativeChatRoomId = null;
        return;
    }

    const response = await apiFetch("/api/v1/messages/rooms");
    if (!response.ok) {
        activeNativeChatRoomId = null;
        return;
    }

    const payload = await response.json();
    const roomRows = Array.isArray(payload?.data) ? payload.data : [];

    const matchingRoom = roomRows.find((roomRow) => {
        if (roomRow?.kind !== "dm") return false;
        const roomMemberIds = Array.isArray(roomRow?.members)
            ? roomRow.members
                  .map((memberRow) => String(memberRow?.accountId ?? "").trim())
                  .filter(Boolean)
            : [];
        return memberIds.every((memberId) => roomMemberIds.includes(memberId));
    });

    activeNativeChatRoomId = matchingRoom?.id ?? null;
}

function renderParticipantCard(participant, isSelected) {
    return `
    <article
      class="jitsi-meet-participant-card${isSelected ? " jitsi-meet-participant-card--selected" : ""}"
      data-participant-id="${escapeHtml(participant.accountId)}"
      draggable="true"
    >
      <div class="jitsi-meet-participant-avatar">
        ${participant.avatarUrl ? `<img src="${escapeHtml(participant.avatarUrl)}" alt="" />` : "<span>◉</span>"}
      </div>
      <div class="jitsi-meet-participant-main">
        <strong>${escapeHtml(participant.displayName || participant.handle)}</strong>
        <span>@${escapeHtml(participant.handle)}</span>
      </div>
    </article>
  `;
}

function renderParticipantsPane() {
    const availableRows = getAvailablePoolParticipants();
    const selectedRows = getSelectedParticipants();

    return `
    <section class="jitsi-meet-panel">
      <header class="jitsi-meet-panel-header">
        <h3>${escapeHtml(i18n.t("module.jitsi_meet.participants_heading"))}</h3>
      </header>
      <div class="jitsi-meet-controls-grid">
        <label class="jitsi-meet-field">
          <span>${escapeHtml(i18n.t("module.jitsi_meet.filter_label"))}</span>
          <select name="participantFilter" class="theme-select">
            <option value="followers"${participantFilter === "followers" ? " selected" : ""}>${escapeHtml(
                i18n.t("ui.reuse.followers"),
            )}</option>
            <option value="all"${participantFilter === "all" ? " selected" : ""}>${escapeHtml(
                i18n.t("ui.reuse.all"),
            )}</option>
          </select>
        </label>
        <label class="jitsi-meet-field">
          <span>${escapeHtml(i18n.t("ui.reuse.search"))}</span>
          <input
            type="search"
            name="participantSearch"
            value="${escapeHtml(participantSearch)}"
            placeholder="${escapeHtml(i18n.t("module.jitsi_meet.search_placeholder"))}"
          />
        </label>
      </div>
      <div class="jitsi-meet-participant-lists">
        <div class="jitsi-meet-dropzone" data-dropzone="available">
          <h4>${escapeHtml(i18n.t("module.jitsi_meet.available_users"))}</h4>
          <div class="jitsi-meet-participant-list">
            ${
                availableRows.length
                    ? availableRows
                          .map((participant) =>
                              renderParticipantCard(participant, false),
                          )
                          .join("")
                    : `<p class="jitsi-meet-empty">${escapeHtml(i18n.t("module.jitsi_meet.contacts_empty"))}</p>`
            }
          </div>
        </div>
        <div class="jitsi-meet-dropzone" data-dropzone="selected">
          <h4>${escapeHtml(i18n.t("module.jitsi_meet.selected_users"))}</h4>
          <div class="jitsi-meet-participant-list">
            ${
                selectedRows.length
                    ? selectedRows
                          .map((participant) =>
                              renderParticipantCard(participant, true),
                          )
                          .join("")
                    : `<p class="jitsi-meet-empty">${escapeHtml(i18n.t("module.jitsi_meet.no_selected_users"))}</p>`
            }
          </div>
        </div>
      </div>
      <div class="jitsi-meet-controls-grid">
        <label class="jitsi-meet-field">
          <span>${escapeHtml(i18n.t("module.jitsi_meet.entity_type_label"))}</span>
          <select name="entityType" class="theme-select">
            <option value="pair">${escapeHtml(i18n.t("module.jitsi_meet.entity_type_pair"))}</option>
            <option value="classroom">${escapeHtml(i18n.t("module.jitsi_meet.entity_type_classroom"))}</option>
            <option value="manual">${escapeHtml(i18n.t("module.jitsi_meet.entity_type_manual"))}</option>
          </select>
        </label>
        <label class="jitsi-meet-field">
          <span>${escapeHtml(i18n.t("module.jitsi_meet.entity_id_label"))}</span>
          <input type="text" name="entityId" placeholder="${escapeHtml(
              i18n.t("module.jitsi_meet.entity_id_placeholder"),
          )}" />
        </label>
        <label class="jitsi-meet-field">
          <span>${escapeHtml(i18n.t("module.jitsi_meet.meeting_title_label"))}</span>
          <input type="text" name="meetingTitle" value="${escapeHtml(
              activeMeeting?.title ??
                  i18n.t("module.jitsi_meet.default_meeting_title"),
          )}" />
        </label>
      </div>
      <div class="jitsi-meet-actions">
        <button type="button" class="btn-animated" data-refresh-participants>
          ${escapeHtml(i18n.t("ui.reuse.refresh"))}
        </button>
        <button type="button" class="btn-animated" data-start-session>
          ${escapeHtml(i18n.t("module.jitsi_meet.start_button"))}
        </button>
      </div>
    </section>
  `;
}

function renderMeetingPane() {
    return `
    <section class="jitsi-meet-panel jitsi-meet-meeting-pane">
      <header class="jitsi-meet-panel-header">
        <h3>${escapeHtml(i18n.t("module.jitsi_meet.meeting_heading"))}</h3>
        <span class="jitsi-meet-title-chip">${escapeHtml(activeMeeting?.title ?? i18n.t("module.jitsi_meet.default_meeting_title"))}</span>
      </header>
      <div class="jitsi-meet-meeting-frame" data-meeting-frame>
        <button type="button" class="btn-animated jitsi-meet-overlay-button" data-overlay-toggle>
          ${escapeHtml(i18n.t("module.jitsi_meet.overlay_toggle"))}
        </button>
        <div class="jitsi-meet-overlay-panel" data-overlay-panel hidden>
          <button type="button" class="btn-animated" data-open-auth-popup>
            ${escapeHtml(i18n.t("module.jitsi_meet.open_auth_popup"))}
          </button>
          <button type="button" class="btn-animated" data-open-pip>
            ${escapeHtml(i18n.t("module.jitsi_meet.open_pip"))}
          </button>
          <button type="button" class="btn-animated" data-open-new-tab>
            ${escapeHtml(i18n.t("module.jitsi_meet.open_new_tab"))}
          </button>
          <button type="button" class="btn-animated" data-reconnect-meeting>
            ${escapeHtml(i18n.t("module.jitsi_meet.reconnect_button"))}
          </button>
        </div>
        <div class="jitsi-meet-stage" id="jitsi-meet-stage"></div>
      </div>
      <p class="jitsi-meet-caption">
        ${escapeHtml(i18n.t("module.jitsi_meet.url_hidden_notice"))}
      </p>
    </section>
  `;
}

function renderChatPane() {
    if (!activeMeeting) {
        return `
      <section class="jitsi-meet-panel">
        <header class="jitsi-meet-panel-header">
          <h3>${escapeHtml(i18n.t("module.jitsi_meet.chat_heading"))}</h3>
        </header>
        <p class="jitsi-meet-empty">${escapeHtml(i18n.t("module.jitsi_meet.no_active_session"))}</p>
      </section>
    `;
    }

    return `
    <section class="jitsi-meet-panel">
      <header class="jitsi-meet-panel-header">
        <h3>${escapeHtml(i18n.t("module.jitsi_meet.chat_heading"))}</h3>
      </header>
      <div class="jitsi-meet-chat-actions">
        <button type="button" class="btn-animated" data-refresh-chat-link>
          ${escapeHtml(i18n.t("module.jitsi_meet.refresh_native_chat"))}
        </button>
        <button type="button" class="btn-animated" data-open-native-chat>
          ${escapeHtml(i18n.t("module.jitsi_meet.open_native_chat"))}
        </button>
      </div>
      ${
          activeNativeChatRoomId
              ? `<iframe class="jitsi-meet-chat-frame" src="/messages/${escapeHtml(
                    activeNativeChatRoomId,
                )}" referrerpolicy="strict-origin-when-cross-origin"></iframe>`
              : `<p class="jitsi-meet-empty">${escapeHtml(i18n.t("module.jitsi_meet.native_chat_missing"))}</p>`
      }
    </section>
  `;
}

function parseMeetingForm(rootElement) {
    const entityTypeElement = rootElement.querySelector(
        'select[name="entityType"]',
    );
    const entityIdElement = rootElement.querySelector('input[name="entityId"]');
    const meetingTitleElement = rootElement.querySelector(
        'input[name="meetingTitle"]',
    );

    return {
        entityType:
            entityTypeElement instanceof HTMLSelectElement
                ? String(entityTypeElement.value || "pair")
                : "pair",
        entityId:
            entityIdElement instanceof HTMLInputElement
                ? String(entityIdElement.value || "").trim()
                : "",
        meetingTitle:
            meetingTitleElement instanceof HTMLInputElement
                ? String(meetingTitleElement.value || "").trim()
                : i18n.t("module.jitsi_meet.default_meeting_title"),
    };
}

async function syncMeetingParticipants() {
    if (!activeMeeting?.meetingId) return;

    const selectedIds = getSelectedParticipants().map(
        (participant) => participant.accountId,
    );
    const response = await apiFetch(
        "/api/v1/modules/jitsi-meet/meeting/participants",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                meetingId: activeMeeting.meetingId,
                participantAccountIds: selectedIds,
            }),
        },
    );
    if (!response.ok) {
        showToast(i18n.t("module.jitsi_meet.participant_sync_failed"), {
            variant: "error",
        });
        return;
    }
    const payload = await response.json();
    activeMeeting = {
        ...activeMeeting,
        members: payload?.data?.members ?? activeMeeting.members ?? [],
    };
    await resolveNativeChatRoomForMeeting();
    composer.refresh(elements);
}

async function createOrJoinMeeting(rootElement) {
    const selectedIds = getSelectedParticipants().map(
        (participant) => participant.accountId,
    );
    if (!selectedIds.length) {
        showToast(i18n.t("module.jitsi_meet.select_contact_warning"), {
            variant: "warning",
        });
        return;
    }

    const form = parseMeetingForm(rootElement);

    const response = await apiFetch("/api/v1/modules/jitsi-meet/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            entityType: form.entityType,
            entityId: form.entityId,
            title: form.meetingTitle,
            participantAccountIds: selectedIds,
        }),
    });

    if (!response.ok) {
        showToast(i18n.t("module.jitsi_meet.session_failed"), {
            variant: "error",
        });
        return;
    }

    const payload = await response.json();
    activeMeeting = payload?.data ?? null;

    selectedParticipantIds = (activeMeeting?.members ?? [])
        .map((member) => String(member.accountId ?? "").trim())
        .filter(
            (accountId) => accountId && accountId !== getCurrentAccountId(),
        );

    await resolveNativeChatRoomForMeeting();
    composer.refresh(elements);
    await mountJitsiMeeting();
}

function parseJitsiDomain(baseUrl) {
    try {
        const parsedUrl = new URL(String(baseUrl ?? ""));
        return parsedUrl.host;
    } catch {
        return "";
    }
}

async function ensureJitsiScript(baseUrl) {
    const scriptUrl = `${String(baseUrl ?? "").replace(/\/+$/, "")}/external_api.js`;
    if (document.querySelector(`script[data-jitsi-script="${scriptUrl}"]`)) {
        return;
    }

    await new Promise((resolve, reject) => {
        const scriptElement = document.createElement("script");
        scriptElement.src = scriptUrl;
        scriptElement.async = true;
        scriptElement.dataset.jitsiScript = scriptUrl;
        scriptElement.onload = () => resolve();
        scriptElement.onerror = () =>
            reject(new Error("Jitsi API script failed to load."));
        document.head.appendChild(scriptElement);
    });
}

async function promptMeetingPassword() {
    const action = await openPopup({
        title: i18n.t("module.jitsi_meet.auth_popup_title"),
        message: i18n.t("module.jitsi_meet.auth_popup_message"),
        confirmLabel: i18n.t("ui.reuse.confirm"),
        cancelLabel: i18n.t("ui.reuse.cancel"),
        inputs: [
            {
                name: "meetingPassword",
                type: "password",
                label: i18n.t("module.jitsi_meet.auth_popup_password_label"),
                required: true,
            },
        ],
    });

    if (!action || action.action !== "confirm") {
        return null;
    }

    return String(action.values?.meetingPassword ?? "").trim();
}

async function mountJitsiMeeting() {
    if (!activeMeeting?.baseUrl || !activeMeeting?.roomSlug) return;

    const stageElement = document.querySelector("#jitsi-meet-stage");
    if (!(stageElement instanceof HTMLElement)) return;

    await ensureJitsiScript(activeMeeting.baseUrl);

    if (!window.JitsiMeetExternalAPI) {
        showToast(i18n.t("module.jitsi_meet.session_failed"), {
            variant: "error",
        });
        return;
    }

    if (jitsiApi) {
        jitsiApi.dispose();
        jitsiApi = null;
    }

    stageElement.innerHTML = "";

    const domain = parseJitsiDomain(activeMeeting.baseUrl);
    const displayName =
        activeMeeting?.requester?.displayName ||
        selfProfile?.displayName ||
        selfProfile?.handle ||
        "Cognis User";

    jitsiApi = new window.JitsiMeetExternalAPI(domain, {
        roomName: activeMeeting.roomSlug,
        parentNode: stageElement,
        userInfo: {
            displayName,
            avatarURL:
                activeMeeting?.requester?.avatarUrl ||
                selfProfile?.avatarUrl ||
                undefined,
        },
        configOverwrite: {
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            disableInviteFunctions: true,
            toolbarButtons: [
                "microphone",
                "camera",
                "desktop",
                "participants-pane",
                "tileview",
                "raisehand",
                "hangup",
            ],
        },
        interfaceConfigOverwrite: {
            DISABLE_CHAT: true,
            DISABLE_PROFILE: true,
        },
    });

    jitsiApi.addListener("passwordRequired", async () => {
        const password = await promptMeetingPassword();
        if (!password) {
            showToast(i18n.t("module.jitsi_meet.password_required_warning"), {
                variant: "warning",
            });
            return;
        }
        jitsiApi.executeCommand("password", password);
    });

    jitsiApi.addListener("videoConferenceJoined", () => {
        showToast(i18n.t("module.jitsi_meet.meeting_joined"), {
            variant: "success",
        });
    });

    jitsiApi.addListener("videoConferenceLeft", () => {
        showToast(i18n.t("module.jitsi_meet.meeting_left"), {
            variant: "info",
        });
    });
}

async function openAuthPopupWindow() {
    if (!activeMeeting?.baseUrl) return;
    const popupUrl = `${String(activeMeeting.baseUrl).replace(/\/+$/, "")}/`;
    const popupWindow = window.open(
        popupUrl,
        "jitsi-moderation-auth",
        "width=720,height=680,noopener,noreferrer",
    );
    if (!popupWindow) {
        showToast(i18n.t("module.jitsi_meet.auth_popup_blocked"), {
            variant: "warning",
        });
        return;
    }

    localStorage.setItem(
        "cognis_jitsi_auth_context",
        JSON.stringify({
            meetingId: activeMeeting.meetingId,
            roomSlug: activeMeeting.roomSlug,
            timestamp: Date.now(),
        }),
    );

    showToast(i18n.t("module.jitsi_meet.auth_popup_opened"), {
        variant: "info",
    });
}

async function openPictureInPicture() {
    if (!activeMeeting?.joinUrl) return;
    if (
        !("documentPictureInPicture" in window) ||
        typeof window.documentPictureInPicture?.requestWindow !== "function"
    ) {
        showToast(i18n.t("module.jitsi_meet.pip_not_supported"), {
            variant: "warning",
        });
        return;
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 540,
        height: 360,
    });
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.innerHTML = `
    <iframe
      src="${escapeHtml(activeMeeting.joinUrl)}"
      style="width:100vw;height:100vh;border:0;background:#000"
      allow="camera; microphone; display-capture; picture-in-picture; fullscreen"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  `;
}

function moveParticipantToSelection(participantId, shouldSelect) {
    const normalizedId = String(participantId ?? "").trim();
    if (!normalizedId) return;

    if (shouldSelect) {
        if (!selectedParticipantIds.includes(normalizedId)) {
            selectedParticipantIds = [...selectedParticipantIds, normalizedId];
        }
    } else {
        selectedParticipantIds = selectedParticipantIds.filter(
            (entry) => String(entry) !== normalizedId,
        );
    }

    composer.refresh(elements);
    if (activeMeeting?.meetingId) {
        void syncMeetingParticipants();
    }
}

function bindParticipantDnD(rootElement) {
    rootElement
        .querySelectorAll("[data-participant-id]")
        .forEach((cardElement) => {
            if (!(cardElement instanceof HTMLElement)) return;

            cardElement.addEventListener("dragstart", (event) => {
                const participantId = cardElement.dataset.participantId;
                draggedParticipantId = String(participantId ?? "").trim();
                event.dataTransfer?.setData("text/plain", draggedParticipantId);
                event.dataTransfer?.setData(
                    "application/x-jitsi-participant",
                    draggedParticipantId,
                );
            });
        });

    rootElement.querySelectorAll("[data-dropzone]").forEach((zoneElement) => {
        if (!(zoneElement instanceof HTMLElement)) return;

        zoneElement.addEventListener("dragover", (event) => {
            event.preventDefault();
            zoneElement.classList.add("jitsi-meet-dropzone--active");
        });

        zoneElement.addEventListener("dragleave", () => {
            zoneElement.classList.remove("jitsi-meet-dropzone--active");
        });

        zoneElement.addEventListener("drop", (event) => {
            event.preventDefault();
            zoneElement.classList.remove("jitsi-meet-dropzone--active");
            const payload =
                draggedParticipantId ||
                event.dataTransfer?.getData(
                    "application/x-jitsi-participant",
                ) ||
                event.dataTransfer?.getData("text/plain") ||
                "";
            const shouldSelect = zoneElement.dataset.dropzone === "selected";
            moveParticipantToSelection(payload, shouldSelect);
        });
    });
}

async function bindMeetingPaneEvents(rootElement) {
    const overlayToggleButton = rootElement.querySelector(
        "[data-overlay-toggle]",
    );
    const overlayPanel = rootElement.querySelector("[data-overlay-panel]");

    if (
        overlayToggleButton instanceof HTMLButtonElement &&
        overlayPanel instanceof HTMLElement
    ) {
        overlayToggleButton.addEventListener("click", () => {
            overlayPanel.hidden = !overlayPanel.hidden;
        });
    }

    const openAuthPopupButton = rootElement.querySelector(
        "[data-open-auth-popup]",
    );
    if (openAuthPopupButton instanceof HTMLButtonElement) {
        openAuthPopupButton.addEventListener("click", () => {
            void openAuthPopupWindow();
        });
    }

    const openPipButton = rootElement.querySelector("[data-open-pip]");
    if (openPipButton instanceof HTMLButtonElement) {
        openPipButton.addEventListener("click", () => {
            void openPictureInPicture();
        });
    }

    const openNewTabButton = rootElement.querySelector("[data-open-new-tab]");
    if (openNewTabButton instanceof HTMLButtonElement) {
        openNewTabButton.addEventListener("click", () => {
            if (!activeMeeting?.joinUrl) return;
            window.open(activeMeeting.joinUrl, "_blank", "noopener,noreferrer");
        });
    }

    const reconnectButton = rootElement.querySelector(
        "[data-reconnect-meeting]",
    );
    if (reconnectButton instanceof HTMLButtonElement) {
        reconnectButton.addEventListener("click", () => {
            void mountJitsiMeeting();
        });
    }

    await mountJitsiMeeting();
}

async function bindChatPaneEvents(rootElement) {
    const refreshButton = rootElement.querySelector("[data-refresh-chat-link]");
    if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.addEventListener("click", async () => {
            await resolveNativeChatRoomForMeeting();
            composer.refresh(elements);
        });
    }

    const openNativeChatButton = rootElement.querySelector(
        "[data-open-native-chat]",
    );
    if (openNativeChatButton instanceof HTMLButtonElement) {
        openNativeChatButton.addEventListener("click", () => {
            if (!activeNativeChatRoomId) {
                showToast(i18n.t("module.jitsi_meet.native_chat_missing"), {
                    variant: "warning",
                });
                return;
            }
            navigateTo(
                `/messages/${encodeURIComponent(activeNativeChatRoomId)}`,
            );
        });
    }
}

async function bindParticipantPaneEvents(rootElement) {
    const filterElement = rootElement.querySelector(
        'select[name="participantFilter"]',
    );
    if (filterElement instanceof HTMLSelectElement) {
        filterElement.addEventListener("change", async () => {
            participantFilter = String(filterElement.value || "followers");
            await loadParticipants();
            composer.refresh(elements);
        });
    }

    const searchElement = rootElement.querySelector(
        'input[name="participantSearch"]',
    );
    if (searchElement instanceof HTMLInputElement) {
        searchElement.addEventListener("input", () => {
            participantSearch = searchElement.value || "";
        });
    }

    const refreshButton = rootElement.querySelector(
        "[data-refresh-participants]",
    );
    if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.addEventListener("click", async () => {
            await loadParticipants();
            composer.refresh(elements);
        });
    }

    const startButton = rootElement.querySelector("[data-start-session]");
    if (startButton instanceof HTMLButtonElement) {
        startButton.addEventListener("click", () => {
            void createOrJoinMeeting(rootElement);
        });
    }

    bindParticipantDnD(rootElement);
}

const elements = [
    {
        id: "jitsi-meet-stage-pane",
        label: "module.jitsi_meet.meeting_heading",
        pinned: true,
        render: renderMeetingPane,
        onRender(rootElement) {
            void bindMeetingPaneEvents(rootElement);
        },
    },
    {
        id: "jitsi-meet-participants-pane",
        label: "module.jitsi_meet.participants_heading",
        pinned: true,
        render: renderParticipantsPane,
        onRender(rootElement) {
            void bindParticipantPaneEvents(rootElement);
        },
    },
    {
        id: "jitsi-meet-chat-pane",
        label: "module.jitsi_meet.chat_heading",
        pinned: true,
        render: renderChatPane,
        onRender(rootElement) {
            void bindChatPaneEvents(rootElement);
        },
    },
];

export async function mount(root) {
    i18n = await createI18n({
        preferredLanguages: readPreferredLanguages(),
        componentStringBaseUrls: [MODULE_STRING_BASE_URL],
    });

    applyDocumentTitle(i18n, "module.jitsi_meet.page_title");

    selfProfile = await loadSelfProfile();
    await loadParticipants();

    composer = createPageComposer(root, {
        allowCustomization: true,
        elements,
        preferenceKey: "jitsi-meet-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.jitsi_meet.page_title"),
            subtitle: i18n.t("module.jitsi_meet.page_subtitle"),
        },
    });

    await composer.init();
}

if (!globalThis.__spaRouter) {
    await mount(document.querySelector("#app"));
}
