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
    loadFooterClasses,
    createClassFooterItem,
} from "/static/adapters/study/classes/study-footer.js";
import {
    applyClassroomViewModeFromUrl,
    canToggleClassroomView,
    getClassroomViewMode,
    setClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";
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
import { handleWhiteboardAndNotepadActions } from "/static/adapters/study/classes/classroom-whiteboard-actions.js";
import { handleResourceActions } from "/static/adapters/study/classes/classroom-resource-actions.js";
import { handleFileActions } from "/static/adapters/study/classes/classroom-file-actions.js";
import { bindClassroomInteractions } from "/static/adapters/study/classes/classroom/interactions.js";
import { normalizeBoardFocus } from "/static/adapters/study/classes/board-focus.js";
import {
    createClassroomDataLoaders,
    createClassMetaLoader,
} from "/static/adapters/study/classes/classroom/data-loaders.js";
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
    resolveActiveMeetingId,
    resolvePreviousPath,
    syncTileLayoutFromSnapshot,
} from "/static/adapters/study/classes/classroom/helpers.js";
import { createLayoutApi } from "/static/adapters/study/classes/classroom/layout-api.js";
import { createClassroomMaterialPreviewManager } from "/static/adapters/study/classes/classroom/material-preview.js";
import { createSnapshotStateHelpers } from "/static/adapters/study/classes/classroom/snapshot-state.js";
import {
    loadTileLayoutPreference,
    normalizeTileLayout,
    saveTileLayoutPreference,
} from "/static/adapters/study/classes/classroom/tile-layout-preference.js";
import { createStudentSync } from "/static/adapters/study/classes/classroom/student-sync.js";
import {
    loadNotepadFactory,
    getNotepadStringsBaseUrl,
    mountClassroomNotepad,
} from "/static/adapters/study/classes/classroom/notepad-loader.js";
import { loadProfileAvatarHelpers } from "/static/adapters/study/classes/classroom/profile-avatar.js";
import { loadWindowsFactories } from "/static/adapters/study/classes/classroom/windows-loader.js";
import { mountMaterialImageViewer } from "/static/adapters/study/classes/classroom/material-viewer-mount.js";
import { captureFocus, restoreFocus } from "/static/reuse/focus-guard.js";
import { createContentMarkupRenderer } from "/static/adapters/study/classes/classroom/content-markup.js";

