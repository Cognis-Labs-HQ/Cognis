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

function buildShapeElement(
    type,
    startPoint,
    endPoint,
    strokeColor,
    strokeWidth,
    extra = {},
) {
    const [startX, startY] = startPoint;
    const [endX, endY] = endPoint;
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.max(1, Math.abs(endX - startX));
    const height = Math.max(1, Math.abs(endY - startY));
    return {
        id: generateElementId(),
        type,
        x,
        y,
        width,
        height,
        strokeColor,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth,
        roughness: 1,
        opacity: 100,
        points:
            type === "line" || type === "arrow"
                ? [
                      [startX - x, startY - y],
                      [endX - x, endY - y],
                  ]
                : undefined,
        isDeleted: false,
        groupIds: [],
        seed: randomNonce(),
        version: 1,
        versionNonce: randomNonce(),
        angle: 0,
        ...extra,
    };
}

function buildTextElement(point, text, strokeColor) {
    return buildShapeElement(
        "text",
        point,
        [point[0] + 140, point[1] + 32],
        strokeColor,
        1,
        {
            text,
            fontSize: 20,
            fontFamily: "sans-serif",
        },
    );
}

function buildImageElement(point, dataUrl) {
    return buildShapeElement(
        "image",
        point,
        [point[0] + 240, point[1] + 180],
        "#000000",
        1,
        {
            dataUrl,
        },
    );
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

function renderDiamond(context, element) {
    context.save();
    context.strokeStyle = element.strokeColor ?? "#000000";
    context.lineWidth = element.strokeWidth ?? 2;
    context.globalAlpha = (element.opacity ?? 100) / 100;
    context.beginPath();
    context.moveTo(element.x + element.width / 2, element.y);
    context.lineTo(element.x + element.width, element.y + element.height / 2);
    context.lineTo(element.x + element.width / 2, element.y + element.height);
    context.lineTo(element.x, element.y + element.height / 2);
    context.closePath();
    context.stroke();
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

function renderImage(context, element) {
    if (!element.dataUrl) return;
    const image = new Image();
    image.onload = () => {
        context.drawImage(
            image,
            element.x,
            element.y,
            element.width,
            element.height,
        );
    };
    image.src = element.dataUrl;
}

function drawAnchor(context, x, y) {
    context.save();
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#2563eb";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
}

function getElementAnchorPoints(element) {
    if (element.type === "line" || element.type === "arrow") {
        const points = element.points ?? [[0, 0], [element.width ?? 1, element.height ?? 1]];
        return points.slice(0, 2).map(([px, py]) => [element.x + px, element.y + py]);
    }
    return [
        [element.x, element.y],
        [element.x + (element.width ?? 1), element.y],
        [element.x + (element.width ?? 1), element.y + (element.height ?? 1)],
        [element.x, element.y + (element.height ?? 1)],
    ];
}

function isStrokeWidthApplicable(element) {
    return Boolean(
        element &&
            ["freedraw", "rectangle", "diamond", "ellipse", "line", "arrow"].includes(
                element.type,
            ),
    );
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
    if (element.type === "arrow") {
        const end = rawPoints.at(-1);
        const previous = rawPoints.at(-2);
        const endX = element.x + end[0];
        const endY = element.y + end[1];
        const angle = Math.atan2(end[1] - previous[1], end[0] - previous[0]);
        const size = Math.max(12, (element.strokeWidth ?? 2) * 4);
        context.beginPath();
        context.moveTo(endX, endY);
        context.lineTo(
            endX - size * Math.cos(angle - Math.PI / 6),
            endY - size * Math.sin(angle - Math.PI / 6),
        );
        context.moveTo(endX, endY);
        context.lineTo(
            endX - size * Math.cos(angle + Math.PI / 6),
            endY - size * Math.sin(angle + Math.PI / 6),
        );
        context.stroke();
    }
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
        case "diamond":
            renderDiamond(context, element);
            break;
        case "image":
            renderImage(context, element);
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
    let imageUploadMaxBytes = 1048576;
    let selectedElementId = null;
    let activeAnchorIndex = null;
    let dragStartPoint = null;
    let originalElement = null;
    let changeCallback = null;
    let selectionCallback = null;
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
        const style = getComputedStyle(canvasElement);
        context.fillStyle = style.getPropertyValue("--wb-canvas-bg").trim() || "#ffffff";
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);
        for (const element of elements) {
            renderElement(context, element);
            if (element.id === selectedElementId) {
                context.save();
                context.setLineDash([6, 4]);
                context.strokeStyle = "#2d9e5c";
                context.strokeRect(
                    element.x - 4,
                    element.y - 4,
                    (element.width ?? 1) + 8,
                    (element.height ?? 1) + 8,
                );
                context.restore();
                for (const [anchorX, anchorY] of getElementAnchorPoints(element)) {
                    drawAnchor(context, anchorX, anchorY);
                }
            }
        }
        if (isDrawing && currentPoints.length >= 2 && activeTool === "pen") {
            const previewElement = buildFreedrawElement(
                currentPoints,
                strokeColor,
                strokeWidth,
            );
            if (previewElement) renderFreedraw(context, previewElement);
        } else if (
            isDrawing &&
            dragStartPoint &&
            currentPoints.length >= 1 &&
            ["rectangle", "diamond", "ellipse", "line", "arrow"].includes(
                activeTool,
            )
        ) {
            const previewElement = buildShapeElement(
                activeTool,
                dragStartPoint,
                currentPoints.at(-1),
                strokeColor,
                strokeWidth,
            );
            renderElement(context, previewElement);
        }
    }

    function resizeCanvas() {
        const rect = canvasElement.parentElement?.getBoundingClientRect();
        if (!rect) return;
        canvasElement.width = rect.width;
        canvasElement.height = rect.height;
        scheduleRender();
    }

    function getCanvasPoint(event) {
        const rect = canvasElement.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
    }

    function findAnchorAt(element, x, y) {
        if (!element) return -1;
        return getElementAnchorPoints(element).findIndex(
            ([anchorX, anchorY]) => Math.hypot(anchorX - x, anchorY - y) <= 10,
        );
    }

    function selectedElement() {
        return elements.find((element) => element.id === selectedElementId) ?? null;
    }

    function notifySelection() {
        const element = selectedElement();
        selectionCallback?.(element ? { ...element, strokeWidthApplicable: isStrokeWidthApplicable(element) } : null);
    }

    function findElementAt(x, y) {
        return [...elements]
            .reverse()
            .find(
                (element) =>
                    x >= element.x &&
                    x <= element.x + (element.width ?? 1) &&
                    y >= element.y &&
                    y <= element.y + (element.height ?? 1),
            );
    }

    function commitElements(nextElements) {
        elements = nextElements;
        scheduleRender();
        changeCallback?.([...elements]);
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
            commitElements(elements);
        }
    }

    function onPointerDown(event) {
        if (event.button !== 0) return;
        canvasElement.setPointerCapture(event.pointerId);
        canvasElement.focus();
        isDrawing = true;
        const [x, y] = getCanvasPoint(event);
        dragStartPoint = [x, y];
        if (activeTool === "select") {
            const selected = selectedElement();
            activeAnchorIndex = findAnchorAt(selected, x, y);
            const target = activeAnchorIndex >= 0 ? selected : findElementAt(x, y);
            selectedElementId = target?.id ?? null;
            originalElement = target ? { ...target, points: target.points?.map((point) => [...point]) } : null;
            notifySelection();
            scheduleRender();
            return;
        }
        if (activeTool === "eraser") {
            eraseAt(x, y);
            return;
        }
        if (activeTool === "text") {
            commitElements([
                ...elements,
                buildTextElement([x, y], "Text", strokeColor),
            ]);
            isDrawing = false;
            return;
        }
        currentPoints = [[x, y]];
        scheduleRender();
    }

    function onPointerMove(event) {
        if (!isDrawing) return;
        const [x, y] = getCanvasPoint(event);
        if (
            activeTool === "select" &&
            selectedElementId &&
            originalElement &&
            dragStartPoint
        ) {
            const dx = x - dragStartPoint[0];
            const dy = y - dragStartPoint[1];
            elements = elements.map((element) => {
                if (element.id !== selectedElementId) return element;
                if (activeAnchorIndex >= 0) {
                    if (element.type === "line" || element.type === "arrow") {
                        const points = (originalElement.points ?? []).map((point) => [...point]);
                        points[activeAnchorIndex] = [
                            (points[activeAnchorIndex]?.[0] ?? 0) + dx,
                            (points[activeAnchorIndex]?.[1] ?? 0) + dy,
                        ];
                        const absolutePoints = points.map(([px, py]) => [
                            originalElement.x + px,
                            originalElement.y + py,
                        ]);
                        const minX = Math.min(...absolutePoints.map(([px]) => px));
                        const minY = Math.min(...absolutePoints.map(([, py]) => py));
                        const maxX = Math.max(...absolutePoints.map(([px]) => px));
                        const maxY = Math.max(...absolutePoints.map(([, py]) => py));
                        return {
                            ...element,
                            x: minX,
                            y: minY,
                            width: Math.max(1, maxX - minX),
                            height: Math.max(1, maxY - minY),
                            points: absolutePoints.map(([px, py]) => [px - minX, py - minY]),
                            version: (originalElement.version ?? 1) + 1,
                            versionNonce: randomNonce(),
                        };
                    }
                    const leftAnchors = new Set([0, 3]);
                    const topAnchors = new Set([0, 1]);
                    const nextX = leftAnchors.has(activeAnchorIndex) ? originalElement.x + dx : originalElement.x;
                    const nextY = topAnchors.has(activeAnchorIndex) ? originalElement.y + dy : originalElement.y;
                    const nextRight = leftAnchors.has(activeAnchorIndex) ? originalElement.x + originalElement.width : originalElement.x + originalElement.width + dx;
                    const nextBottom = topAnchors.has(activeAnchorIndex) ? originalElement.y + originalElement.height : originalElement.y + originalElement.height + dy;
                    return { ...element, x: Math.min(nextX, nextRight), y: Math.min(nextY, nextBottom), width: Math.max(1, Math.abs(nextRight - nextX)), height: Math.max(1, Math.abs(nextBottom - nextY)), version: (originalElement.version ?? 1) + 1, versionNonce: randomNonce() };
                }
                return {
                    ...element,
                    x: originalElement.x + dx,
                    y: originalElement.y + dy,
                    version: (originalElement.version ?? 1) + 1,
                    versionNonce: randomNonce(),
                };
            });
            scheduleRender();
            return;
        }
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
        if (activeTool === "select" && selectedElementId) {
            changeCallback?.([...elements]);
        } else if (activeTool === "pen" && currentPoints.length >= 2) {
            const element = buildFreedrawElement(
                currentPoints,
                strokeColor,
                strokeWidth,
            );
            if (element) commitElements([...elements, element]);
        } else if (
            ["rectangle", "diamond", "ellipse", "line", "arrow"].includes(
                activeTool,
            ) &&
            dragStartPoint &&
            currentPoints.length >= 1
        ) {
            commitElements([
                ...elements,
                buildShapeElement(
                    activeTool,
                    dragStartPoint,
                    currentPoints.at(-1),
                    strokeColor,
                    strokeWidth,
                ),
            ]);
        }
        currentPoints = [];
        dragStartPoint = null;
        originalElement = null;
        activeAnchorIndex = null;
        scheduleRender();
    }

    function onPaste(event) {
        const imageFile = [...(event.clipboardData?.files ?? [])].find((file) =>
            file.type.startsWith("image/"),
        );
        if (!imageFile) return;
        event.preventDefault();
        if (imageFile.size > imageUploadMaxBytes) {
            changeCallback?.([...elements], {
                type: "image_rejected",
                limit: imageUploadMaxBytes,
            });
            return;
        }
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result !== "string") return;
            commitElements([
                ...elements,
                buildImageElement([24, 24], reader.result),
            ]);
        });
        reader.readAsDataURL(imageFile);
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    canvasElement.addEventListener("pointerup", onPointerUp);
    canvasElement.addEventListener("pointercancel", onPointerUp);
    canvasElement.addEventListener("paste", onPaste);

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvasElement.parentElement ?? document.body);
    resizeCanvas();

    return {
        setTool(tool) {
            activeTool = tool;
        },
        setStrokeColor(color) {
            strokeColor = color;
            if (selectedElementId) {
                commitElements(elements.map((element) => element.id === selectedElementId ? { ...element, strokeColor: color, version: (element.version ?? 1) + 1, versionNonce: randomNonce() } : element));
                notifySelection();
            }
        },
        setStrokeWidth(width) {
            strokeWidth = Number(width);
            if (selectedElementId && isStrokeWidthApplicable(selectedElement())) {
                commitElements(elements.map((element) => element.id === selectedElementId ? { ...element, strokeWidth, version: (element.version ?? 1) + 1, versionNonce: randomNonce() } : element));
                notifySelection();
            }
        },
        setImageUploadMaxBytes(maxBytes) {
            imageUploadMaxBytes = Number(maxBytes);
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
            if (selectedElementId && !selectedElement()) selectedElementId = null;
            notifySelection();
            scheduleRender();
        },
        clearAll() {
            elements = [];
            currentPoints = [];
            scheduleRender();
            selectedElementId = null;
            notifySelection();
            changeCallback?.([]);
        },
        onSelectionChange(callback) {
            selectionCallback = callback;
            notifySelection();
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
            canvasElement.removeEventListener("paste", onPaste);
        },
    };
}
