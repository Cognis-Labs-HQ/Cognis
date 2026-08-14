import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createWhiteboardCanvas } from "../whiteboard/canvas.js";
import { confirmClearCanvas } from "./clear-canvas.js";
import { createWhiteboardSearchCollector } from "./search-index.js";
import { createWhiteboardStatusController } from "./status.js";
import { setOverlayVisible } from "./overlay.js";
import { openWhiteboardHistoryPopup } from "./history-popup.js";
import { renderCanvasElement as renderWhiteboardCanvasElement } from "./render.js";
import {
    API_BASE,
    apiFetchJson,
    createRandomWhiteboardTitle,
    fetchWhiteboardList,
    fetchWhiteboardSession,
    renameWhiteboard,
    saveWhiteboardElements,
    spawnWhiteboard,
    uploadWhiteboardImage,
} from "./api.js";
import {
    debounce,
    decodeSceneMessage,
    encodeSceneMessage,
    encodeSyncMessage,
    loadSocketIo,
    throttleLatest,
} from "./realtime.js";
import {
    applyRemotePresenceSelections,
    getPointerOffset,
    getSelectionPayload,
    hydratePresenceAvatars,
    renderWhiteboardPresenceEntry,
} from "./presence.js";
const EMIT_DEBOUNCE_MS = 80;
const RECONNECT_MAX_DELAY_MS = 30000;
const SYNC_MESSAGE_SCENE_INIT = "SCENE_INIT";
const SYNC_MESSAGE_SCENE_UPDATE = "SCENE_UPDATE";
const SYNC_MESSAGE_BOARD_RENAMED = "BOARD_RENAMED";
let i18n = null;
let composer = null;
let boards = [];
let activeBoard = null;
let activeSession = null;
let activeShareContext = null;
let canvasInstance = null;
let socketInstance = null;
let savedElements = [];
let preflightStatus = "idle";
let lastConnectionToast = "";
let imageUploadMaxBytes = 1048576;
let integrationCanvasMode = false;
const {
    buildConnectionErrorMessage,
    canManageShares,
    getSyncStatus,
    reportClientError,
    setSyncStatus,
    setSyncStatusMessage,
    sharePageFlag,
    translate: translateModuleString,
} = createWhiteboardStatusController({
    getI18n: () => i18n,
    getIntegrationCanvasMode: () => integrationCanvasMode,
    getShareContext: () => activeShareContext,
    showToast,
});
const collectWhiteboardSearchGroups = createWhiteboardSearchCollector({
    getActiveBoard: () => activeBoard,
    getBoards: () => boards,
    getSavedElements: () => savedElements,
    translate: translateModuleString,
});

