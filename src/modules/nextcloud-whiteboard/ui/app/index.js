import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
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
let preflightNeedsConfig = false;
let connectionStatus = "";
let connectionVariant = "neutral";

function t(key) {
    return i18n?.t(key) ?? key;
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

async function spawnBoard({ title, participants }) {
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
                new Error(t("module.nextcloudWhiteboard.socket_load_failed")),
            );
        document.head.appendChild(script);
    });
}

function setConnectionStatus(message, variant = "neutral") {
    connectionStatus = message;
    connectionVariant = variant;
    const statusEl = document.getElementById("wb-connection-status");
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.dataset.variant = variant;
    }
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
        } catch {
            // fall through — socket may already be gone
        }
        socketInstance = null;
    }
    if (canvasInstance) {
        try {
            canvasInstance.destroy();
        } catch {
            // fall through — canvas element may have been removed from DOM
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
        setConnectionStatus(
            t("module.nextcloudWhiteboard.connected"),
            "success",
        );
        socket.emit("joinRoom", { roomID: roomId, token });
    });

    socket.on("disconnect", (reason) => {
        setConnectionStatus(
            `${t("module.nextcloudWhiteboard.disconnected")}: ${reason}`,
            "warning",
        );
    });

    socket.on("connect_error", (error) => {
        setConnectionStatus(
            `${t("module.nextcloudWhiteboard.connect_error")}: ${error.message}`,
            "error",
        );
    });

    socket.on("server-volatile:elements:updated", ({ elements }) => {
        if (Array.isArray(elements)) canvas.applyElements(elements);
    });

    socket.on("elements:updated", ({ elements }) => {
        if (Array.isArray(elements)) canvas.applyElements(elements);
    });

    return socket;
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

async function runPreflightCheck() {
    if (preflightStatus === "running") return false;
    preflightStatus = "running";
    setOverlayVisible(true, t("module.nextcloudWhiteboard.preflight_checking"));

    let result;
    try {
        result = await apiFetchJson("/whiteboards/preflight", {
            method: "POST",
        });
    } catch (error) {
        preflightStatus = "failed";
        preflightNeedsConfig = error.code === "config_required";
        const message = preflightNeedsConfig
            ? t("module.nextcloudWhiteboard.preflight_config_required")
            : t("module.nextcloudWhiteboard.preflight_failed");
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }

    if (!result?.alive) {
        preflightStatus = "failed";
        preflightNeedsConfig = false;
        const message = t("module.nextcloudWhiteboard.preflight_unreachable");
        setOverlayVisible(true, message);
        showToast(message, { variant: "error" });
        return false;
    }

    preflightStatus = "passed";
    preflightNeedsConfig = false;
    return true;
}

async function openBoard(board) {
    activeBoard = board;
    teardownCanvas();
    composer.refresh(buildElements());

    const passed = await runPreflightCheck();
    if (!passed) return;

    setOverlayVisible(true, t("module.nextcloudWhiteboard.connecting"));

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
    setConnectionStatus(t("module.nextcloudWhiteboard.connecting_ellipsis"));
}

async function handleSpawn(form) {
    const titleInput = form.querySelector('[name="title"]');
    const participantsInput = form.querySelector('[name="participants"]');
    const participants = (participantsInput?.value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

    let spawnResult;
    try {
        spawnResult = await spawnBoard({
            title: titleInput?.value ?? "",
            participants,
        });
    } catch (error) {
        showToast(error.message, { variant: "error" });
        return;
    }

    if (titleInput) titleInput.value = "";
    if (participantsInput) participantsInput.value = "";

    try {
        await loadBoards();
    } catch {
        // non-fatal — board list may be stale
    }

    composer.refresh(buildElements());
    await openBoard(spawnResult.whiteboard);
}

function renderBoardsElement() {
    const boardItems = boards
        .map(
            (board) =>
                `<article class="wb-board-card">
                    <h2>${escapeHtml(board.title)}</h2>
                    <p class="wb-board-meta">${escapeHtml(board.role ?? "")} &middot; ${escapeHtml(new Date(board.updatedAt).toLocaleString())}</p>
                    <button type="button" class="wb-board-open" data-board-id="${escapeHtml(board.id)}">${escapeHtml(t("module.nextcloudWhiteboard.open"))}</button>
                </article>`,
        )
        .join("");
    const emptyHtml =
        boards.length === 0
            ? `<p class="wb-empty">${escapeHtml(t("module.nextcloudWhiteboard.empty"))}</p>`
            : "";

    return `
        <div class="wb-boards-panel">
            <form class="wb-spawn-form" id="wb-spawn-form">
                <label>
                    <span>${escapeHtml(t("module.nextcloudWhiteboard.title"))}</span>
                    <input name="title" type="text" autocomplete="off" />
                </label>
                <label>
                    <span>${escapeHtml(t("module.nextcloudWhiteboard.participants"))}</span>
                    <input name="participants" type="text" autocomplete="off" />
                </label>
                <button type="submit">${escapeHtml(t("module.nextcloudWhiteboard.spawn"))}</button>
            </form>
            <div class="wb-board-list">${boardItems}${emptyHtml}</div>
        </div>`;
}

function onBoardsRender() {
    const form = document.getElementById("wb-spawn-form");
    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleSpawn(form);
    });

    document.querySelectorAll(".wb-board-open").forEach((button) => {
        button.addEventListener("click", async () => {
            const boardId = button.dataset.boardId;
            const board = boards.find((item) => item.id === boardId);
            if (board) await openBoard(board);
        });
    });
}

