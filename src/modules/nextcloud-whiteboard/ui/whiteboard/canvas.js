const SESSION_VERSION_NONCE_MAX = 2 ** 31;

function generateElementId() {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

function randomNonce() {
    return Math.floor(Math.random() * SESSION_VERSION_NONCE_MAX);
}

function buildFreedrawElement(points, strokeColor, strokeWidth) {
    if (!points.length) return null;
    let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return {
        id: generateElementId(),
        type: "freedraw",
        x: minX,
        y: minY,
        width: maxX - minX || 1,
        height: maxY - minY || 1,
        strokeColor,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth,
        roughness: 1,
        opacity: 100,
        points: points.map(([x, y]) => [x - minX, y - minY]),
        pressures: [],
        simulatePressure: true,
        isDeleted: false,
        groupIds: [],
        seed: randomNonce(),
        version: 1,
        versionNonce: randomNonce(),
        angle: 0,
    };
}

function renderFreedraw(context, element) {
    const rawPoints = element.points ?? [];
    if (rawPoints.length < 2) return;
    context.save();
    context.strokeStyle = element.strokeColor ?? "#000000";
    context.lineWidth = element.strokeWidth ?? 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalAlpha = (element.opacity ?? 100) / 100;
    context.beginPath();
    context.moveTo(element.x + rawPoints[0][0], element.y + rawPoints[0][1]);
    for (let i = 1; i < rawPoints.length; i++) {
        context.lineTo(
            element.x + rawPoints[i][0],
            element.y + rawPoints[i][1],
        );
    }
    context.stroke();
    context.restore();
}

function renderRectangle(context, element) {
    context.save();
    context.strokeStyle = element.strokeColor ?? "#000000";
    context.lineWidth = element.strokeWidth ?? 2;
    context.globalAlpha = (element.opacity ?? 100) / 100;
    if (element.backgroundColor && element.backgroundColor !== "transparent") {
        context.fillStyle = element.backgroundColor;
        context.fillRect(element.x, element.y, element.width, element.height);
    }
    context.strokeRect(element.x, element.y, element.width, element.height);
    context.restore();
}

function renderEllipse(context, element) {
    context.save();
    context.strokeStyle = element.strokeColor ?? "#000000";
    context.lineWidth = element.strokeWidth ?? 2;
    context.globalAlpha = (element.opacity ?? 100) / 100;
    context.beginPath();
    context.ellipse(
        element.x + element.width / 2,
        element.y + element.height / 2,
        Math.abs(element.width / 2),
        Math.abs(element.height / 2),
        0,
        0,
        Math.PI * 2,
    );
    if (element.backgroundColor && element.backgroundColor !== "transparent") {
        context.fillStyle = element.backgroundColor;
        context.fill();
    }
    context.stroke();
    context.restore();
}

function renderText(context, element) {
    if (!element.text) return;
    context.save();
    context.fillStyle = element.strokeColor ?? "#000000";
    context.font = `${element.fontSize ?? 16}px ${element.fontFamily ?? "sans-serif"}`;
    context.globalAlpha = (element.opacity ?? 100) / 100;
    context.fillText(
        element.text,
        element.x,
        element.y + (element.fontSize ?? 16),
    );
    context.restore();
}

function renderLine(context, element) {
    const rawPoints = element.points ?? [];
    if (rawPoints.length < 2) return;
    context.save();
    context.strokeStyle = element.strokeColor ?? "#000000";
    context.lineWidth = element.strokeWidth ?? 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.globalAlpha = (element.opacity ?? 100) / 100;
    context.beginPath();
    context.moveTo(element.x + rawPoints[0][0], element.y + rawPoints[0][1]);
    for (let i = 1; i < rawPoints.length; i++) {
        context.lineTo(
            element.x + rawPoints[i][0],
            element.y + rawPoints[i][1],
        );
    }
    context.stroke();
    context.restore();
}

function renderElement(context, element) {
    if (element.isDeleted) return;
    switch (element.type) {
        case "freedraw":
            renderFreedraw(context, element);
            break;
        case "rectangle":
            renderRectangle(context, element);
            break;
        case "ellipse":
            renderEllipse(context, element);
            break;
        case "text":
            renderText(context, element);
            break;
        case "line":
        case "arrow":
            renderLine(context, element);
            break;
        default:
            break;
    }
}

export function createWhiteboardCanvas(canvasElement) {
    const context = canvasElement.getContext("2d");
    let elements = [];
    let currentPoints = [];
    let isDrawing = false;
    let strokeColor = "#1e1e2e";
    let strokeWidth = 4;
    let activeTool = "pen";
    let changeCallback = null;
    let pendingRender = false;

    function scheduleRender() {
        if (pendingRender) return;
        pendingRender = true;
        requestAnimationFrame(() => {
            pendingRender = false;
            redraw();
        });
    }

    function redraw() {
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);
        for (const element of elements) {
            renderElement(context, element);
        }
        if (isDrawing && currentPoints.length >= 2 && activeTool === "pen") {
            const previewElement = buildFreedrawElement(
                currentPoints,
                strokeColor,
                strokeWidth,
            );
            if (previewElement) renderFreedraw(context, previewElement);
        }
    }

    function resizeCanvas() {
        const rect = canvasElement.parentElement?.getBoundingClientRect();
        if (!rect) return;
        const toolbarHeight =
            document.getElementById("wb-toolbar")?.offsetHeight ?? 0;
        canvasElement.width = rect.width;
        canvasElement.height = rect.height - toolbarHeight;
        scheduleRender();
    }

    function getCanvasPoint(event) {
        const rect = canvasElement.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    }

    function eraseAt(x, y, radius = 16) {
        const before = elements.length;
        elements = elements.filter((element) => {
            if (element.type === "freedraw") {
                return !element.points.some(
                    ([px, py]) =>
                        Math.hypot(element.x + px - x, element.y + py - y) <
                        radius,
                );
            }
            const centerX = element.x + (element.width ?? 0) / 2;
            const centerY = element.y + (element.height ?? 0) / 2;
            return Math.hypot(centerX - x, centerY - y) >= radius;
        });
        if (elements.length !== before) {
            scheduleRender();
            changeCallback?.([...elements]);
        }
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;
        canvasElement.setPointerCapture(event.pointerId);
        isDrawing = true;
        const [x, y] = getCanvasPoint(event);
        if (activeTool === "eraser") {
            eraseAt(x, y);
            return;
        }
        currentPoints = [[x, y]];
        scheduleRender();
    }

    function onPointerMove(event) {
        if (!isDrawing) return;
        const [x, y] = getCanvasPoint(event);
        if (activeTool === "eraser") {
            eraseAt(x, y);
            return;
        }
        currentPoints.push([x, y]);
        scheduleRender();
    }

    function onPointerUp() {
        if (!isDrawing) return;
        isDrawing = false;
        if (activeTool === "pen" && currentPoints.length >= 2) {
            const element = buildFreedrawElement(
                currentPoints,
                strokeColor,
                strokeWidth,
            );
            if (element) {
                elements.push(element);
                changeCallback?.([...elements]);
            }
        }
        currentPoints = [];
        scheduleRender();
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    canvasElement.addEventListener("pointerup", onPointerUp);
    canvasElement.addEventListener("pointercancel", onPointerUp);

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvasElement.parentElement ?? document.body);
    resizeCanvas();

    return {
        setTool(tool) {
            activeTool = tool;
        },
        setStrokeColor(color) {
            strokeColor = color;
        },
        setStrokeWidth(width) {
            strokeWidth = Number(width);
        },
        getElements() {
            return [...elements];
        },
        applyElements(remoteElements) {
            const remoteById = new Map(
                remoteElements.map((element) => [element.id, element]),
            );
            const localById = new Map(
                elements.map((element) => [element.id, element]),
            );
            for (const [remoteId, remoteElement] of remoteById) {
                const local = localById.get(remoteId);
                if (!local) {
                    localById.set(remoteId, remoteElement);
                    continue;
                }
                const remoteVersion = remoteElement.version ?? 0;
                const localVersion = local.version ?? 0;
                if (remoteVersion > localVersion) {
                    localById.set(remoteId, remoteElement);
                } else if (
                    remoteVersion === localVersion &&
                    (remoteElement.versionNonce ?? 0) >
                        (local.versionNonce ?? 0)
                ) {
                    localById.set(remoteId, remoteElement);
                }
            }
            elements = [...localById.values()];
            scheduleRender();
        },
        clearAll() {
            elements = [];
            currentPoints = [];
            scheduleRender();
            changeCallback?.([]);
        },
        onChange(callback) {
            changeCallback = callback;
        },
        destroy() {
            resizeObserver.disconnect();
            canvasElement.removeEventListener("pointerdown", onPointerDown);
            canvasElement.removeEventListener("pointermove", onPointerMove);
            canvasElement.removeEventListener("pointerup", onPointerUp);
            canvasElement.removeEventListener("pointercancel", onPointerUp);
        },
    };
}