async function loadBoards() {
    boards = await fetchWhiteboardList();
}
function teardownCanvas() {
    if (socketInstance) {
        try {
            socketInstance.cognisCleanup?.();
            socketInstance.disconnect();
        } catch (error) {
            console.warn(
                "[nextcloud-whiteboard] socket disconnect failed:",
                error,
            );
        }
        socketInstance = null;
    }
    if (canvasInstance) {
        try {
            canvasInstance.destroy();
        } catch (error) {
            console.warn(
                "[nextcloud-whiteboard] canvas destroy failed:",
                error,
            );
        }
        canvasInstance = null;
    }
    activeSession = null;
}
function canRenameActiveBoard() {
    return Boolean(
        !integrationCanvasMode && activeSession?.canRename && activeBoard?.id,
    );
}
function applyBoardTitle(title) {
    const normalizedTitle = String(title ?? "").trim();
    if (!normalizedTitle) return;
    activeBoard = {
        ...(activeBoard ?? {}),
        title: normalizedTitle,
    };
    if (activeSession) activeSession.title = normalizedTitle;
    const titleEl = document.getElementById("whiteboard-board-title");
    if (titleEl && titleEl.dataset.renaming !== "true") {
        titleEl.textContent = normalizedTitle;
    }
}
function emitBoardRenamed(title) {
    if (!socketInstance?.connected || !activeSession?.roomId) return;
    socketInstance.emit(
        "server-broadcast",
        activeSession.roomId,
        encodeSyncMessage(SYNC_MESSAGE_BOARD_RENAMED, { title }),
        [],
    );
}
function connectSocket(io, session, canvas) {
    const { serverUrl, roomId, token } = session;
    const canWrite = session.canWrite === true;
    const socket = io(serverUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnectionDelay: 1000,
        reconnectionDelayMax: RECONNECT_MAX_DELAY_MS,
        closeOnBeforeunload: true,
    });
    const handleVisibilityChange = () => {
        if (document.hidden) {
            socket.disconnect();
        } else if (!socket.connected) {
            socket.connect();
        }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    socket.cognisCleanup = () =>
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
    let joinedRoom = false;
    let isDedicatedSyncer = false;
    const persistChanges = debounce(async (elements) => {
        try {
            await saveWhiteboardElements(roomId, elements);
            setSyncStatus(
                "synced",
                "module.nextcloud_whiteboard.status_synced",
            );
        } catch (error) {
            reportClientError(
                error,
                "module.nextcloud_whiteboard.status_sync_failed",
            );
        }
    }, EMIT_DEBOUNCE_MS);
    const emitChanges = throttleLatest(
        (elements, type = SYNC_MESSAGE_SCENE_INIT) => {
            if (!canWrite) return;
            if (!socket.connected || !joinedRoom) {
                setSyncStatus(
                    "error",
                    "module.nextcloud_whiteboard.status_sync_failed",
                );
                return;
            }
            setSyncStatus(
                "syncing",
                "module.nextcloud_whiteboard.status_syncing",
            );
            socket.emit(
                "server-broadcast",
                roomId,
                encodeSceneMessage(type, elements),
                [],
            );
            setSyncStatus(
                "synced",
                "module.nextcloud_whiteboard.status_synced",
            );
        },
        EMIT_DEBOUNCE_MS,
    );
    canvas.onChange((elements, meta) => {
        if (meta?.type === "image_rejected") {
            showToast(
                translateModuleString(
                    "module.nextcloud_whiteboard.image_too_large",
                ).replace("{limit}", String(meta.limit)),
                { variant: "error" },
            );
            return;
        }
        savedElements = elements;
        composer?.refreshPresence?.();
        if (canWrite && meta?.transient !== true) persistChanges(elements);
        if (canWrite) emitChanges(elements, SYNC_MESSAGE_SCENE_UPDATE);
    });
    socket.on("connect", () => {
        lastConnectionToast = "";
        joinedRoom = false;
    });
    socket.on("init-room", () => {
        socket.emit("join-room", roomId);
    });
    socket.on("room-user-change", () => {
        joinedRoom = true;
        setSyncStatus("synced", "module.nextcloud_whiteboard.status_synced");
        if (isDedicatedSyncer)
            emitChanges(canvas.getElements(), SYNC_MESSAGE_SCENE_INIT);
    });
    socket.on("sync-designate", ({ isSyncer } = {}) => {
        isDedicatedSyncer = Boolean(isSyncer);
        if (joinedRoom && isDedicatedSyncer) {
            emitChanges(canvas.getElements(), SYNC_MESSAGE_SCENE_INIT);
        } else if (joinedRoom) {
            setSyncStatus(
                "synced",
                "module.nextcloud_whiteboard.status_synced",
            );
        }
    });
    socket.on("user-joined", () => {
        if (joinedRoom && isDedicatedSyncer)
            emitChanges(canvas.getElements(), SYNC_MESSAGE_SCENE_INIT);
    });
    socket.on("connect_error", (error) => {
        const message = buildConnectionErrorMessage(error, serverUrl);
        setSyncStatusMessage("error", message);
        if (message !== lastConnectionToast) {
            lastConnectionToast = message;
            showToast(message, { variant: "error" });
        }
    });
    socket.on("client-broadcast", (payload) => {
        try {
            const message = decodeSceneMessage(payload);
            if (message.type === SYNC_MESSAGE_BOARD_RENAMED) {
                applyBoardTitle(message.payload?.title);
                return;
            }
            if (
                (message.type === SYNC_MESSAGE_SCENE_INIT ||
                    message.type === SYNC_MESSAGE_SCENE_UPDATE) &&
                Array.isArray(message.payload?.elements)
            ) {
                savedElements = message.payload.elements;
                canvas.applyElements(message.payload.elements, {
                    replace: true,
                });
                if (canWrite) persistChanges(message.payload.elements);
            }
        } catch (error) {
            console.warn(
                "[nextcloud-whiteboard] ignored remote sync payload",
                error,
            );
        }
    });
    return socket;
}
async function createAndOpenBoard() {
    const passed = await runPreflightCheck();
    if (!passed) return;
    let spawnResult;
    try {
        spawnResult = await spawnWhiteboard({
            title: createRandomWhiteboardTitle(),
        });
    } catch (error) {
        reportClientError(error, "module.nextcloud_whiteboard.spawn_failed");
        return;
    }
    savedElements = [];
    showToast(
        translateModuleString("module.nextcloud_whiteboard.created_success"),
        {
            variant: "success",
        },
    );
    await openBoard(spawnResult.whiteboard);
}
function bindCanvasToolbar(canvas) {
    const toolbar = document.getElementById("whiteboard-toolbar");
    if (!toolbar || toolbar.dataset.bound === "true") return;
    toolbar.dataset.bound = "true";
    if (!document.getElementById("whiteboard-tool-lock")) {
        const historyButton = document.getElementById("whiteboard-history");
        historyButton?.insertAdjacentHTML(
            "afterend",
            `<button type="button" id="whiteboard-tool-lock" class="whiteboard-tool" aria-pressed="false" title="${escapeHtml(translateModuleString("module.nextcloud_whiteboard.tool_lock"))}" aria-label="${escapeHtml(translateModuleString("module.nextcloud_whiteboard.tool_lock"))}">🔒</button>`,
        );
    }
    toolbar
        .querySelectorAll(".whiteboard-toolbar-group[hidden]")
        .forEach((element) => {
            element.hidden = false;
        });
    const strokeTools = new Set([
        "pen",
        "rectangle",
        "diamond",
        "ellipse",
        "line",
        "arrow",
    ]);
    let selectedElement = null;
    let activeTool = "select";
    let keepToolActive = false;
    function activateTool(tool) {
        activeTool = tool;
        toolbar.querySelectorAll("[data-tool]").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tool === tool);
        });
        updateStyleControls();
    }
    function selectedCanUseStrokeWidth() {
        return Boolean(selectedElement?.strokeWidthApplicable);
    }
    function activeToolCanUseStrokeWidth() {
        return strokeTools.has(activeTool);
    }
    function updateStyleControls() {
        const strokeSelect = document.getElementById("whiteboard-stroke-width");
        if (strokeSelect) {
            strokeSelect.disabled = !(
                selectedCanUseStrokeWidth() || activeToolCanUseStrokeWidth()
            );
            if (selectedCanUseStrokeWidth()) {
                strokeSelect.value = String(selectedElement.strokeWidth ?? 4);
            }
        }
    }
    const undoButton = document.getElementById("whiteboard-undo");
    const redoButton = document.getElementById("whiteboard-redo");
    function updateHistoryControls() {
        if (undoButton) undoButton.disabled = !canvas.canUndo?.();
        if (redoButton) redoButton.disabled = !canvas.canRedo?.();
    }
    toolbar.querySelectorAll("[data-tool]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const tool = button.dataset.tool;
            activateTool(tool);
            canvas.setTool(tool);
        });
    });
    canvas.onToolChange?.((tool) => activateTool(tool));
    canvas.onHistoryChange?.(updateHistoryControls);
    const lockButton = document.getElementById("whiteboard-tool-lock");
    lockButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        keepToolActive = !keepToolActive;
        lockButton.classList.toggle("active", keepToolActive);
        lockButton.setAttribute("aria-pressed", String(keepToolActive));
        canvas.setKeepToolActive?.(keepToolActive);
    });
    document
        .getElementById("whiteboard-new")
        ?.addEventListener("click", () => void createAndOpenBoard());
    document
        .getElementById("whiteboard-history")
        ?.addEventListener("click", () => void openHistoryPopup());
    undoButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        canvas.undo?.();
        updateHistoryControls();
    });
    redoButton?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        canvas.redo?.();
        updateHistoryControls();
    });
    if (canManageShares()) {
        bindShareButton(toolbar);
    }
    if (canRenameActiveBoard()) {
        document
            .getElementById("whiteboard-board-title")
            ?.addEventListener("dblclick", () => void renameActiveBoard());
    }
    const colorInput = document.getElementById("whiteboard-color");
    const themeStrokeColor = () =>
        getComputedStyle(document.body).getPropertyValue("--text").trim() ||
        "#111827";
    if (colorInput) {
        colorInput.value = themeStrokeColor();
        canvas.setStrokeColor("auto");
    }
    colorInput?.addEventListener("input", () => {
        canvas.setStrokeColor(colorInput.value);
    });
    const strokeSelect = document.getElementById("whiteboard-stroke-width");
    strokeSelect?.addEventListener("change", () => {
        canvas.setStrokeWidth(strokeSelect.value);
    });
    canvas.onSelectionChange?.((element) => {
        selectedElement = element;
        if (colorInput && element?.strokeColor) {
            colorInput.value =
                element.strokeColor === "auto"
                    ? themeStrokeColor()
                    : element.strokeColor;
        }
        updateStyleControls();
        composer?.refreshPresence?.();
    });
    updateStyleControls();
    document
        .getElementById("whiteboard-clear")
        ?.addEventListener("click", async (event) => {
            event.preventDefault();
            if (!(await confirmClearCanvas(translateModuleString))) return;
            canvas.clearAll();
            savedElements = [];
        });
}
async function bindShareButton(toolbar) {
    const slot = toolbar.querySelector("#whiteboard-share-slot");
    if (!(slot instanceof HTMLElement) || !activeBoard?.id) return;
    let shareModule;
    try {
        shareModule =
            await import("/static/gateways/share/ui/reuse/share-button.js");
    } catch {
        return;
    }
    shareModule.mountShareButton?.({
        container: slot,
        label: translateModuleString(
            "module.nextcloud_whiteboard.share_button",
        ),
        id: "whiteboard-share",
        className: "whiteboard-tool",
        icon: "🔗",
        title: translateModuleString(
            "module.nextcloud_whiteboard.share_button",
        ),
        onClick: () => void openSharePopup(),
    });
}

