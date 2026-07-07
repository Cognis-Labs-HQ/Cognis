import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createWhiteboardCanvas } from "../whiteboard/canvas.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";
const EMIT_DEBOUNCE_MS = 80;
const RECONNECT_MAX_DELAY_MS = 30000;

let i18n = null;
let composer = null;

let boards = [];
let activeBoard = null;
let activeSession = null;
let canvasInstance = null;
let socketInstance = null;
let savedElements = [];
let preflightStatus = "idle";
let lastConnectionToast = "";

function t(key) {
    return i18n?.t(key) ?? key;
}

function reportClientError(error, fallbackKey) {
    console.error("[nextcloud-whiteboard] client error:", error);
    showToast(error?.message || t(fallbackKey), { variant: "error" });
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
    const overlay = document.getElementById("wb-canvas-overlay");
    if (!overlay) return;
    overlay.hidden = !visible;
    const messageEl = overlay.querySelector(".wb-overlay-message");
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

function connectSocket(io, session, canvas) {
    const { serverUrl, roomId, token } = session;
    const socket = io(serverUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnectionDelay: 1000,
        reconnectionDelayMax: RECONNECT_MAX_DELAY_MS,
    });

    const emitChanges = debounce((elements) => {
        if (!socket.connected) return;
        socket.emit("elements:changed", { elements, roomId });
    }, EMIT_DEBOUNCE_MS);

    canvas.onChange(emitChanges);

    socket.on("connect", () => {
        lastConnectionToast = "";
        socket.emit("joinRoom", { roomID: roomId, token });
    });

    socket.on("connect_error", (error) => {
        const message = buildConnectionErrorMessage(error, serverUrl);
        if (message !== lastConnectionToast) {
            lastConnectionToast = message;
            showToast(message, { variant: "error" });
        }
    });

    socket.on("server-volatile:elements:updated", ({ elements }) => {
        if (Array.isArray(elements)) canvas.applyElements(elements);
    });

    socket.on("elements:updated", ({ elements }) => {
        if (Array.isArray(elements)) canvas.applyElements(elements);
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
    await openBoard(spawnResult.whiteboard);
}

function bindCanvasToolbar(canvas) {
    const toolbar = document.getElementById("wb-toolbar");
    if (!toolbar) return;

    toolbar.querySelectorAll("[data-tool]").forEach((button) => {
        button.addEventListener("click", () => {
            toolbar
                .querySelectorAll("[data-tool]")
                .forEach((btn) => btn.classList.remove("active"));
            button.classList.add("active");
            canvas.setTool(button.dataset.tool);
        });
    });

    document
        .getElementById("wb-new")
        ?.addEventListener("click", () => void createAndOpenBoard());
    document
        .getElementById("wb-history")
        ?.addEventListener("click", () => void openHistoryPopup());

    const colorInput = document.getElementById("wb-color");
    colorInput?.addEventListener("input", () => {
        canvas.setStrokeColor(colorInput.value);
    });

    const strokeSelect = document.getElementById("wb-stroke-width");
    strokeSelect?.addEventListener("change", () => {
        canvas.setStrokeWidth(strokeSelect.value);
    });

    document.getElementById("wb-clear")?.addEventListener("click", () => {
        canvas.clearAll();
        savedElements = [];
    });
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
        ? `<div class="wb-history-list">${boards
              .map(
                  (board) => `
                    <article class="wb-history-card">
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
                label: t("module.nextcloud_whiteboard.close"),
                variant: "confirm",
            },
        ],
    });
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

async function openBoard(board) {
    activeBoard = board;
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

    const titleEl = document.getElementById("wb-board-title");
    if (titleEl) titleEl.textContent = session.title ?? "";

    let io;
    try {
        io = await loadSocketIo(session.serverUrl);
    } catch (error) {
        setOverlayVisible(true, error.message);
        showToast(error.message, { variant: "error" });
        return;
    }

    const canvasElement = document.getElementById("wb-canvas");
    if (!canvasElement) return;

    canvasInstance = createWhiteboardCanvas(canvasElement);
    if (savedElements.length > 0) {
        canvasInstance.applyElements(savedElements);
    }
    canvasInstance.onChange((elements) => {
        savedElements = elements;
    });

    socketInstance = connectSocket(io, session, canvasInstance);
    bindCanvasToolbar(canvasInstance);

    setOverlayVisible(false);
}