function renderCanvasElement() {
    const hasActiveBoard = Boolean(activeBoard);
    const overlayHidden = hasActiveBoard && preflightStatus === "passed";
    const overlayMessage = hasActiveBoard
        ? t("module.nextcloudWhiteboard.connecting_ellipsis")
        : t("module.nextcloudWhiteboard.canvas_placeholder");

    return `
        <div class="wb-canvas-wrap">
            <div
                id="wb-toolbar"
                class="wb-toolbar"
                role="toolbar"
                aria-label="${escapeHtml(t("module.nextcloudWhiteboard.toolbar_label"))}"
                ${hasActiveBoard ? "" : "hidden"}
            >
                <div class="wb-toolbar-group">
                    <button type="button" data-tool="pen" class="wb-tool active" title="${escapeHtml(t("module.nextcloudWhiteboard.tool_pen"))}">&#9999;</button>
                    <button type="button" data-tool="eraser" class="wb-tool" title="${escapeHtml(t("module.nextcloudWhiteboard.tool_eraser"))}">&#9003;</button>
                </div>
                <div class="wb-toolbar-group">
                    <input type="color" id="wb-color" value="#1e1e2e" title="${escapeHtml(t("module.nextcloudWhiteboard.stroke_color"))}" />
                    <select id="wb-stroke-width" title="${escapeHtml(t("module.nextcloudWhiteboard.stroke_width"))}">
                        <option value="2">${escapeHtml(t("module.nextcloudWhiteboard.stroke_thin"))}</option>
                        <option value="4" selected>${escapeHtml(t("module.nextcloudWhiteboard.stroke_medium"))}</option>
                        <option value="8">${escapeHtml(t("module.nextcloudWhiteboard.stroke_thick"))}</option>
                    </select>
                </div>
                <div class="wb-toolbar-group">
                    <button type="button" id="wb-clear" title="${escapeHtml(t("module.nextcloudWhiteboard.clear_board"))}">&#10005; ${escapeHtml(t("module.nextcloudWhiteboard.clear_board"))}</button>
                </div>
                <div class="wb-toolbar-group wb-toolbar-status-group">
                    <span id="wb-connection-status" class="wb-status" aria-live="polite">${escapeHtml(connectionStatus)}</span>
                    <span id="wb-board-title" class="wb-board-title">${escapeHtml(activeSession?.title ?? activeBoard?.title ?? "")}</span>
                </div>
            </div>
            <div class="wb-canvas-stage">
                <canvas
                    id="wb-canvas"
                    tabindex="0"
                    aria-label="${escapeHtml(t("module.nextcloudWhiteboard.canvas_label"))}"
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
    if (!activeBoard || preflightStatus !== "passed") return;
    const canvasElement = document.getElementById("wb-canvas");
    if (!canvasElement || canvasInstance) return;

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
            label: t("module.nextcloudWhiteboard.canvas_window"),
            pinned: true,
            gridSize: { default: [8, 5], min: [4, 4], max: "full" },
            render: renderCanvasElement,
            onRender: onCanvasRender,
            onUnmount: teardownCanvas,
        },
        {
            id: "whiteboard-boards",
            label: t("module.nextcloudWhiteboard.boards_window"),
            gridSize: { default: [4, 5], min: [3, 3], max: ["half", 6] },
            render: renderBoardsElement,
            onRender: onBoardsRender,
        },
    ];
}

export async function mount(root, { signal } = {}) {
    i18n = await createI18n();
    applyDocumentTitle(i18n, "module.nextcloudWhiteboard.page_title");

    try {
        await loadBoards();
    } catch {
        showToast(t("module.nextcloudWhiteboard.load_boards_failed"), {
            variant: "error",
        });
    }

    signal?.addEventListener("abort", () => teardownCanvas(), { once: true });

    composer = createPageComposer(root, {
        allowCustomization: true,
        elements: buildElements(),
        preferenceKey: "nextcloud-whiteboard-layout",
        i18n,
        pageContext: {
            title: t("module.nextcloudWhiteboard.page_title"),
            subtitle: t("module.nextcloudWhiteboard.page_subtitle"),
        },
    });
    await composer.init();
}

if (!globalThis.__spaRouter) {
    const root = document.querySelector("#app");
    if (root) await mount(root);
}
