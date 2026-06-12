import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { bindProfilePreviews } from "/static/reuse/profile-preview.js";
import {
    handleProfileAvatarError,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import {
    loadFooterClasses,
    createClassFooterItem,
} from "/static/adapters/study/classes/study-footer.js";
import {
    applyClassroomViewModeFromUrl,
    canToggleClassroomView,
    getClassroomViewMode,
    setClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";
import { renderClassroomPage } from "/static/adapters/study/classes/classroom-render.js";
import { handleClassroomExit } from "/static/adapters/study/classes/classroom-exit.js";
import { createClassroomPresenceController } from "/static/adapters/study/classes/classroom-presence.js";
import { openClassSettingsPopup } from "/static/adapters/study/classes/classroom-popups.js";
import { renderClassroomSubNavigation } from "/static/adapters/study/classes/classroom-sub-navigation.js";
import { startClassroomRealtimeRefresh } from "/static/adapters/study/classes/classroom-realtime.js";
import { createClassroomWindows } from "/static/adapters/study/classes/classroom-windows.js";
import {
    createDynamicDomRefresher,
    createWorkspaceTileRefresher,
} from "/static/adapters/study/classes/classroom-dynamic-refresh.js";
import { createBoardEntityStore } from "/static/adapters/study/classes/classroom-board.js";
import { openSeatActionMenu } from "/static/adapters/study/classes/classroom-seat-menu.js";
import { createClassroomNotepad } from "/static/adapters/study/notepad/classroom-notepad.js";
import { handleWhiteboardAndNotepadActions } from "/static/adapters/study/classes/classroom-whiteboard-actions.js";
import { handleResourceActions } from "/static/adapters/study/classes/classroom-resource-actions.js";
import { handleFileActions } from "/static/adapters/study/classes/classroom-file-actions.js";
import { bindClassroomInteractions } from "/static/adapters/study/classes/classroom/interactions.js";
import { normalizeBoardFocus } from "/static/adapters/study/classes/board-focus.js";

function buildQuery(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") continue;
        query.set(key, String(value));
    }
    return query.toString();
}

function normalizeWorkspaceMode(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (
        normalized === "notepad" ||
        normalized === "whiteboard" ||
        normalized === "meeting" ||
        normalized === "chat"
    ) {
        return normalized;
    }
    return "agenda";
}

function normalizeSidebarMode(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (normalized === "students" || normalized === "agenda") {
        return normalized;
    }
    return "materials";
}

function createDefaultClassResources() {
    return {
        materials: "",
        homework: "",
        files: [],
        agendaDocument: "",
        agendaSnapshots: [],
    };
}

export async function mount(root, { signal } = {}) {
    applyClassroomViewModeFromUrl();
    const referrerUrl = document.referrer
        ? new URL(document.referrer, window.location.origin)
        : null;
    const previousPath =
        referrerUrl?.origin === window.location.origin &&
        referrerUrl?.pathname !== window.location.pathname
            ? referrerUrl.pathname + referrerUrl.search
            : "/";
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/adapters/study/notepad/languages",
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "module.study.classes.classroom_page_title");

    if (!canToggleClassroomView()) {
        try {
            const accountId = localStorage.getItem("cognis_account");
            if (accountId) {
                const infoResponse = await apiFetch(
                    `/api/v1/users/${encodeURIComponent(accountId)}/info`,
                );
                if (infoResponse.ok) {
                    const infoPayload = await infoResponse.json();
                    const refreshedRole = String(
                        infoPayload?.data?.role ?? "",
                    ).trim();
                    if (refreshedRole) {
                        localStorage.setItem("cognis_role", refreshedRole);
                        applyClassroomViewModeFromUrl();
                    }
                }
            }
        } catch {
            // Keep existing role when refresh fails.
        }
    }

    const teacherAccount = canToggleClassroomView();
    const query = new URL(window.location.href).searchParams;

    let classroomSnapshots = [];
    let availableClasses = [];
    let footerClasses = [];
    let selectedClassId = String(query.get("classId") ?? "").trim();
    let selectedSeatNumber = null;
    let selectedNotebookText = "";
    let classResources = createDefaultClassResources();
    let agendaDocument = "";
    let agendaSnapshots = [];
    let selectedLanguageFilter = "";
    let searchQuery = "";
    let workspaceMode = "agenda";
    let lastNonMeetingWorkspaceMode = "agenda";
    let sidebarMode = "materials";
    const presenceByAccountId = new Map();
    const boardEntityStore = createBoardEntityStore();
    let interactionsBound = false;
    /** Initialised after composer.init(); used by the click handler via closure. */
    let classroomWindows = null;
    let classroomNotepad = null;
    let classroomNotepadClassId = "";
    let whiteboards = [];
    let activeWhiteboard = null;
    let activeMeetingId = null;
    let activeMaterialKey = null;
    let isClassSearchDetached = false;
    let blackboardExpanded = false;
    /** Tracks which tiles have been initialized by user action or system auto-open. */
    let initializedTiles = new Set();
    /** "stacked" (depth fan) or "slideshow" (single tile + arrows). */
    let tileLayout = "stacked";
    /** Ordered tile modes; last element is the front/active tile. */
    let tileOrder = ["agenda"];

    function isTeacherView() {
        return teacherAccount && getClassroomViewMode() === "teacher";
    }

    function selectedSnapshot() {
        return (
            classroomSnapshots.find(
                (snapshot) => snapshot.id === selectedClassId,
            ) ?? null
        );
    }

    function getSelectedActiveWhiteboardId(snapshot = selectedSnapshot()) {
        const activeWhiteboardId = String(
            snapshot?.classroom?.activeWhiteboardId ?? "",
        ).trim();
        return activeWhiteboardId || null;
    }

    function getSelectedActiveMaterialKey(snapshot = selectedSnapshot()) {
        const key = String(snapshot?.classroom?.activeMaterialKey ?? "").trim();
        return key || null;
    }

    async function patchClassroomLayout(classId, fields) {
        const normalizedClassId = String(classId ?? "").trim();
        if (!teacherAccount || !normalizedClassId) {
            return false;
        }
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(normalizedClassId)}/layout`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(fields),
            },
        );
        if (!response.ok) {
            return false;
        }
        const payload = await response.json().catch(() => null);
        const nextState = payload?.data ?? fields;
        classroomSnapshots = classroomSnapshots.map((snapshot) =>
            snapshot.id === normalizedClassId
                ? {
                      ...snapshot,
                      classroom: {
                          ...(snapshot.classroom ?? {}),
                          ...nextState,
                      },
                  }
                : snapshot,
        );
        return true;
    }

    async function persistActiveWhiteboardId(classId, nextActiveWhiteboardId) {
        return patchClassroomLayout(classId, {
            activeWhiteboardId: nextActiveWhiteboardId ?? null,
        });
    }

    async function persistActiveMaterialKey(classId, nextActiveMaterialKey) {
        return patchClassroomLayout(classId, {
            activeMaterialKey: nextActiveMaterialKey ?? null,
        });
    }

    function syncGlobalChatTarget() {
        const chatToggle = root.querySelector("#global-chat-toggle");
        if (!(chatToggle instanceof HTMLElement)) return;
        const chatUrl = String(selectedSnapshot()?.chatUrl ?? "").trim();
        chatToggle.dataset.chatTarget = chatUrl;
    }

    function getDefaultWorkspaceMode() {
        return "agenda";
    }

    function getWorkspaceMode() {
        return workspaceMode;
    }

    function setWorkspaceMode(nextMode, { remember = true } = {}) {
        const normalizedMode = normalizeWorkspaceMode(nextMode);
        workspaceMode = normalizedMode;
        if (normalizedMode === "whiteboard") {
            initializedTiles.add("whiteboard");
            if (!tileOrder.includes("whiteboard")) {
                tileOrder = [...tileOrder, "whiteboard"];
            }
        } else if (normalizedMode === "meeting") {
            initializedTiles.add("meeting");
            if (!tileOrder.includes("meeting")) {
                tileOrder = [...tileOrder, "meeting"];
            }
        }
        if (normalizedMode !== "meeting" && remember) {
            lastNonMeetingWorkspaceMode = normalizedMode;
        }
    }

    function syncStudentWorkspaceAccess(snapshot = selectedSnapshot()) {
        if (isTeacherView() || !snapshot) return;
        const meetingAutoJoinBlocked = Boolean(
            activeMeetingId &&
            classroomWindows?.isMeetingDismissed?.(activeMeetingId),
        );
        if (
            workspaceMode === "meeting" &&
            !classroomWindows?.isMeetingOpen() &&
            (!activeMeetingId || meetingAutoJoinBlocked)
        ) {
            setWorkspaceMode(lastNonMeetingWorkspaceMode, { remember: false });
        }
        const boardFocus = normalizeBoardFocus(snapshot?.classroom?.boardFocus);
        if (workspaceMode !== "meeting" && !classroomWindows?.isMeetingOpen()) {
            if (boardFocus === "whiteboard") initializedTiles.add("whiteboard");
            if (boardFocus) setWorkspaceMode(boardFocus, { remember: false });
        }
    }

    function syncWorkspaceModeWithSnapshot({ force = false } = {}) {
        const nextMode = getDefaultWorkspaceMode();
        if (force && workspaceMode === "agenda") {
            setWorkspaceMode(nextMode);
            return;
        }
        if (
            lastNonMeetingWorkspaceMode !== "notepad" &&
            lastNonMeetingWorkspaceMode !== "whiteboard"
        ) {
            lastNonMeetingWorkspaceMode = nextMode;
        }
    }

    function getBoardEntities(snapshot) {
        return boardEntityStore.get(snapshot);
    }

    function setBoardEntity(classId, kind, x, y) {
        boardEntityStore.set(classId, kind, x, y);
    }

    async function loadClassrooms() {
        const response = await apiFetch(`/api/v1/study/classrooms`);
        if (!response.ok) {
            throw new Error("load_failed");
        }
        const payload = await response.json();
        classroomSnapshots = Array.isArray(payload?.data) ? payload.data : [];
        for (const snapshot of classroomSnapshots) {
            const members = Array.isArray(snapshot?.members)
                ? snapshot.members
                : [];
            for (const member of members) {
                const accountId = String(member?.studentAccountId ?? "").trim();
                const presence = String(member?.presence ?? "").trim();
                if (!accountId || !presence) continue;
                presenceByAccountId.set(accountId, presence);
            }
        }
        if (
            !selectedClassId ||
            !classroomSnapshots.some(
                (snapshot) => snapshot.id === selectedClassId,
            )
        ) {
            if (!isClassSearchDetached) {
                selectedClassId = String(classroomSnapshots[0]?.id ?? "");
                selectedSeatNumber = null;
            }
        }
        syncWorkspaceModeWithSnapshot({ force: true });
    }

    async function loadAvailableClasses() {
        if (isTeacherView()) {
            availableClasses = [];
            return;
        }
        const queryString = buildQuery({
            language: selectedLanguageFilter,
            search: searchQuery,
        });
        const response = await apiFetch(
            `/api/v1/study/available-classes${queryString ? `?${queryString}` : ""}`,
        );
        if (!response.ok) {
            availableClasses = [];
            return;
        }
        const payload = await response.json();
        availableClasses = Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadSelectedClassMeta() {
        const snapshot = selectedSnapshot();
        if (!snapshot) {
            selectedNotebookText = "";
            classResources = createDefaultClassResources();
            agendaDocument = "";
            agendaSnapshots = [];
            whiteboards = [];
            activeWhiteboard = null;
            activeMeetingId = null;
            return;
        }
        const [
            resourcesResponse,
            notebookResponse,
            agendaResponse,
            whiteboardsResponse,
            activeMeetingResponse,
        ] = await Promise.all([
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/agenda`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards`,
            ),
            apiFetch(
                `/api/v1/modules/jitsi-meet/meetings/active?classroomId=${encodeURIComponent(snapshot.id)}`,
            ).catch(() => null),
        ]);
        classResources = resourcesResponse.ok
            ? ((await resourcesResponse.json())?.data ??
              createDefaultClassResources())
            : createDefaultClassResources();
        selectedNotebookText = notebookResponse.ok
            ? String((await notebookResponse.json())?.data?.noteText ?? "")
            : "";
        const agendaPayload = agendaResponse.ok
            ? (await agendaResponse.json().catch(() => ({ data: null })))?.data
            : null;
        agendaDocument = String(agendaPayload?.document ?? "");
        agendaSnapshots = Array.isArray(agendaPayload?.snapshots)
            ? agendaPayload.snapshots
            : [];
        classResources = {
            ...classResources,
            agendaDocument,
            agendaSnapshots,
        };
        const activeMeetingPayload = activeMeetingResponse?.ok
            ? await activeMeetingResponse.json().catch(() => ({ data: [] }))
            : { data: [] };
        const activeMeetings = Array.isArray(activeMeetingPayload?.data)
            ? activeMeetingPayload.data
            : [];
        const activeMeeting = activeMeetings.find((meeting) => {
            const meetingClassroomId = String(
                meeting?.classroomId ??
                    meeting?.classId ??
                    meeting?.classroom?.id ??
                    "",
            ).trim();
            return meetingClassroomId === snapshot.id;
        });
        const teacherAccountId = String(
            snapshot?.teacherAccountId ?? "",
        ).trim();
        const activeParticipants = Array.isArray(
            activeMeeting?.activeParticipants,
        )
            ? activeMeeting.activeParticipants
            : [];
        // Active meeting participant payloads can expose either username or
        // handle, while classroom snapshots only expose teacherAccountId.
        const teacherActiveInMeeting = Boolean(
            teacherAccountId &&
            activeParticipants.some((participant) => {
                const username = String(participant?.username ?? "").trim();
                const handle = String(participant?.handle ?? "").trim();
                return (
                    username === teacherAccountId || handle === teacherAccountId
                );
            }),
        );
        activeMeetingId = teacherActiveInMeeting
            ? String(activeMeeting?.id ?? "").trim() || null
            : null;
        whiteboards = whiteboardsResponse.ok
            ? ((await whiteboardsResponse.json())?.data ?? [])
            : [];
        const selectedActiveWhiteboardId =
            getSelectedActiveWhiteboardId(snapshot);
        if (!isTeacherView()) {
            whiteboards = selectedActiveWhiteboardId
                ? whiteboards.filter(
                      (board) =>
                          String(board?.id ?? "") ===
                          selectedActiveWhiteboardId,
                  )
                : [];
        }
        if (activeWhiteboard) {
            const match = whiteboards.find(
                (board) => String(board?.id ?? "") === activeWhiteboard.boardId,
            );
            if (!match) {
                activeWhiteboard = null;
            } else {
                activeWhiteboard = {
                    ...activeWhiteboard,
                    boardName: String(
                        match?.name ?? activeWhiteboard.boardName,
                    ),
                };
            }
        }
        if (
            !isTeacherView() &&
            activeWhiteboard?.boardId !== selectedActiveWhiteboardId
        ) {
            activeWhiteboard = null;
        }
        syncStudentWorkspaceAccess(snapshot);
    }

    async function refreshData() {
        await Promise.all([loadClassrooms(), loadAvailableClasses()]);
        await loadSelectedClassMeta();
    }

    async function updateBoardFocus(nextFocus) {
        const snapshot = selectedSnapshot();
        if (!snapshot || !isTeacherView()) return;
        const normalizedFocus = normalizeBoardFocus(nextFocus);
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(snapshot.id)}/layout`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ boardFocus: normalizedFocus }),
            },
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        const nextState = payload?.data;
        if (nextState) {
            snapshot.classroom = {
                ...(snapshot.classroom ?? {}),
                ...nextState,
            };
        } else if (snapshot.classroom) {
            snapshot.classroom.boardFocus = normalizedFocus;
        }
        if (normalizedFocus === "chat") {
            setWorkspaceMode("chat");
        } else if (workspaceMode !== "agenda") {
            setWorkspaceMode("agenda");
        }
    }

    function renderSubNavigationMarkup() {
        return renderClassroomSubNavigation({
            i18n,
            classes: footerClasses,
            selectedClassId,
        });
    }

    function refreshSubNavigation() {
        const subNav = root.querySelector(".page-subnav");
        if (subNav instanceof HTMLElement) {
            const nextMarkup = renderSubNavigationMarkup();
            if (subNav.innerHTML !== nextMarkup) {
                subNav.innerHTML = nextMarkup;
            }
        }
    }

    async function openClassSearch() {
        if (teacherAccount && getClassroomViewMode() === "teacher") {
            setClassroomViewMode("student");
        }
        isClassSearchDetached = true;
        selectedClassId = "";
        selectedSeatNumber = null;
        activeWhiteboard = null;
        setWorkspaceMode("agenda");
        await loadAvailableClasses();
        refreshDom();
        refreshSubNavigation();
        composer.refreshFooter();
    }

    async function handleSeatActionMenu(button) {
        await openSeatActionMenu({
            button,
            getSelectedClassId: () => selectedClassId,
            apiFetch,
            i18n,
            openSearchPopup,
            openPopup,
            escapeHtml,
            showToast,
            navigateTo,
            refreshContent,
        });
    }

    function renderContentMarkup() {
        const snapshot = selectedSnapshot();
        return renderClassroomPage({
            snapshot,
            classResources: {
                ...classResources,
                agendaDocument,
                agendaSnapshots,
            },
            selectedSeatNumber,
            selectedNotebookText,
            i18n,
            isTeacherView: isTeacherView(),
            availableClasses,
            selectedLanguageFilter,
            searchQuery,
            canToggleView: teacherAccount,
            currentViewMode: getClassroomViewMode(),
            canEditMaterials: teacherAccount,
            boardEntities: getBoardEntities(snapshot),
            workspaceMode,
            activeMaterialKey,
            whiteboards,
            activeWhiteboard,
            activeWhiteboardId: getSelectedActiveWhiteboardId(snapshot),
            hasActiveMeeting: Boolean(activeMeetingId),
            isChatOpen: classroomWindows?.isChatOpen() ?? false,
            isMeetingOpen: classroomWindows?.isMeetingOpen() ?? false,
            blackboardExpanded,
            initializedTiles,
            tileLayout,
            tileOrder,
        });
    }

    function refreshDom() {
        const content = root.querySelector(".classes-classroom-content");
        if (content instanceof HTMLElement) {
            classroomWindows?.hoist();
            content.outerHTML = renderContentMarkup();
            const nextSnapshot = selectedSnapshot();
            const notepadHost = root.querySelector(".classes-notepad-host");
            if (notepadHost instanceof HTMLElement && nextSnapshot) {
                if (
                    !classroomNotepad ||
                    classroomNotepadClassId !== nextSnapshot.id
                ) {
                    classroomNotepad = createClassroomNotepad({
                        classId: nextSnapshot.id,
                        i18n,
                    });
                    classroomNotepadClassId = nextSnapshot.id;
                }
                notepadHost.replaceChildren(classroomNotepad.getElement());
                if (getWorkspaceMode() === "notepad") {
                    classroomNotepad.focus();
                }
            }
            void hydrateProfileAvatars(root);
            classroomWindows?.reattach();
        }
    }

    const refreshDynamicDom = createDynamicDomRefresher({
        root,
        selectedSnapshot,
        getSelectedSeatNumber: () => selectedSeatNumber,
        i18n,
        isTeacherView,
    });

    const refreshWorkspaceTilesOnly = createWorkspaceTileRefresher({
        root,
        getWorkspaceMode: () => workspaceMode,
        getInitializedTiles: () => initializedTiles,
        getTileOrder: () => tileOrder,
        i18n,
        fallbackRefreshDom: refreshDom,
    });

    async function refreshContent() {
        await refreshData();
        refreshSnapshotPresence();
        footerClasses = await loadFooterClasses();
        refreshDom();
        syncGlobalChatTarget();
        composer.refreshFooter();
        refreshSubNavigation();
    }

    function refreshSnapshotPresence() {
        classroomSnapshots = classroomSnapshots.map((snapshot) => ({
            ...snapshot,
            members: Array.isArray(snapshot?.members)
                ? snapshot.members.map((member) => {
                      const accountId = String(
                          member?.studentAccountId ?? "",
                      ).trim();
                      return {
                          ...member,
                          presence:
                              presenceByAccountId.get(accountId) ??
                              member?.presence ??
                              "offline",
                      };
                  })
                : [],
        }));
    }

    footerClasses = await loadFooterClasses();
    await refreshData();
    refreshSnapshotPresence();
    const presenceController = createClassroomPresenceController({
        apiFetch,
        signal,
        onPresence: (accountId, status) => {
            presenceByAccountId.set(accountId, status);
            refreshSnapshotPresence();
            refreshDynamicDom();
        },
    });
    await presenceController.init();

    const footerItem = createClassFooterItem({
        i18n,
        signal,
        getClasses: () => footerClasses,
        getSelectedClassId: () => selectedClassId,
        allowCreateOption: false,
        onSelectClass: async (classId) => {
            const previousClassId = selectedClassId;
            const previousInlineWhiteboardId =
                activeWhiteboard?.boardId ?? null;
            isClassSearchDetached = false;
            selectedClassId = classId;
            selectedSeatNumber = null;
            activeWhiteboard = null;
            initializedTiles = new Set();
            tileOrder = ["agenda"];
            if (
                previousClassId &&
                previousClassId !== classId &&
                previousInlineWhiteboardId &&
                !classroomWindows?.isWhiteboardOpen()
            ) {
                void persistActiveWhiteboardId(previousClassId, null);
            }
            if (
                previousClassId &&
                previousClassId !== classId &&
                classroomWindows?.isMeetingOpen()
            ) {
                // Close the meeting from the previous class before switching.
                // onMeetingVisibilityChange fires synchronously and handles
                // setWorkspaceMode and refreshDom for the close transition.
                classroomWindows.closeMeeting();
            }
            syncWorkspaceModeWithSnapshot({ force: false });
            await loadSelectedClassMeta();
            refreshDom();
            syncGlobalChatTarget();
        },
    });

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "classroom-page",
                title: i18n.t("module.study.classes.classroom_page_title"),
                gridSize: { default: [8, 6], min: [2, 2], max: "full" },
                render: renderContentMarkup,
                onRender() {
                    bindClassroomInteractions({
                        root,
                        signal,
                        i18n,
                        apiFetch,
                        openPopup,
                        escapeHtml,
                        navigateTo,
                        bindProfilePreviews,
                        getInteractionsBound: () => interactionsBound,
                        setInteractionsBound: (value) => {
                            interactionsBound = value;
                        },
                        selectedSnapshot,
                        getSelectedClassId: () => selectedClassId,
                        setSelectedClassId: (classId) => {
                            isClassSearchDetached = false;
                            selectedClassId = classId;
                        },
                        getSelectedSeatNumber: () => selectedSeatNumber,
                        setSelectedSeatNumber: (seatNumber) => {
                            selectedSeatNumber = seatNumber;
                        },
                        getActiveWhiteboard: () => activeWhiteboard,
                        setActiveWhiteboard: (whiteboard) => {
                            activeWhiteboard = whiteboard;
                        },
                        getSelectedActiveWhiteboardId,
                        getActiveMeetingId: () => activeMeetingId,
                        getTeacherAccount: () => teacherAccount,
                        getClassroomViewMode,
                        setClassroomViewMode,
                        isTeacherView,
                        getClassroomWindows: () => classroomWindows,
                        updateBoardFocus,
                        normalizeWorkspaceMode,
                        setWorkspaceMode,
                        normalizeSidebarMode,
                        getSidebarMode: () => sidebarMode,
                        setSidebarMode: (mode) => {
                            sidebarMode = normalizeSidebarMode(mode);
                        },
                        handleSeatActionMenu,
                        openClassSettingsPopup,
                        openClassSearch,
                        refreshContent,
                        refreshDom,
                        refreshSubNavigation,
                        refreshComposerFooter: () => composer.refreshFooter(),
                        syncWorkspaceModeWithSnapshot,
                        syncGlobalChatTarget,
                        showToast,
                        handleClassroomExit,
                        handleResourceActions,
                        handleWhiteboardAndNotepadActions,
                        handleFileActions,
                        getClassResources: () => classResources,
                        loadSelectedClassMeta,
                        getClassroomNotepad: () => classroomNotepad,
                        setClassroomNotepad: (notepad) => {
                            classroomNotepad = notepad;
                        },
                        getClassroomNotepadClassId: () =>
                            classroomNotepadClassId,
                        setClassroomNotepadClassId: (classId) => {
                            classroomNotepadClassId = classId;
                        },
                        createClassroomNotepad,
                        persistActiveWhiteboardId,
                        getActiveMaterialKey: () => activeMaterialKey,
                        setActiveMaterialKey: (key) => {
                            activeMaterialKey = key ?? null;
                        },
                        persistActiveMaterialKey,
                        loadAvailableClasses,
                        setSelectedLanguageFilter: (language) => {
                            selectedLanguageFilter = language;
                        },
                        setSearchQuery: (queryText) => {
                            searchQuery = queryText;
                        },
                        setNotebookText: (text) => {
                            selectedNotebookText = text;
                        },
                        setBoardEntity,
                        getBlackboardExpanded: () => blackboardExpanded,
                        setBlackboardExpanded: (value) => {
                            blackboardExpanded = Boolean(value);
                        },
                        getTileLayout: () => tileLayout,
                        setTileLayout: (layout) => {
                            tileLayout =
                                layout === "slideshow"
                                    ? "slideshow"
                                    : "stacked";
                        },
                        getTileOrder: () => tileOrder,
                        setTileOrder: (order) => {
                            tileOrder = Array.isArray(order)
                                ? order
                                : tileOrder;
                        },
                        refreshWorkspaceTilesOnly,
                    });
                    root.addEventListener("error", handleProfileAvatarError, {
                        signal,
                        capture: true,
                    });
                },
            },
        ],
        preferenceKey: "classes-classroom-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.classroom_page_title"),
            subtitle: i18n.t("module.study.classes.classroom_page_subtitle"),
        },
        subNavigation: [
            {
                id: "classes-classroom-subnav",
                label: i18n.t("module.study.classes.classroom_select_class"),
                render: renderSubNavigationMarkup,
            },
        ],
        footer: [footerItem],
        showChatToggle: true,
    });
    await composer.init();
    const pageContent = root.querySelector(".page-content");
    if (pageContent instanceof HTMLElement) {
        pageContent.classList.add("classes-classroom-page-content");
    }
    void hydrateProfileAvatars(root);
    syncGlobalChatTarget();
    classroomWindows = createClassroomWindows({
        root,
        i18n,
        isTeacher: Boolean(teacherAccount && isTeacherView()),
        signal,
        onMeetingVisibilityChange: ({ visible, returnMode } = {}) => {
            if (visible) {
                setWorkspaceMode("meeting", { remember: false });
            } else if (returnMode === "agenda") {
                setWorkspaceMode("agenda", { remember: false });
            } else {
                setWorkspaceMode(lastNonMeetingWorkspaceMode, {
                    remember: false,
                });
            }
            refreshDom();
        },
        onWhiteboardVisibilityChange: ({ visible, classId, boardId }) => {
            if (!teacherAccount || !classId) {
                return;
            }
            void persistActiveWhiteboardId(
                classId,
                visible ? (boardId ?? null) : null,
            );
        },
    });
    classroomWindows.reattach();
    startClassroomRealtimeRefresh({
        signal,
        refresh: async () => {
            const previousActiveMeetingId = activeMeetingId;
            const previousSelectedClassId = selectedClassId;
            await loadClassrooms();
            await loadSelectedClassMeta();
            const selectedClassChanged =
                selectedClassId !== previousSelectedClassId;
            if (!isTeacherView()) {
                if (
                    activeMeetingId &&
                    activeMeetingId !== previousActiveMeetingId
                ) {
                    classroomWindows.notifyActiveMeeting(activeMeetingId);
                }
            }
            refreshSnapshotPresence();
            syncStudentWorkspaceAccess();
            const broadcastedMaterialKey = getSelectedActiveMaterialKey();
            if (
                broadcastedMaterialKey &&
                broadcastedMaterialKey !== activeMaterialKey
            ) {
                activeMaterialKey = broadcastedMaterialKey;
                sidebarMode = "materials";
            }
            refreshDynamicDom();
            syncGlobalChatTarget();
            if (selectedClassChanged) {
                footerClasses = await loadFooterClasses();
                composer.refreshFooter();
                refreshSubNavigation();
            }
            if (!isTeacherView()) {
                // Teacher ended the meeting; close the overlay and notify the student.
                const teacherJustLeft = Boolean(
                    previousActiveMeetingId && !activeMeetingId,
                );
                if (teacherJustLeft && classroomWindows?.isMeetingOpen()) {
                    showToast(
                        i18n.t("module.study.classes.meeting_teacher_ended"),
                        { variant: "info" },
                    );
                    classroomWindows.closeMeeting();
                    // onMeetingVisibilityChange fires synchronously and handles
                    // setWorkspaceMode and refreshDom for the close transition.
                    return;
                }
                const meetingAutoJoinBlocked = Boolean(
                    activeMeetingId &&
                    classroomWindows?.isMeetingDismissed?.(activeMeetingId),
                );
                if (
                    selectedClassId &&
                    classroomWindows &&
                    activeMeetingId &&
                    !meetingAutoJoinBlocked
                ) {
                    if (!classroomWindows.isMeetingOpen()) {
                        await classroomWindows.tryAutoJoin(selectedClassId);
                        if (classroomWindows.isMeetingOpen()) {
                            setWorkspaceMode("meeting", { remember: false });
                            refreshDom();
                        } else {
                            syncStudentWorkspaceAccess();
                            refreshDynamicDom();
                        }
                    } else {
                        refreshDynamicDom();
                    }
                } else {
                    syncStudentWorkspaceAccess();
                    refreshDynamicDom();
                }
            }
        },
    });
}

await mountWhenDirect(mount);
