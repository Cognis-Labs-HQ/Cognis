import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createWhiteboardCanvas } from "../whiteboard/canvas.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";
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
let syncStatus = "idle";
let syncStatusMessage = "";

function t(key) {
    return i18n?.t(key) ?? key;
}

function reportClientError(error, fallbackKey) {
    console.error("[nextcloud-whiteboard] client error:", error);
    showToast(error?.message || t(fallbackKey), { variant: "error" });
}

function sharePageFlag(name, fallback) {
    if (!activeShareContext?.page) return fallback;
    return activeShareContext.page[name] !== undefined
        ? Boolean(activeShareContext.page[name])
        : fallback;
}

function canManageShares() {
    return sharePageFlag("showShareControls", !activeShareContext);
}

function updateSyncStatusBox() {
    const statusBox = document.getElementById("whiteboard-sync-status");
    if (!statusBox) return;
    statusBox.dataset.status = syncStatus;
    statusBox.title =
        syncStatusMessage || t("module.nextcloud_whiteboard.status_idle");
}

function setSyncStatus(status, messageKey) {
    syncStatus = status;
    syncStatusMessage = t(messageKey);
    updateSyncStatusBox();
}

function buildConnectionErrorMessage(error, serverUrl) {
    const rawMessage = String(error?.message ?? "").trim();
    const genericSocketFailure = /^(websocket error|xhr poll error)$/i.test(
        rawMessage,
    );
    if (!rawMessage || genericSocketFailure) {
        return t("module.nextcloud_whiteboard.connection_failed").replace(
            "{server_url}",
            serverUrl,
        );
    }
    return `${t("module.nextcloud_whiteboard.connect_error")}: ${rawMessage}`;
}