function renderCanvasElement() {
    const hasActiveBoard = Boolean(activeBoard);
    const overlayHidden = hasActiveBoard && preflightStatus === "passed";
    const overlayMessage = hasActiveBoard
        ? t("module.nextcloud_whiteboard.connecting_ellipsis")
        : t("module.nextcloud_whiteboard.canvas_placeholder");

    return `
        <div class="wb-canvas-wrap">
            <div
                id="wb-toolbar"
                class="wb-toolbar"
                role="toolbar"
                aria-label="${escapeHtml(t("module.nextcloud_whiteboard.toolbar_label"))}"
            >
                <div class="wb-toolbar-group">
                    <button type="button" id="wb-new" class="wb-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.new_board"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.new_board"))}">＋</button>
                    <button type="button" id="wb-history" class="wb-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.history_title"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.history_title"))}">☰</button>
                </div>
                <div class="wb-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    <button type="button" data-tool="pen" class="wb-tool active" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_pen"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_pen"))}">✎</button>
                    <button type="button" data-tool="eraser" class="wb-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.tool_eraser"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.tool_eraser"))}">⌫</button>
                </div>
                <div class="wb-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    <input type="color" id="wb-color" value="#1e1e2e" title="${escapeHtml(t("module.nextcloud_whiteboard.stroke_color"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.stroke_color"))}" />
                    <select id="wb-stroke-width" class="wb-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.stroke_width"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.stroke_width"))}">
                        <option value="2">${escapeHtml(t("module.nextcloud_whiteboard.stroke_thin"))}</option>
                        <option value="4" selected>${escapeHtml(t("module.nextcloud_whiteboard.stroke_medium"))}</option>
                        <option value="8">${escapeHtml(t("module.nextcloud_whiteboard.stroke_thick"))}</option>
                    </select>
                </div>
                <div class="wb-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
                    <button type="button" id="wb-clear" class="wb-tool" title="${escapeHtml(t("module.nextcloud_whiteboard.clear_board"))}" aria-label="${escapeHtml(t("module.nextcloud_whiteboard.clear_board"))}">×</button>
                </div>
                <span id="wb-board-title" class="wb-board-title">${escapeHtml(activeSession?.title ?? activeBoard?.title ?? "")}</span>
            </div>
            <div class="wb-canvas-stage">
                <canvas
                    id="wb-canvas"
                    tabindex="0"
                    aria-label="${escapeHtml(t("module.nextcloud_whiteboard.canvas_label"))}"
                ></canvas>
                <div
                    id="wb-canvas-overlay"
                    class="wb-canvas-overlay"
                    ${overlayHidden ? "hidden" : ""}
                    aria-live="polite"
                >
                    <p class="wb-overlay-message">${escapeHtml(overlayMessage)}</p>
                </div>
            </div>
        </div>`;
}

function onCanvasRender() {
    const canvasElement = document.getElementById("wb-canvas");
    if (!canvasElement || canvasInstance || !activeBoard) return;
    if (preflightStatus !== "passed") return;

    canvasInstance = createWhiteboardCanvas(canvasElement);
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

export async function mount(root, { signal } = {}) {
    i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "module.nextcloud_whiteboard.page_title");

    const initialBoardId = new URLSearchParams(window.location.search).get(
        "id",
    );
    if (initialBoardId) {
        activeBoard = {
            id: initialBoardId,
            title: t("module.nextcloud_whiteboard.canvas_window"),
        };
    }

    signal?.addEventListener("abort", () => teardownCanvas(), { once: true });

    composer = createPageComposer(root, {
        allowCustomization: true,
        elements: buildElements(),
        preferenceKey: "nextcloud-whiteboard-layout",
        i18n,
        pageContext: {
            title: t("module.nextcloud_whiteboard.page_title"),
            subtitle: t("module.nextcloud_whiteboard.page_subtitle"),
        },
    });
    await composer.init();

    if (activeBoard) {
        await openBoard(activeBoard);
    }
}

if (!globalThis.__spaRouter) {
    const root = document.querySelector("#app");
    if (root) await mount(root);
}
