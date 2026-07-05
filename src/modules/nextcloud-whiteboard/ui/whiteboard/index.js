import { createWhiteboardCanvas } from "./canvas.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";
const EMIT_DEBOUNCE_MS = 80;
const RECONNECT_MAX_DELAY_MS = 30000;

function getWhiteboardId() {
    return new URLSearchParams(window.location.search).get("id");
}

async function fetchSession(whiteboardId) {
    const response = await fetch(
        `${API_BASE}/whiteboards/session?id=${encodeURIComponent(whiteboardId)}`,
        { credentials: "same-origin" },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Failed to load session.");
    }
    return payload.data;
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
                new Error("Could not load Socket.IO from whiteboard server."),
            );
        document.head.appendChild(script);
    });
}

function setStatus(message, variant = "neutral") {
    const statusEl = document.getElementById("whiteboard-connection-status");
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.variant = variant;
}

function debounce(callback, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

function connectSocketIo(io, session, canvas) {
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
        setStatus("Connected", "success");
        socket.emit("joinRoom", { roomID: roomId, token });
    });

    socket.on("disconnect", (reason) => {
        setStatus(`Disconnected: ${reason}`, "warning");
    });

    socket.on("connect_error", (error) => {
        setStatus(`Connection error: ${error.message}`, "error");
    });

    socket.on("server-volatile:elements:updated", ({ elements }) => {
        if (Array.isArray(elements)) {
            canvas.applyElements(elements);
        }
    });

    socket.on("elements:updated", ({ elements }) => {
        if (Array.isArray(elements)) {
            canvas.applyElements(elements);
        }
    });

    return socket;
}

function bindToolbar(canvas) {
    const toolbar = document.getElementById("whiteboard-toolbar");
    if (!toolbar) return;

    toolbar.querySelectorAll("[data-tool]").forEach((button) => {
        button.addEventListener("click", () => {
            toolbar.querySelectorAll("[data-tool]").forEach((btn) => {
                btn.classList.remove("active");
            });
            button.classList.add("active");
            canvas.setTool(button.dataset.tool);
        });
    });

    const colorInput = document.getElementById("whiteboard-color");
    colorInput?.addEventListener("input", () => {
        canvas.setStrokeColor(colorInput.value);
    });

    const strokeSelect = document.getElementById("whiteboard-stroke-width");
    strokeSelect?.addEventListener("change", () => {
        canvas.setStrokeWidth(strokeSelect.value);
    });

    document
        .getElementById("whiteboard-clear")
        ?.addEventListener("click", () => {
            canvas.clearAll();
        });
}

async function init() {
    const whiteboardId = getWhiteboardId();
    if (!whiteboardId) {
        setStatus("No whiteboard ID specified.", "error");
        return;
    }

    setStatus("Loading\u2026");

    let session;
    try {
        session = await fetchSession(whiteboardId);
    } catch (error) {
        setStatus(error.message, "error");
        return;
    }

    const titleEl = document.getElementById("whiteboard-title");
    if (titleEl) titleEl.textContent = session.title ?? "";
    document.title = session.title
        ? `${session.title} \u2014 Whiteboard`
        : "Whiteboard";

    const canvasElement = document.getElementById("whiteboard-canvas");
    const canvas = createWhiteboardCanvas(canvasElement);
    bindToolbar(canvas);

    setStatus("Connecting\u2026");

    let io;
    try {
        io = await loadSocketIo(session.serverUrl);
    } catch (error) {
        setStatus(error.message, "error");
        return;
    }

    connectSocketIo(io, session, canvas);
}

await init();