async function openSharePopup() {
    if (!activeBoard?.id || !canManageShares()) return;
    try {
        const sharePopup = uiCtx.capabilities.get("share:openPopup");
        if (typeof sharePopup !== "function") return;
        await sharePopup({
            resourceType: "whiteboard",
            resourceId: activeBoard.id,
            contentUrl: `/whiteboard?id=${encodeURIComponent(activeBoard.id)}`,
            grantedCapabilities: ["whiteboard:read", "whiteboard:write"],
            supportsReadOnly: true,
            linkAccessOptions: [
                {
                    id: "read",
                    label: translateModuleString(
                        "module.nextcloud_whiteboard.share_permission_read",
                    ),
                    permissions: ["read"],
                    grantedCapabilities: ["whiteboard:read"],
                },
                {
                    id: "write",
                    label: translateModuleString(
                        "module.nextcloud_whiteboard.share_permission_write",
                    ),
                    permissions: ["read", "write"],
                    grantedCapabilities: [
                        "whiteboard:read",
                        "whiteboard:write",
                    ],
                },
            ],
            title: translateModuleString(
                "module.nextcloud_whiteboard.share_popup_title",
            ),
            labels: {
                empty: translateModuleString(
                    "module.nextcloud_whiteboard.share_empty",
                ),
                untitled: translateModuleString(
                    "module.nextcloud_whiteboard.share_untitled",
                ),
                copyLink: translateModuleString(
                    "module.nextcloud_whiteboard.share_copy_link",
                ),
                revoke: translateModuleString(
                    "module.nextcloud_whiteboard.share_revoke",
                ),
                shareOptions: translateModuleString(
                    "module.nextcloud_whiteboard.share_options_label",
                ),
                permission: translateModuleString(
                    "module.nextcloud_whiteboard.share_options_label",
                ),
                accessMode: translateModuleString(
                    "module.nextcloud_whiteboard.share_options_label",
                ),
                readPermission: translateModuleString(
                    "module.nextcloud_whiteboard.share_permission_read",
                ),
                writePermission: translateModuleString(
                    "module.nextcloud_whiteboard.share_permission_write",
                ),
                mail: translateModuleString("ui.reuse.mail"),
                label: translateModuleString(
                    "module.nextcloud_whiteboard.share_label",
                ),
                labelPlaceholder: translateModuleString(
                    "module.nextcloud_whiteboard.share_label_placeholder",
                ),
                expiryLabel: translateModuleString(
                    "module.nextcloud_whiteboard.share_expiry_label",
                ),
                password: translateModuleString(
                    "module.nextcloud_whiteboard.share_password_optional",
                ),
                passwordPopupTitle: translateModuleString(
                    "module.nextcloud_whiteboard.share_password_title",
                ),
                passwordPopupLabel: translateModuleString(
                    "module.nextcloud_whiteboard.share_password_instruction",
                ),
                passwordPlaceholder: translateModuleString(
                    "module.nextcloud_whiteboard.share_password_placeholder",
                ),
                cancel: translateModuleString("ui.reuse.cancel"),
                confirm: translateModuleString(
                    "module.nextcloud_whiteboard.share_revoke",
                ),
                deleteConfirmMessage: translateModuleString(
                    "module.nextcloud_whiteboard.share_delete_prompt",
                ),
                statusActive: translateModuleString(
                    "module.nextcloud_whiteboard.share_status_active",
                ),
                statusExpired: translateModuleString(
                    "module.nextcloud_whiteboard.share_status_expired",
                ),
                expiresAtLabel: translateModuleString(
                    "module.nextcloud_whiteboard.share_expires_at_label",
                ),
                expiredAtLabel: translateModuleString(
                    "module.nextcloud_whiteboard.share_expired_at_label",
                ),
                generateLink: translateModuleString(
                    "module.nextcloud_whiteboard.share_generate_link",
                ),
                close: translateModuleString("ui.reuse.close"),
                createFailed: translateModuleString(
                    "module.nextcloud_whiteboard.share_create_failed",
                ),
                copySuccess: translateModuleString(
                    "module.nextcloud_whiteboard.share_copy_success",
                ),
                copyFailed: translateModuleString(
                    "module.nextcloud_whiteboard.share_copy_failed",
                ),
                deleteFailed: translateModuleString(
                    "module.nextcloud_whiteboard.share_delete_failed",
                ),
            },
        });
    } catch (error) {
        reportClientError(
            error,
            "module.nextcloud_whiteboard.share_create_failed",
        );
    }
}
async function openHistoryPopup() {
    try {
        await loadBoards();
    } catch (error) {
        reportClientError(
            error,
            "module.nextcloud_whiteboard.load_boards_failed",
        );
        return;
    }
    await openWhiteboardHistoryPopup({
        boards,
        escapeHtml,
        openPopup,
        translate: translateModuleString,
    });
}
async function renameActiveBoard() {
    if (!activeBoard || !canRenameActiveBoard()) return;
    const titleEl = document.getElementById("whiteboard-board-title");
    if (!titleEl || titleEl.dataset.renaming === "true") return;
    titleEl.dataset.renaming = "true";
    titleEl.contentEditable = "true";
    titleEl.focus();
    document.getSelection()?.selectAllChildren(titleEl);
    let finishing = false;
    const cleanup = () => {
        titleEl.contentEditable = "false";
        delete titleEl.dataset.renaming;
        titleEl.removeEventListener("blur", finish);
        titleEl.removeEventListener("keydown", onKeydown);
    };
    const finish = async () => {
        if (finishing) return;
        finishing = true;
        const nextTitle = titleEl.textContent?.trim() || activeBoard.title;
        cleanup();
        if (nextTitle === activeBoard.title) {
            titleEl.textContent = activeBoard.title;
            return;
        }
        try {
            const boardId =
                activeBoard.id ||
                activeSession?.roomId ||
                new URLSearchParams(window.location.search).get("id");
            const renamed = await renameWhiteboard(boardId, nextTitle);
            activeBoard = {
                ...activeBoard,
                ...renamed,
                id: renamed.id || boardId,
            };
            applyBoardTitle(activeBoard.title);
            emitBoardRenamed(activeBoard.title);
            showToast(
                translateModuleString(
                    "module.nextcloud_whiteboard.rename_success",
                ),
                {
                    variant: "success",
                },
            );
        } catch (error) {
            reportClientError(
                error,
                "module.nextcloud_whiteboard.rename_failed",
            );
            titleEl.textContent = activeBoard.title;
        }
    };
    const onKeydown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            titleEl.blur();
        } else if (event.key === "Escape") {
            event.preventDefault();
            cleanup();
            titleEl.textContent = activeBoard.title;
        }
    };
    titleEl.addEventListener("blur", finish);
    titleEl.addEventListener("keydown", onKeydown);
}
async function verifyWebsocketAuth(result) {
    if (!result?.serverUrl || !result?.websocketAuthToken) return false;
    const io = await loadSocketIo(result.serverUrl);
    return new Promise((resolve) => {
        const socket = io(result.serverUrl, {
            auth: { token: result.websocketAuthToken },
            transports: ["websocket"],
            reconnection: false,
            timeout: 5000,
        });
        const finish = (passed) => {
            socket.disconnect();
            resolve(passed);
        };
        const timer = window.setTimeout(() => finish(false), 5500);
        socket.on("connect", () => {
            window.clearTimeout(timer);
            finish(true);
        });
        socket.on("connect_error", () => {
            window.clearTimeout(timer);
            finish(false);
        });
    });
}
async function runPreflightCheck() {
    if (preflightStatus === "running") return false;
    preflightStatus = "running";
    setOverlayVisible(
        true,
        translateModuleString("module.nextcloud_whiteboard.preflight_checking"),
    );
    let result;
    try {
        result = await apiFetchJson("/whiteboards/preflight", {
            method: "POST",
        });
    } catch (error) {
        preflightStatus = "failed";
        const message =
            error.code === "config_required"
                ? translateModuleString(
                      "module.nextcloud_whiteboard.preflight_config_required",
                  )
                : translateModuleString(
                      "module.nextcloud_whiteboard.preflight_failed",
                  );
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }
    if (!result?.alive) {
        preflightStatus = "failed";
        const message = translateModuleString(
            "module.nextcloud_whiteboard.preflight_unreachable",
        );
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }
    const websocketAuthorized = await verifyWebsocketAuth(result).catch(
        () => false,
    );
    if (!websocketAuthorized) {
        preflightStatus = "failed";
        const message = translateModuleString(
            "module.nextcloud_whiteboard.preflight_websocket_failed",
        );
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }
    preflightStatus = "passed";
    return true;
}
function syncBoardUrl(boardId) {
    if (activeShareContext || !boardId) return;
    const searchParams = new URLSearchParams({ id: boardId });
    if (integrationCanvasMode) {
        searchParams.set("instantCanvas", "1");
    }
    const nextSearch = `?${searchParams.toString()}`;
    const nextUrl = `/whiteboard${nextSearch}`;
    if (
        window.location.pathname !== "/whiteboard" ||
        window.location.search !== nextSearch
    ) {
        window.history.replaceState(null, "", nextUrl);
    }
}
async function openBoard(board) {
    activeBoard = board;
    syncBoardUrl(board?.id);
    teardownCanvas();
    composer.refresh(buildElements());
    const passed = await runPreflightCheck();
    if (!passed) return;
    setOverlayVisible(
        true,
        translateModuleString("module.nextcloud_whiteboard.connecting"),
    );
    let session;
    try {
        session = await fetchWhiteboardSession(board.id);
    } catch (error) {
        setOverlayVisible(true, error.message);
        showToast(error.message, { variant: "error" });
        return;
    }
    activeSession = session;
    imageUploadMaxBytes = Number(
        session.imageUploadMaxBytes ?? imageUploadMaxBytes,
    );
    applyBoardTitle(session.title);
    let io;
    try {
        io = await loadSocketIo(session.serverUrl);
    } catch (error) {
        setOverlayVisible(true, error.message);
        showToast(error.message, { variant: "error" });
        return;
    }
    const canvasElement = document.getElementById("whiteboard-canvas");
    if (!canvasElement) return;
    canvasInstance = createWhiteboardCanvas(canvasElement, {
        readOnly: session.canWrite !== true,
    });
    if (session.canWrite === true) {
        canvasInstance.setImageUploader((dataUrl) =>
            uploadWhiteboardImage(session.roomId, dataUrl),
        );
    }
    canvasInstance.setImageUploadMaxBytes(imageUploadMaxBytes);
    savedElements = Array.isArray(session.elements) ? session.elements : [];
    if (savedElements.length > 0) {
        canvasInstance.applyElements(savedElements);
    }
    setSyncStatus("syncing", "module.nextcloud_whiteboard.status_syncing");
    socketInstance = connectSocket(io, session, canvasInstance);
    composer?.refreshPresence?.();
    bindCanvasToolbar(canvasInstance);
    if (session.canWrite !== true) {
        document
            .querySelectorAll(
                "#whiteboard-toolbar button, #whiteboard-toolbar select, #whiteboard-toolbar input",
            )
            .forEach((control) => {
                control.disabled = true;
            });
    }
    setOverlayVisible(false);
}

