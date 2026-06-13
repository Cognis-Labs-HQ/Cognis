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
import {
    applyPresenceToSnapshots,
    applyClassroomSnapshotPatch,
    buildQuery,
    createDefaultClassResources,
    findSelectedSnapshot,
    getNormalizedBoardFocus,
    normalizeSidebarMode,
    normalizeWorkspaceMode,
    refreshClassroomRoleIfNeeded,
    resolvePreviousPath,
    syncTileLayoutFromSnapshot,
} from "/static/adapters/study/classes/classroom/helpers.js";
import { createLayoutApi } from "/static/adapters/study/classes/classroom/layout-api.js";
import { createSnapshotStateHelpers } from "/static/adapters/study/classes/classroom/snapshot-state.js";
import {
    loadTileLayoutPreference,
    normalizeTileLayout,
    saveTileLayoutPreference,
} from "/static/adapters/study/classes/classroom/tile-layout-preference.js";
import { createStudentSync } from "/static/adapters/study/classes/classroom/student-sync.js";

export async function mount(root, { signal } = {}) {
    applyClassroomViewModeFromUrl();
    const previousPath = resolvePreviousPath();
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/adapters/study/notepad/languages",
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "module.study.classes.classroom_page_title");
    await refreshClassroomRoleIfNeeded({
        canToggleClassroomView,
        apiFetch,
        applyClassroomViewModeFromUrl,
    });

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
    let classroomWindows = null;
    let classroomNotepad = null;
    let classroomNotepadClassId = "";
    let whiteboards = [];
    let activeWhiteboard = null;
    let activeMeetingId = null;
    let activeMaterialKey = null;
    let activeMaterialPreviewKey = "";
    let activeMaterialPreviewUrl = "";
    let activeMaterialPreviewContentType = "";
    let activeMaterialPreviewFailed = false;
    let isClassSearchDetached = false;
    let blackboardExpanded = true;
    let initializedTiles = new Set();
    let tileLayout = "stacked";
    let tileOrder = ["agenda"];

    const selectedSnapshot = () =>
        findSelectedSnapshot(classroomSnapshots, selectedClassId);

    function revokeActiveMaterialPreview() {
        if (activeMaterialPreviewUrl) {
            URL.revokeObjectURL(activeMaterialPreviewUrl);
        }
        activeMaterialPreviewUrl = "";
        activeMaterialPreviewContentType = "";
        activeMaterialPreviewFailed = false;
        activeMaterialPreviewKey = "";
    }

    async function loadActiveMaterialPreview(materialKey, files = null) {
        const normalizedMaterialKey = String(materialKey ?? "").trim();
        if (!normalizedMaterialKey) {
            revokeActiveMaterialPreview();
            return;
        }
        if (
            normalizedMaterialKey === activeMaterialPreviewKey &&
            (activeMaterialPreviewUrl || activeMaterialPreviewFailed)
        ) {
            return;
        }
        const fileList = Array.isArray(files) ? files : classResources.files;
        const matchedFile = Array.isArray(fileList)
            ? fileList.find(
                  (fileRef) =>
                      String(fileRef?.key ?? "").trim() ===
                      normalizedMaterialKey,
              )
            : null;
        const previousPreviewUrl = activeMaterialPreviewUrl;
        revokeActiveMaterialPreview();
        activeMaterialPreviewKey = normalizedMaterialKey;
        activeMaterialPreviewContentType = String(
            matchedFile?.contentType ?? "",
        ).trim();
        const response = await apiFetch(
            `/api/v1/files/${normalizedMaterialKey}`,
            {
                suppressConnectionRecoveryToast: true,
            },
        ).catch(() => null);
        if (!response?.ok) {
            activeMaterialPreviewFailed = true;
            return;
        }
        const previewBlob = await response.blob().catch(() => null);
        if (!(previewBlob instanceof Blob)) {
            activeMaterialPreviewFailed = true;
            return;
        }
        if (activeMaterialPreviewKey !== normalizedMaterialKey) {
            if (previousPreviewUrl) {
                URL.revokeObjectURL(previousPreviewUrl);
            }
            return;
        }
        activeMaterialPreviewUrl = URL.createObjectURL(previewBlob);
        activeMaterialPreviewContentType =
            previewBlob.type || activeMaterialPreviewContentType;
        activeMaterialPreviewFailed = false;
    }

    signal?.addEventListener(
        "abort",
        () => {
            revokeActiveMaterialPreview();
        },
        { once: true },
    );

    const {
        isTeacherView,
        computeIsTeacherPresent,
        getSelectedActiveWhiteboardId,
        getSelectedActiveMaterialKey,
        getSelectedViewLayout,
    } = createSnapshotStateHelpers({
        teacherAccount,
        getClassroomViewMode,
        selectedSnapshot,
        presenceByAccountId,
    });

    function syncTileLayoutWithSnapshot(snapshot = selectedSnapshot()) {
        if (teacherAccount && isTeacherView()) {
            return;
        }
        syncTileLayoutFromSnapshot({
            snapshot: {
                classroom: {
                    viewLayout: getSelectedViewLayout(snapshot),
                },
            },
            normalizeTileLayout,
            setTileLayout: (nextLayout) => {
                tileLayout = nextLayout;
            },
        });
    }

    function applySnapshotPatch(classId, patch) {
        classroomSnapshots = applyClassroomSnapshotPatch(
            classroomSnapshots,
            classId,
            patch,
        );
    }

    const {
        patchClassroomLayout,
        persistActiveWhiteboardId,
        persistActiveMaterialKey,
        updateBoardFocus,
        patchViewLayout,
    } = createLayoutApi({
        apiFetch,
        isTeacherView,
        selectedSnapshot,
        applySnapshotPatch,
    });

    const syncGlobalChatTarget = () => {
        const chatToggle = root.querySelector("#global-chat-toggle");
        if (!(chatToggle instanceof HTMLElement)) return;
        const chatUrl = String(selectedSnapshot()?.chatUrl ?? "").trim();
        chatToggle.dataset.chatTarget = chatUrl;
    };

    const DEFAULT_WORKSPACE_MODE = "agenda";
    const getWorkspaceMode = () => workspaceMode;

    function setWorkspaceMode(nextMode, { remember = true } = {}) {
        const normalizedMode = normalizeWorkspaceMode(nextMode);
        workspaceMode = normalizedMode;
        if (
            normalizedMode === "chat" ||
            normalizedMode === "whiteboard" ||
            normalizedMode === "meeting"
        ) {
            initializedTiles.add(normalizedMode);
            if (!tileOrder.includes(normalizedMode)) {
                tileOrder = [...tileOrder, normalizedMode];
            }
        }
        if (normalizedMode !== "meeting" && remember) {
            lastNonMeetingWorkspaceMode = normalizedMode;
        }
    }

    const { pollTeacherViewState, syncStudentWorkspaceAccess } =
        createStudentSync({
            apiFetch,
            isTeacherView,
            normalizeTileLayout,
            selectedSnapshot,
            getNormalizedBoardFocus,
            setWorkspaceMode,
            initializedTiles,
            getSelectedClassId: () => selectedClassId,
            setTileLayout: (layout) => (tileLayout = layout),
            getActiveMeetingId: () => activeMeetingId,
            getClassroomWindows: () => classroomWindows,
            getWorkspaceMode: () => workspaceMode,
            getLastNonMeetingMode: () => lastNonMeetingWorkspaceMode,
            getTileOrder: () => tileOrder,
            setTileOrder: (nextTileOrder) => {
                tileOrder = Array.isArray(nextTileOrder)
                    ? nextTileOrder
                    : tileOrder;
            },
        });

    function syncWorkspaceModeWithSnapshot({ force = false } = {}) {
        const nextMode = DEFAULT_WORKSPACE_MODE;
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

    const getBoardEntities = (snapshot) => boardEntityStore.get(snapshot);

    const setBoardEntity = (classId, kind, x, y) =>
        boardEntityStore.set(classId, kind, x, y);

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
            activeMaterialKey = null;
            revokeActiveMaterialPreview();
            return;
        }
        syncTileLayoutWithSnapshot(snapshot);
        const selectedActiveWhiteboardId =
            getSelectedActiveWhiteboardId(snapshot);
        const [
            resourcesResponse,
            notebookResponse,
            agendaResponse,
            whiteboardsResponse,
            activeMeetingResponse,
            studentWhiteboardTokenResponse,
        ] = await Promise.all([
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
                { suppressConnectionRecoveryToast: true },
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
            !isTeacherView() && selectedActiveWhiteboardId
                ? apiFetch(
                      `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards/${encodeURIComponent(selectedActiveWhiteboardId)}/token`,
                      { suppressConnectionRecoveryToast: true },
                  ).catch(() => null)
                : Promise.resolve(null),
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
        if (
            !isTeacherView() &&
            selectedActiveWhiteboardId &&
            !activeWhiteboard?.embedUrl &&
            studentWhiteboardTokenResponse?.ok
        ) {
            const tokenPayload = await studentWhiteboardTokenResponse
                .json()
                .catch(() => ({ data: {} }));
            const embedUrl = String(tokenPayload?.data?.embedUrl ?? "").trim();
            if (embedUrl) {
                const matchBoard = whiteboards.find(
                    (board) =>
                        String(board?.id ?? "") === selectedActiveWhiteboardId,
                );
                activeWhiteboard = {
                    boardId: selectedActiveWhiteboardId,
                    boardName:
                        String(matchBoard?.name ?? "").trim() ||
                        i18n.t("module.study.classes.whiteboard"),
                    embedUrl,
                };
                initializedTiles.add("whiteboard");
            }
        }
        activeMaterialKey = getSelectedActiveMaterialKey(snapshot);
        await loadActiveMaterialPreview(
            activeMaterialKey,
            classResources.files,
        );
        syncStudentWorkspaceAccess(snapshot);
        await pollTeacherViewState();
    }

    async function refreshData() {
        await Promise.all([loadClassrooms(), loadAvailableClasses()]);
        await loadSelectedClassMeta();
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
            activeMaterialPreview: {
                url: activeMaterialPreviewUrl,
                contentType: activeMaterialPreviewContentType,
                failed: activeMaterialPreviewFailed,
            },
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
            isTeacherPresent: computeIsTeacherPresent(snapshot),
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
            if (nextSnapshot?.chatUrl && workspaceMode === "chat") {
                classroomWindows?.openChat(nextSnapshot.chatUrl);
            } else if (classroomWindows?.isChatOpen()) {
                classroomWindows.closeChat();
            }
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
        getTileLayout: () => tileLayout,
        getIsMeetingOpen: () => classroomWindows?.isMeetingOpen() ?? false,
        getClassroomWindows: () => classroomWindows,
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
        classroomSnapshots = applyPresenceToSnapshots(
            classroomSnapshots,
            presenceByAccountId,
        );
    }

    footerClasses = await loadFooterClasses();
    await refreshData();
    refreshSnapshotPresence();

    if (isTeacherView()) {
        const initSnapshot = selectedSnapshot();
        const savedFocus = getNormalizedBoardFocus(
            initSnapshot,
            normalizeBoardFocus,
        );
        if (savedFocus && savedFocus !== "agenda") {
            const restoredMode = normalizeWorkspaceMode(savedFocus);
            if (restoredMode === "whiteboard" || restoredMode === "meeting") {
                setWorkspaceMode(restoredMode);
            }
        }
    }
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
            if (teacherAccount && getClassroomViewMode() !== "teacher") {
                setClassroomViewMode("teacher");
            }
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
                        setAgendaDocument: (text) => {
                            agendaDocument = String(text ?? "");
                            classResources = {
                                ...classResources,
                                agendaDocument,
                            };
                        },
                        setBoardEntity,
                        getBlackboardExpanded: () => blackboardExpanded,
                        setBlackboardExpanded: (value) => {
                            blackboardExpanded = Boolean(value);
                        },
                        getTileLayout: () => tileLayout,
                        setTileLayout: (layout) => {
                            tileLayout = normalizeTileLayout(layout);
                            void saveTileLayoutPreference(tileLayout);
                            if (isTeacherView()) {
                                void patchViewLayout(tileLayout);
                            }
                        },
                        getTileOrder: () => tileOrder,
                        setTileOrder: (order) => {
                            tileOrder = Array.isArray(order)
                                ? order
                                : tileOrder;
                        },
                        refreshWorkspaceTilesOnly,
                        getIsTeacherPresent: computeIsTeacherPresent,
                        loadActiveMaterialPreview,
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
    tileLayout = await loadTileLayoutPreference();
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
            } else {
                const returnWorkspaceMode =
                    returnMode === "agenda"
                        ? "agenda"
                        : lastNonMeetingWorkspaceMode;
                setWorkspaceMode(returnWorkspaceMode, { remember: false });
                if (isTeacherView()) {
                    void updateBoardFocus(returnWorkspaceMode);
                }
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
        onChatVisibilityChange: ({ visible } = {}) => {
            if (visible) {
                setWorkspaceMode("chat");
            } else if (workspaceMode === "chat") {
                setWorkspaceMode(lastNonMeetingWorkspaceMode, {
                    remember: false,
                });
                if (isTeacherView()) {
                    void updateBoardFocus(lastNonMeetingWorkspaceMode);
                }
                refreshDom();
            }
        },
    });
    classroomWindows.reattach();
    startClassroomRealtimeRefresh({
        signal,
        intervalMs: isTeacherView() ? 3000 : 1000,
        refresh: async () => {
            const previousActiveMeetingId = activeMeetingId;
            const previousAgendaDocument = agendaDocument;
            const previousSelectedClassId = selectedClassId;
            await loadClassrooms();
            await loadSelectedClassMeta();
            const selectedClassStillExists = classroomSnapshots.some(
                (snapshot) => snapshot.id === previousSelectedClassId,
            );
            const teacherLeftClassroom =
                !isTeacherView() &&
                Boolean(previousSelectedClassId) &&
                !selectedClassStillExists;
            if (teacherLeftClassroom) {
                classroomWindows?.closeMeeting();
                classroomWindows?.closeChat();
                showToast(
                    i18n.t("module.study.classes.teacher_left_classroom"),
                    {
                        variant: "info",
                    },
                );
                refreshDom();
                syncGlobalChatTarget();
                refreshSubNavigation();
                composer.refreshFooter();
                return;
            }
            const selectedClassChanged =
                selectedClassId !== previousSelectedClassId;
            const agendaChanged = agendaDocument !== previousAgendaDocument;
            if (!isTeacherView()) {
                // activeMeetingId is only non-null when selectedClassId is set, so the
                // !selectedClassId guard prevents a redundant notification when the student
                // is already inside the selected class and will see the meeting tile directly.
                if (
                    activeMeetingId &&
                    activeMeetingId !== previousActiveMeetingId &&
                    !selectedClassId
                ) {
                    classroomWindows.notifyActiveMeeting(activeMeetingId);
                }
            }
            refreshSnapshotPresence();
            const previousWorkspaceMode = workspaceMode;
            syncStudentWorkspaceAccess();
            await pollTeacherViewState();
            const broadcastedMaterialKey = getSelectedActiveMaterialKey();
            if (broadcastedMaterialKey !== activeMaterialKey) {
                activeMaterialKey = broadcastedMaterialKey;
                await loadActiveMaterialPreview(
                    activeMaterialKey,
                    classResources.files,
                );
            }
            if (workspaceMode !== previousWorkspaceMode) {
                refreshWorkspaceTilesOnly();
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
                        if (activeMeetingId !== previousActiveMeetingId) {
                            await classroomWindows.tryAutoJoin(selectedClassId);
                        }
                        if (classroomWindows.isMeetingOpen()) {
                            setWorkspaceMode("meeting", { remember: false });
                            refreshDom();
                        } else {
                            const previousMode = workspaceMode;
                            syncStudentWorkspaceAccess();
                            if (workspaceMode !== previousMode) {
                                refreshWorkspaceTilesOnly();
                            }
                            agendaChanged ? refreshDom() : refreshDynamicDom();
                        }
                    } else {
                        refreshDynamicDom();
                    }
                } else {
                    const previousMode = workspaceMode;
                    syncStudentWorkspaceAccess();
                    if (workspaceMode !== previousMode) {
                        refreshWorkspaceTilesOnly();
                    }
                    agendaChanged ? refreshDom() : refreshDynamicDom();
                }
            }
        },
    });
}
await mountWhenDirect(mount);