export async function mount(root, { signal } = {}) {
    applyClassroomViewModeFromUrl();
    const previousPath = resolvePreviousPath();

    const createClassroomNotepad = await loadNotepadFactory();
    const notepadStringsBaseUrl = getNotepadStringsBaseUrl();
    const profileAvatarHelpers = await loadProfileAvatarHelpers();
    const { createMeetingEmbed, createWhiteboardWindow } =
        await loadWindowsFactories();

    const componentStringBaseUrls = [
        ...(notepadStringsBaseUrl ? [notepadStringsBaseUrl] : []),
        "/static/modules/nextcloud-whiteboard/languages",
    ];
    const i18n = await createI18n({ componentStringBaseUrls });
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
    let activeImageViewer = null;
    let whiteboards = [];
    let activeWhiteboard = null;
    let activeMeetingId = null;
    let activeMaterialKey = null;
    let lastBroadcastedMaterialKey = null;
    let isClassSearchDetached = false;
    let blackboardExpanded = true;
    let initializedTiles = new Set();
    let tileLayout = "stacked";
    let tileOrder = ["agenda"];

    const selectedSnapshot = () =>
        findSelectedSnapshot(classroomSnapshots, selectedClassId);
    const classroomMaterialPreview = createClassroomMaterialPreviewManager({
        apiFetch,
        getFiles: () => classResources.files,
        getClassId: () => selectedClassId,
        signal,
    });
    const { loadActiveMaterialPreview, revokeActiveMaterialPreview } =
        classroomMaterialPreview;

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
        applySnapshotPatch: (classId, patch) => {
            classroomSnapshots = applyClassroomSnapshotPatch(
                classroomSnapshots,
                classId,
                patch,
            );
        },
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
            getActiveMaterialKey: () => activeMaterialKey,
            setActiveMaterialKey: (key) => {
                activeMaterialKey = key;
            },
            loadActiveMaterialPreview,
            applyMaterialViewport: (viewport) => {
                activeImageViewer?.applyViewport(viewport);
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
    const { loadClassrooms, loadAvailableClasses: fetchAvailableClasses } =
        createClassroomDataLoaders({
            apiFetch,
            buildQuery,
            isTeacherView,
            getSelectedLanguageFilter: () => selectedLanguageFilter,
            getSearchQuery: () => searchQuery,
            getIsClassSearchDetached: () => isClassSearchDetached,
            getPresenceByAccountId: () => presenceByAccountId,
            getSelectedClassId: () => selectedClassId,
            setSelectedClassId: (nextClassId) => {
                selectedClassId = nextClassId;
            },
            setSelectedSeatNumber: (nextSeatNumber) => {
                selectedSeatNumber = nextSeatNumber;
            },
            setClassroomSnapshots: (nextSnapshots) => {
                classroomSnapshots = nextSnapshots;
            },
            syncWorkspaceModeWithSnapshot,
        });

    async function loadAvailableClasses() {
        availableClasses = await fetchAvailableClasses();
    }

    const { loadSelectedClassMeta } = createClassMetaLoader({
        apiFetch,
        getSnapshot: selectedSnapshot,
        isTeacherView,
        getSelectedActiveWhiteboardId,
        getSelectedActiveMaterialKey,
        resolveActiveMeetingId,
        createDefaultClassResources,
        loadActiveMaterialPreview,
        revokeActiveMaterialPreview,
        syncStudentWorkspaceAccess,
        pollTeacherViewState,
        syncTileLayoutWithSnapshot,
        addInitializedTile: (tile) => initializedTiles.add(tile),
        i18n,
        getActiveWhiteboard: () => activeWhiteboard,
        setClassResources: (value) => {
            classResources = value;
        },
        setSelectedNotebookText: (value) => {
            selectedNotebookText = value;
        },
        setAgendaDocument: (value) => {
            agendaDocument = String(value ?? "");
        },
        setAgendaSnapshots: (value) => {
            agendaSnapshots = Array.isArray(value) ? value : [];
        },
        setWhiteboards: (value) => {
            whiteboards = value;
        },
        setActiveWhiteboard: (value) => {
            activeWhiteboard = value;
        },
        setActiveMeetingId: (value) => {
            activeMeetingId = value;
        },
        setActiveMaterialKey: (value) => {
            activeMaterialKey = value;
        },
        setLastBroadcastedMaterialKey: (value) => {
            lastBroadcastedMaterialKey = value;
        },
    });

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
        composer.refreshSubNavigation();
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

    const renderContentMarkup = createContentMarkupRenderer({
        selectedSnapshot,
        getFullClassResources: () => ({
            ...classResources,
            agendaDocument,
            agendaSnapshots,
        }),
        getSelectedSeatNumber: () => selectedSeatNumber,
        getSelectedNotebookText: () => selectedNotebookText,
        i18n,
        isTeacherView,
        getAvailableClasses: () => availableClasses,
        getSelectedLanguageFilter: () => selectedLanguageFilter,
        getSearchQuery: () => searchQuery,
        getTeacherAccount: () => teacherAccount,
        getClassroomViewMode,
        getBoardEntities,
        getWorkspaceMode: () => workspaceMode,
        getActiveMaterialKey: () => activeMaterialKey,
        getMaterialPreviewState: () => classroomMaterialPreview.getState(),
        getWhiteboards: () => whiteboards,
        getActiveWhiteboard: () => activeWhiteboard,
        getSelectedActiveWhiteboardId,
        getActiveMeetingId: () => activeMeetingId,
        getClassroomWindows: () => classroomWindows,
        getBlackboardExpanded: () => blackboardExpanded,
        getInitializedTiles: () => initializedTiles,
        getWhiteboardEnabled: () =>
            Boolean(classroomSnapshots[0]?.whiteboardEnabled),
        getTileState: () => ({ tileLayout, tileOrder }),
        computeIsTeacherPresent,
    });

    function refreshDom() {
        const content = root.querySelector(".classes-classroom-content");
        if (content instanceof HTMLElement) {
            const savedFocus = captureFocus();
            classroomWindows?.hoist();
            activeImageViewer?.destroy();
            activeImageViewer = null;
            content.outerHTML = renderContentMarkup();
            const nextSnapshot = selectedSnapshot();
            const notepadMountResult = mountClassroomNotepad(
                root.querySelector(".classes-notepad-host"),
                {
                    nextSnapshot,
                    createClassroomNotepad,
                    classroomNotepad,
                    classroomNotepadClassId,
                    i18n,
                    getWorkspaceMode,
                },
            );
            classroomNotepad = notepadMountResult.notepad;
            classroomNotepadClassId = notepadMountResult.notepadClassId;
            activeImageViewer = mountMaterialImageViewer(root, {
                previewState: classroomMaterialPreview.getState(),
                isTeacher: isTeacherView(),
                classId: selectedClassId,
                apiFetch,
                signal,
            });
            void profileAvatarHelpers.hydrateProfileAvatars?.(root);
            classroomWindows?.reattach();
            if (nextSnapshot?.chatUrl && workspaceMode === "chat") {
                classroomWindows?.openChat(nextSnapshot.chatUrl);
            } else if (classroomWindows?.isChatOpen()) {
                classroomWindows.closeChat();
            }
            restoreFocus(savedFocus);
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

    let composer = createPageComposer(root, {
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
                    profileAvatarHelpers.handleProfileAvatarError &&
                        root.addEventListener(
                            "error",
                            profileAvatarHelpers.handleProfileAvatarError,
                            { signal, capture: true },
                        );
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
    if (pageContent instanceof HTMLElement)
        pageContent.classList.add("classes-classroom-page-content");
    void profileAvatarHelpers.hydrateProfileAvatars?.(root);
    syncGlobalChatTarget();
    classroomWindows = createClassroomWindows({
        root,
        i18n,
        isTeacher: Boolean(teacherAccount && isTeacherView()),
        createMeetingEmbed,
        createWhiteboardWindow,
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
                // Only notify when a new meeting starts and no class is currently
                // selected — the student will see the meeting tile directly when
                // already inside the class.
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
            const materialKeyBroadcastChanged =
                broadcastedMaterialKey !== lastBroadcastedMaterialKey;
            if (materialKeyBroadcastChanged) {
                lastBroadcastedMaterialKey = broadcastedMaterialKey;
                activeMaterialKey = broadcastedMaterialKey;
                await loadActiveMaterialPreview(
                    activeMaterialKey,
                    classResources.files,
                );
            }
            if (workspaceMode !== previousWorkspaceMode) {
                refreshWorkspaceTilesOnly();
            }
            if (materialKeyBroadcastChanged) {
                refreshDom();
                syncGlobalChatTarget();
                if (selectedClassChanged) {
                    footerClasses = await loadFooterClasses();
                    composer.refreshFooter();
                    refreshSubNavigation();
                }
                return;
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