async function apiFetchJson(path, options = {}) {
    const response = await apiFetch(`${API_BASE}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw Object.assign(
            new Error(payload?.error?.message ?? "Request failed."),
            { status: response.status, code: payload?.error?.code },
        );
    }
    return payload.data;
}

async function loadBoards() {
    boards = await apiFetchJson("/whiteboards");
}

async function renameBoard(boardId, title) {
    const normalizedTitle = String(title ?? "").trim();
    const normalizedBoardId = String(boardId ?? "").trim();
    if (!normalizedBoardId || !normalizedTitle) {
        throw new Error(t("module.nextcloud_whiteboard.rename_failed"));
    }
    return apiFetchJson("/whiteboards/rename", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: normalizedBoardId, title: normalizedTitle }),
    });
}

async function spawnBoard({ title, participants = [] } = {}) {
    return apiFetchJson("/whiteboards/spawn", {
        method: "POST",
        body: JSON.stringify({ title, participants }),
    });
}

async function fetchSession(boardId) {
    return apiFetchJson(
        `/whiteboards/session?id=${encodeURIComponent(boardId)}`,
    );
}

async function saveElements(boardId, elements) {
    return apiFetchJson("/whiteboards/elements", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: boardId, elements }),
    });
}

function debounce(callback, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

function loadSocketIo(serverUrl) {
    return new Promise((resolve, reject) => {
        if (window.io) {
            resolve(window.io);
            return;
        }
        const origin = new URL(serverUrl).origin;
        const script = document.createElement("script");
        script.src = `${origin}/socket.io/socket.io.js`;
        script.onload = () => resolve(window.io);
        script.onerror = () =>
            reject(
                new Error(t("module.nextcloud_whiteboard.socket_load_failed")),
            );
        document.head.appendChild(script);
    });
}

function setOverlayVisible(visible, message = "") {
    const overlay = document.getElementById("whiteboard-canvas-overlay");
    if (!overlay) return;
    overlay.hidden = !visible;
    const messageEl = overlay.querySelector(".whiteboard-overlay-message");
    if (messageEl) messageEl.textContent = message;
}

function teardownCanvas() {
    if (socketInstance) {
        try {
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

function encodeSyncMessage(type, payload = {}) {
    return new TextEncoder().encode(JSON.stringify({ type, payload }));
}

function encodeSceneMessage(type, elements) {
    return encodeSyncMessage(type, { elements });
}

function decodeSceneMessage(payload) {
    const text =
        typeof payload === "string"
            ? payload
            : new TextDecoder().decode(
                  payload instanceof Uint8Array
                      ? payload
                      : new Uint8Array(payload),
              );
    return JSON.parse(text);
}

function canRenameActiveBoard() {
    return Boolean(activeSession?.canRename && activeBoard?.id);
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
    const socket = io(serverUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnectionDelay: 1000,
        reconnectionDelayMax: RECONNECT_MAX_DELAY_MS,
    });
    let joinedRoom = false;
    let isDedicatedSyncer = false;

    const persistChanges = debounce(async (elements) => {
        try {
            await saveElements(roomId, elements);
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

    const emitChanges = debounce((elements, type = SYNC_MESSAGE_SCENE_INIT) => {
        if (!socket.connected || !joinedRoom) {
            setSyncStatus(
                "error",
                "module.nextcloud_whiteboard.status_sync_failed",
            );
            return;
        }
        setSyncStatus("syncing", "module.nextcloud_whiteboard.status_syncing");
        socket.emit(
            "server-broadcast",
            roomId,
            encodeSceneMessage(type, elements),
            [],
        );
        setSyncStatus("synced", "module.nextcloud_whiteboard.status_synced");
    }, EMIT_DEBOUNCE_MS);

    canvas.onChange((elements, meta) => {
        if (meta?.type === "image_rejected") {
            showToast(
                t("module.nextcloud_whiteboard.image_too_large").replace(
                    "{limit}",
                    String(meta.limit),
                ),
                { variant: "error" },
            );
            return;
        }
        savedElements = elements;
        persistChanges(elements);
        emitChanges(elements, SYNC_MESSAGE_SCENE_UPDATE);
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
        syncStatus = "error";
        syncStatusMessage = message;
        updateSyncStatusBox();
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
                persistChanges(message.payload.elements);
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
    let spawnResult;
    try {
        spawnResult = await spawnBoard({
            title: t("module.nextcloud_whiteboard.new_board_title"),
        });
    } catch (error) {
        reportClientError(error, "module.nextcloud_whiteboard.spawn_failed");
        return;
    }
    savedElements = [];
    showToast(t("module.nextcloud_whiteboard.created_success"), {
        variant: "success",
    });
    await openBoard(spawnResult.whiteboard);
}

function bindCanvasToolbar(canvas) {
    const toolbar = document.getElementById("whiteboard-toolbar");
    if (!toolbar || toolbar.dataset.bound === "true") return;
    toolbar.dataset.bound = "true";

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

    document
        .getElementById("whiteboard-new")
        ?.addEventListener("click", () => void createAndOpenBoard());
    document
        .getElementById("whiteboard-history")
        ?.addEventListener("click", () => void openHistoryPopup());
    document
        .getElementById("whiteboard-undo")
        ?.addEventListener("click", () => {
            canvas.undo?.();
        });
    document
        .getElementById("whiteboard-redo")
        ?.addEventListener("click", () => {
            canvas.redo?.();
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
    });
    updateStyleControls();

    document
        .getElementById("whiteboard-clear")
        ?.addEventListener("click", async (event) => {
            event.preventDefault();
            const result = await openPopup({
                title: t("module.nextcloud_whiteboard.clear_board"),
                body: `<p>${escapeHtml(t("module.nextcloud_whiteboard.clear_confirm"))}</p>`,
                actions: [
                    {
                        id: "cancel",
                        label: t("ui.reuse.close"),
                        variant: "cancel",
                    },
                    {
                        id: "clear",
                        label: t("module.nextcloud_whiteboard.clear_board"),
                        variant: "danger",
                    },
                ],
            });
            if (result !== "clear") return;
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
        label: t("module.nextcloud_whiteboard.share_button"),
        id: "whiteboard-share",
        className: "whiteboard-tool",
        icon: "🔗",
        title: t("module.nextcloud_whiteboard.share_button"),
        onClick: () => void openSharePopup(),
    });
}

async function openSharePopup() {
    if (!activeBoard?.id || !canManageShares()) return;
    try {
        const [{ openShareLinksPopup }, { buildShareCallbacks }] =
            await Promise.all([
                import("/static/gateways/share/ui/reuse/share-links-popup.js"),
                import("/static/modules/nextcloud-whiteboard/share-adapter.js"),
            ]);
        await openShareLinksPopup({
            title: t("module.nextcloud_whiteboard.share_popup_title"),
            labels: {
                empty: t("module.nextcloud_whiteboard.share_empty"),
                untitled: t("module.nextcloud_whiteboard.share_untitled"),
                copyLink: t("module.nextcloud_whiteboard.share_copy_link"),
                revoke: t("module.nextcloud_whiteboard.share_revoke"),
                shareOptions: t(
                    "module.nextcloud_whiteboard.share_options_label",
                ),
                mail: t("ui.reuse.mail"),
                label: t("module.nextcloud_whiteboard.share_label"),
                labelPlaceholder: t(
                    "module.nextcloud_whiteboard.share_label_placeholder",
                ),
                expiryLabel: t(
                    "module.nextcloud_whiteboard.share_expiry_label",
                ),
                statusActive: t(
                    "module.nextcloud_whiteboard.share_status_active",
                ),
                statusExpired: t(
                    "module.nextcloud_whiteboard.share_status_expired",
                ),
                expiresAtLabel: t(
                    "module.nextcloud_whiteboard.share_expires_at_label",
                ),
                expiredAtLabel: t(
                    "module.nextcloud_whiteboard.share_expired_at_label",
                ),
                generateLink: t(
                    "module.nextcloud_whiteboard.share_generate_link",
                ),
                done: t("ui.reuse.done"),
                createFailed: t(
                    "module.nextcloud_whiteboard.share_create_failed",
                ),
                copySuccess: t(
                    "module.nextcloud_whiteboard.share_copy_success",
                ),
                copyFailed: t("module.nextcloud_whiteboard.share_copy_failed"),
                deleteFailed: t(
                    "module.nextcloud_whiteboard.share_delete_failed",
                ),
            },
            ...buildShareCallbacks(activeBoard.id),
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
    const body = boards.length
        ? `<div class="whiteboard-history-list">${boards
              .map(
                  (board) => `
                    <article class="whiteboard-history-card">
                        <h3>${escapeHtml(board.title)}</h3>
                        <p>${escapeHtml(new Date(board.updatedAt).toLocaleString())}</p>
                        <button type="button" disabled>${escapeHtml(t("module.nextcloud_whiteboard.open"))}</button>
                    </article>`,
              )
              .join("")}</div>`
        : `<p>${escapeHtml(t("module.nextcloud_whiteboard.empty"))}</p>`;
    await openPopup({
        title: t("module.nextcloud_whiteboard.history_title"),
        body,
        actions: [
            {
                id: "done",
                label: t("ui.reuse.close"),
                variant: "confirm",
            },
        ],
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
            const renamed = await renameBoard(boardId, nextTitle);
            activeBoard = {
                ...activeBoard,
                ...renamed,
                id: renamed.id || boardId,
            };
            applyBoardTitle(activeBoard.title);
            emitBoardRenamed(activeBoard.title);
            showToast(t("module.nextcloud_whiteboard.rename_success"), {
                variant: "success",
            });
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

async function runPreflightCheck() {
    if (preflightStatus === "running") return false;
    preflightStatus = "running";
    setOverlayVisible(
        true,
        t("module.nextcloud_whiteboard.preflight_checking"),
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
                ? t("module.nextcloud_whiteboard.preflight_config_required")
                : t("module.nextcloud_whiteboard.preflight_failed");
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }

    if (!result?.alive) {
        preflightStatus = "failed";
        const message = t("module.nextcloud_whiteboard.preflight_unreachable");
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }

    preflightStatus = "passed";
    return true;
}

function syncBoardUrl(boardId) {
    if (activeShareContext || !boardId) return;
    const nextUrl = `/whiteboard?id=${encodeURIComponent(boardId)}`;
    if (
        window.location.pathname !== "/whiteboard" ||
        window.location.search !== `?id=${encodeURIComponent(boardId)}`
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

    setOverlayVisible(true, t("module.nextcloud_whiteboard.connecting"));

    let session;
    try {
        session = await fetchSession(board.id);
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

    canvasInstance = createWhiteboardCanvas(canvasElement);
    canvasInstance.setImageUploadMaxBytes(imageUploadMaxBytes);
    savedElements = Array.isArray(session.elements) ? session.elements : [];
    if (savedElements.length > 0) {
        canvasInstance.applyElements(savedElements);
    }

    setSyncStatus("syncing", "module.nextcloud_whiteboard.status_syncing");
    socketInstance = connectSocket(io, session, canvasInstance);
    composer?.refreshPresence?.();
    bindCanvasToolbar(canvasInstance);

    setOverlayVisible(false);
}

function renderCanvasElement() {
    const hasActiveBoard = Boolean(activeBoard);
    const overlayHidden = hasActiveBoard && preflightStatus === "passed";
    const overlayMessage = hasActiveBoard
        ? t("module.nextcloud_whiteboard.connecting_ellipsis")
        : t("module.nextcloud_whiteboard.canvas_placeholder");
    const boardList = boards
        .map(
            (board) =>
                `<button type="button" class="whiteboard-overlay-board" data-board-id="${escapeHtml(board.id)}">${escapeHtml(board.title)}</button>`,
        )
        .join("");

    return `
        <div class="whiteboard-canvas-wrap">
            <div
                id="whiteboard-toolbar"
                class="whiteboard-toolbar"
                role="toolbar"
                aria-label="${escapeHtml(t("module.nextcloud_whiteboard.toolbar_label"))}"
            >
                <div class="whiteboard-toolbar-group">
                    <button type="button" id="whiteboard-new" class="whiteboard-tool whiteboard-new-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.new_board"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.new_board"))}">＋ <span>New</span></button>
                    <button type="button" id="whiteboard-history" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.history_title"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.history_title"))}">↺</button>
                </div>
                <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    <button type="button" data-tool="select" class="whiteboard-tool active" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_select"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_select"))}">🖱</button>
                    <button type="button" data-tool="pen" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_pen"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_pen"))}">✎</button>
                    <button type="button" data-tool="rectangle" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_rectangle"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_rectangle"))}">□</button>
                    <button type="button" data-tool="diamond" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_diamond"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_diamond"))}">◇</button>
                    <button type="button" data-tool="ellipse" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_ellipse"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_ellipse"))}">○</button>
                    <button type="button" data-tool="arrow" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_arrow"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_arrow"))}">→</button>
                    <button type="button" data-tool="line" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_line"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_line"))}">−</button>
                    <button type="button" data-tool="text" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_text"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_text"))}">T</button>
                    <button type="button" data-tool="eraser" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_eraser"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_eraser"))}">⌫</button>
                </div>
                <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    <button type="button" id="whiteboard-undo" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.undo"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.undo"))}">↶</button>
                    <button type="button" id="whiteboard-redo" class="whiteboard-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.redo"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.redo"))}">↷</button>
                </div>
                <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    <input type="color" id="whiteboard-color" value="#111827" title="${escapeHtml(t("module.nextcloud_whiteboard.stroke_color"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.stroke_color"))}" />
                    <select id="whiteboard-stroke-width" class="whiteboard-tool theme-select" title="${escapeHtml(t("module.nextcloud_whiteboard.stroke_width"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.stroke_width"))}">
                        <option value="2">${escapeHtml(t("module.nextcloud_whiteboard.stroke_thin"))}</option>
                        <option value="4" selected>${escapeHtml(t("module.nextcloud_whiteboard.stroke_medium"))}</option>
                        <option value="8">${escapeHtml(t("module.nextcloud_whiteboard.stroke_thick"))}</option>
                    </select>
                </div>
                <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    ${canManageShares() ? '<span id="whiteboard-share-slot"></span>' : ""}
                    <a href="#" id="whiteboard-clear" class="whiteboard-tool btn-cancel" role="button" title="${escapeHtml(t("module.nextcloud_whiteboard.clear_board"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.clear_board"))}">×</a>
                </div>
                <span id="whiteboard-board-title" class="whiteboard-board-title" title="${escapeHtml(canRenameActiveBoard() ? t("module.nextcloud_whiteboard.rename_hint") : "")}">${escapeHtml(activeSession?.title ?? activeBoard?.title ?? "")}</span>
                <span id="whiteboard-sync-status" class="whiteboard-sync-status" data-status="${escapeHtml(syncStatus)}" title="${escapeHtml(syncStatusMessage || t("module.nextcloud_whiteboard.status_idle"))}"></span>
            </div>
            <div class="whiteboard-canvas-stage">
                <canvas
                    id="whiteboard-canvas"
                    tabindex="0"
                    aria-label="${escapeHtml(t("module.nextcloud_whiteboard.canvas_label"))}"
                ></canvas>
                <div
                    id="whiteboard-canvas-overlay"
                    class="whiteboard-canvas-overlay"
                    ${overlayHidden ? "hidden" : ""}
                    aria-live="polite"
                >
                    <div class="whiteboard-start-panel">
                        <p class="whiteboard-overlay-message">${escapeHtml(overlayMessage)}</p>
                        ${hasActiveBoard ? "" : `<div class="whiteboard-start-actions"><button type="button" id="whiteboard-start-new">${escapeHtml(t("module.nextcloud_whiteboard.new_board"))}</button><button type="button" id="whiteboard-start-history">${escapeHtml(t("module.nextcloud_whiteboard.history_title"))}</button></div><div class="whiteboard-overlay-board-list">${boardList || `<p>${escapeHtml(t("module.nextcloud_whiteboard.empty"))}</p>`}</div>`}
                    </div>
                </div>
            </div>
        </div>`;
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

    canvasInstance = createWhiteboardCanvas(canvasElement);
    canvasInstance.setImageUploadMaxBytes(imageUploadMaxBytes);
    if (savedElements.length > 0) {
        canvasInstance.applyElements(savedElements);
    }
    canvasInstance.onChange((elements) => {
        savedElements = elements;
    });
    bindCanvasToolbar(canvasInstance);
}

function buildElements() {
    return [
        {
            id: "whiteboard-canvas",
            label: t("module.nextcloud_whiteboard.canvas_window"),
            pinned: true,
            gridSize: { default: [12, 5], min: [4, 4], max: "full" },
            render: renderCanvasElement,
            onRender: onCanvasRender,
            onUnmount: teardownCanvas,
        },
    ];
}

export async function mount(root, { signal, shareContext } = {}) {
    i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "module.nextcloud_whiteboard.page_title");

    activeShareContext = shareContext ?? null;
    if (!activeShareContext) {
        await loadBoards().catch((error) =>
            reportClientError(
                error,
                "module.nextcloud_whiteboard.load_boards_failed",
            ),
        );
    }

    const initialBoardId =
        activeShareContext?.payload?.whiteboardId ??
        new URLSearchParams(window.location.search).get("id");
    if (initialBoardId) {
        activeBoard = {
            id: initialBoardId,
            title: t("module.nextcloud_whiteboard.canvas_window"),
        };
    }

    signal?.addEventListener("abort", () => teardownCanvas(), { once: true });

    composer = createPageComposer(root, {
        allowCustomization: false,
        elements: buildElements(),
        preferenceKey: "nextcloud-whiteboard-layout",
        persistLayoutPreferences: false,
        presenceTracker: {
            endpoint: `${API_BASE}/whiteboards/presence`,
            pageId: () => activeBoard?.id ?? "",
            storageKey: "nextcloud_whiteboard_presence_session",
        },
        pageManifest: {
            features: {
                pointerTracking: true,
            },
        },
        i18n,
        pageContext: {
            title: t("module.nextcloud_whiteboard.page_title"),
            subtitle: t("module.nextcloud_whiteboard.page_subtitle"),
        },
        showNavbar: sharePageFlag("showNavbar", true),
        showTopbar: sharePageFlag("showTopbar", true),
        showFooter: sharePageFlag("showFooter", true),
        showThemeToggle: sharePageFlag("showThemeToggle", true),
    });
    await composer.init();

    if (activeBoard) {
        void openBoard(activeBoard).then(() => composer?.refreshPresence?.());
    }
}

await mountWhenDirect(mount);