function renderCanvasElement() {
    const syncState = getSyncStatus();
    return renderWhiteboardCanvasElement({
        activeBoard,
        activeSession,
        boards,
        canManageShares,
        canRenameActiveBoard,
        preflightStatus,
        syncStatus: syncState.status,
        syncStatusMessage: syncState.message,
        translate: translateModuleString,
        integrationCanvasMode,
    });
}
function onCanvasRender() {
    document
        .getElementById("whiteboard-start-new")
        ?.addEventListener("click", () => void createAndOpenBoard());
    document
        .getElementById("whiteboard-start-history")
        ?.addEventListener("click", () => void openHistoryPopup());
    document.querySelectorAll(".whiteboard-overlay-board").forEach((button) => {
        button.addEventListener("click", () => {
            const board = boards.find(
                (item) => item.id === button.dataset.boardId,
            );
            if (board) void openBoard(board);
        });
    });
    const canvasElement = document.getElementById("whiteboard-canvas");
    if (!canvasElement || canvasInstance || !activeBoard || !activeSession)
        return;
    if (preflightStatus !== "passed") return;
    canvasInstance = createWhiteboardCanvas(canvasElement, {
        readOnly: activeSession.canWrite !== true,
    });
    if (activeSession.canWrite === true) {
        canvasInstance.setImageUploader((dataUrl) =>
            uploadWhiteboardImage(activeSession.roomId, dataUrl),
        );
    }
    canvasInstance.setImageUploadMaxBytes(imageUploadMaxBytes);
    if (savedElements.length > 0) {
        canvasInstance.applyElements(savedElements);
    }
    canvasInstance.onChange((elements) => {
        savedElements = elements;
        composer?.refreshPresence?.();
    });
    bindCanvasToolbar(canvasInstance);
}
function buildElements() {
    return [
        {
            id: "whiteboard-canvas",
            label: translateModuleString(
                "module.nextcloud_whiteboard.canvas_window",
            ),
            pinned: true,
            gridSize: { default: [12, 5], min: [4, 4], max: "full" },
            render: renderCanvasElement,
            onRender: onCanvasRender,
            onUnmount: teardownCanvas,
        },
    ];
}
export async function mount(root, { signal, shareContext } = {}) {
    registerSearchIndex("nextcloud-whiteboard", collectWhiteboardSearchGroups);
    i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "module.nextcloud_whiteboard.page_title");
    activeShareContext =
        shareContext?.directAccess === true ? null : (shareContext ?? null);
    integrationCanvasMode =
        Boolean(shareContext?.page?.instantCanvas) ||
        new URLSearchParams(window.location.search).get("instantCanvas") ===
            "1";
    if (!activeShareContext) {
        await loadBoards().catch((error) =>
            reportClientError(
                error,
                "module.nextcloud_whiteboard.load_boards_failed",
            ),
        );
    }
    if (signal?.aborted) return;

    const initialBoardId =
        activeShareContext?.payload?.whiteboardId ??
        new URLSearchParams(window.location.search).get("id");
    if (initialBoardId) {
        activeBoard = {
            id: initialBoardId,
            title: translateModuleString(
                "module.nextcloud_whiteboard.canvas_window",
            ),
        };
    }

    const mountedComposer = createPageComposer(root, {
        allowCustomization: false,
        elements: buildElements(),
        preferenceKey: "nextcloud-whiteboard-layout",
        persistLayoutPreferences: false,
        presenceTracker: {
            endpoint: `${API_BASE}/whiteboards/presence`,
            pageId: () => activeBoard?.id ?? "",
            storageKey: "nextcloud_whiteboard_presence_session",
            getSelectionPayload: () => getSelectionPayload(canvasInstance),
            getPointerOffset: () => getPointerOffset(canvasInstance),
            onPresenceUpdate: (entries, sessionId) =>
                applyRemotePresenceSelections({
                    canvasInstance,
                    entries,
                    sessionId,
                }),
            renderPresenceEntry: renderWhiteboardPresenceEntry,
            hydratePresenceEntries: hydratePresenceAvatars,
        },
        pageManifest: {
            features: {
                pointerTracking: true,
            },
        },
        i18n,
        pageContext: {
            title: translateModuleString(
                "module.nextcloud_whiteboard.page_title",
            ),
            subtitle: translateModuleString(
                "module.nextcloud_whiteboard.page_subtitle",
            ),
        },
        showNavbar: sharePageFlag("showNavbar", true),
        showTopbar: sharePageFlag("showTopbar", true),
        showFooter: sharePageFlag("showFooter", true),
        showThemeToggle: sharePageFlag("showThemeToggle", true),
        requireAccountSession: !activeShareContext,
        signal,
    });
    composer = mountedComposer;
    signal?.addEventListener(
        "abort",
        () => {
            mountedComposer.destroy();
            if (composer === mountedComposer) composer = null;
            teardownCanvas();
        },
        { once: true },
    );
    await mountedComposer.init();
    if (signal?.aborted) return;

    if (activeBoard) {
        void openBoard(activeBoard).then(() => {
            if (!signal?.aborted) mountedComposer.refreshPresence?.();
        });
    } else if (integrationCanvasMode) {
        void createAndOpenBoard();
    }
}

await mountWhenDirect(mount);
