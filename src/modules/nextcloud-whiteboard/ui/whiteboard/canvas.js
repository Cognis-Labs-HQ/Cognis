import {
    boxContainsElementContent,
    buildDragBox,
    buildFreedrawElement,
    buildImageElement,
    buildShapeElement,
    buildTextElement,
    bumpElementVersion,
    drawAnchor,
    getElementAnchorPoints,
    getElementBounds,
    elementContainsPoint,
    isStrokeWidthApplicable,
    renderElement,
} from "./elements.js";

export function createWhiteboardCanvas(canvasElement) {
    const context = canvasElement.getContext("2d");
    let elements = [];
    let currentPoints = [];
    let isDrawing = false;
    let strokeColor = "auto";
    let strokeWidth = 4;
    let activeTool = "pen";
    let imageUploadMaxBytes = 1048576;
    let selectedElementId = null;
    let selectedElementIds = new Set();
    let eraserSelectionIds = new Set();
    let activeAnchorIndex = null;
    let dragStartPoint = null;
    let dragSelectBox = null;
    let selectDragMode = null;
    let originalElement = null;
    let originalSelection = new Map();
    let changeCallback = null;
    let selectionCallback = null;
    let toolCallback = null;
    let pendingRender = false;
    let historyPast = [];
    let historyFuture = [];
    let historySnapshot = null;
    let panState = null;

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
        context.fillStyle =
            style.getPropertyValue("--wb-canvas-bg").trim() || "#ffffff";
        context.fillRect(0, 0, canvasElement.width, canvasElement.height);
        for (const element of elements) {
            renderElement(context, element);
            if (
                selectedElementIds.has(element.id) ||
                eraserSelectionIds.has(element.id)
            ) {
                const bounds = getElementBounds(element);
                context.save();
                context.setLineDash([6, 4]);
                context.strokeStyle = eraserSelectionIds.has(element.id)
                    ? "#c0392b"
                    : "#2d9e5c";
                context.strokeRect(
                    bounds.x - 4,
                    bounds.y - 4,
                    bounds.width + 8,
                    bounds.height + 8,
                );
                context.restore();
                if (element.id === selectedElementId) {
                    for (const [anchorX, anchorY] of getElementAnchorPoints(
                        element,
                    )) {
                        drawAnchor(context, anchorX, anchorY);
                    }
                }
            }
        }
        if (dragSelectBox) {
            context.save();
            context.setLineDash([4, 4]);
            context.strokeStyle = "#2563eb";
            context.strokeRect(
                dragSelectBox.x,
                dragSelectBox.y,
                dragSelectBox.width,
                dragSelectBox.height,
            );
            context.restore();
        }
        if (isDrawing && currentPoints.length >= 2 && activeTool === "pen") {
            const previewElement = buildFreedrawElement(
                currentPoints,
                strokeColor,
                strokeWidth,
            );
            if (previewElement) renderElement(context, previewElement);
        } else if (
            isDrawing &&
            dragStartPoint &&
            currentPoints.length >= 1 &&
            activeTool === "eraser"
        ) {
            const box = buildDragBox(dragStartPoint, currentPoints.at(-1));
            context.save();
            context.setLineDash([4, 4]);
            context.strokeStyle = "#c0392b";
            context.strokeRect(box.x, box.y, box.width, box.height);
            context.restore();
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

    function cloneElements(items = elements) {
        return items.map((element) => ({
            ...element,
            points: element.points?.map((point) => [...point]),
        }));
    }

    function resizeCanvas() {
        if (!isDrawing) updateCanvasOverflow();
        scheduleRender();
    }

    function updateCanvasOverflow() {
        const parent = canvasElement.parentElement;
        const rect = parent?.getBoundingClientRect();
        if (!rect) return;
        const overflowPadding = 48;
        let bounds = elements.map(getElementBounds);
        const minX = Math.min(0, ...bounds.map((item) => item.x));
        const minY = Math.min(0, ...bounds.map((item) => item.y));
        if (minX < 0 || minY < 0) {
            const dx = minX < 0 ? Math.abs(minX) + overflowPadding : 0;
            const dy = minY < 0 ? Math.abs(minY) + overflowPadding : 0;
            elements = elements.map((element) =>
                bumpElementVersion(element, {
                    x: element.x + dx,
                    y: element.y + dy,
                }),
            );
            bounds = elements.map(getElementBounds);
            parent.scrollLeft += dx;
            parent.scrollTop += dy;
        }
        const contentRight = Math.max(
            0,
            ...bounds.map((item) => item.x + item.width),
        );
        const contentBottom = Math.max(
            0,
            ...bounds.map((item) => item.y + item.height),
        );
        const maxX = Math.max(
            canvasElement.width || 0,
            contentRight > rect.width
                ? contentRight + overflowPadding
                : rect.width,
        );
        const maxY = Math.max(
            canvasElement.height || 0,
            contentBottom > rect.height
                ? contentBottom + overflowPadding
                : rect.height,
        );
        const width = Math.ceil(maxX);
        const height = Math.ceil(maxY);
        if (canvasElement.width !== width) canvasElement.width = width;
        if (canvasElement.height !== height) canvasElement.height = height;
        canvasElement.style.width = `${width}px`;
        canvasElement.style.height = `${height}px`;
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
        return (
            elements.find((element) => element.id === selectedElementId) ?? null
        );
    }

    function syncPrimarySelection() {
        if (selectedElementId && selectedElementIds.has(selectedElementId))
            return;
        selectedElementId = selectedElementIds.values().next().value ?? null;
    }

    function notifySelection() {
        syncPrimarySelection();
        const element = selectedElement();
        selectionCallback?.(
            element
                ? {
                      ...element,
                      strokeWidthApplicable: isStrokeWidthApplicable(element),
                  }
                : null,
        );
    }

    function findElementAt(x, y) {
        return [...elements]
            .reverse()
            .find((element) => elementContainsPoint(element, x, y));
    }

    function commitElements(nextElements, { record = true } = {}) {
        if (record) {
            historyPast.push(cloneElements());
            historyPast = historyPast.slice(-100);
            historyFuture = [];
        }
        elements = nextElements;
        updateCanvasOverflow();
        scheduleRender();
        changeCallback?.([...elements]);
    }

    function restoreElements(snapshot) {
        elements = cloneElements(snapshot);
        updateCanvasOverflow();
        scheduleRender();
        changeCallback?.([...elements]);
        notifySelection();
    }

    function undo() {
        const previous = historyPast.pop();
        if (!previous) return false;
        historyFuture.push(cloneElements());
        restoreElements(previous);
        return true;
    }

    function redo() {
        const next = historyFuture.pop();
        if (!next) return false;
        historyPast.push(cloneElements());
        restoreElements(next);
        return true;
    }

    function scaleElementToBounds(element, nextBounds) {
        const originalBounds = getElementBounds(element);
        const scaleX = nextBounds.width / Math.max(1, originalBounds.width);
        const scaleY = nextBounds.height / Math.max(1, originalBounds.height);
        const patch = {
            x: nextBounds.x,
            y: nextBounds.y,
            width: Math.max(1, nextBounds.width),
            height: Math.max(1, nextBounds.height),
        };
        if (Array.isArray(element.points)) {
            patch.points = element.points.map(([px, py]) => [
                (element.x + px - originalBounds.x) * scaleX,
                (element.y + py - originalBounds.y) * scaleY,
            ]);
        }
        return bumpElementVersion(element, patch);
    }

    function updateEraserSelection(endPoint) {
        if (!dragStartPoint) return;
        const box = buildDragBox(dragStartPoint, endPoint);
        eraserSelectionIds = new Set(
            elements
                .filter((element) => boxContainsElementContent(box, element))
                .map((element) => element.id),
        );
        scheduleRender();
    }

    function setActiveTool(tool) {
        activeTool = tool;
        eraserSelectionIds = new Set();
        if (tool !== "select" && selectedElementIds.size > 0) {
            selectedElementIds = new Set();
            selectedElementId = null;
            notifySelection();
        }
        canvasElement.style.cursor =
            tool === "select"
                ? "grab"
                : tool === "eraser"
                  ? "cell"
                  : "crosshair";
        toolCallback?.(tool);
        scheduleRender();
    }

    function selectOnlyElement(elementId) {
        selectedElementIds = elementId ? new Set([elementId]) : new Set();
        selectedElementId = elementId ?? null;
        notifySelection();
        scheduleRender();
    }

    function deleteSelectedElements() {
        if (selectedElementIds.size === 0) return false;
        const idsToDelete = new Set(selectedElementIds);
        commitElements(
            elements.filter((element) => !idsToDelete.has(element.id)),
        );
        selectedElementIds = new Set();
        selectedElementId = null;
        notifySelection();
        scheduleRender();
        return true;
    }

    function toggleElementSelection(elementId) {
        if (!elementId) return;
        selectedElementIds = new Set(selectedElementIds);
        if (selectedElementIds.has(elementId)) {
            selectedElementIds.delete(elementId);
        } else {
            selectedElementIds.add(elementId);
        }
        if (!selectedElementIds.has(selectedElementId)) {
            selectedElementId = elementId;
        }
        notifySelection();
        scheduleRender();
    }

    function commitCreatedElement(element) {
        commitElements([...elements, element]);
        selectOnlyElement(element.id);
        setActiveTool("select");
    }

    function updateTextElement(element, text) {
        const nextText = text.trim() || "Text";
        const fontSize = element.fontSize ?? 28;
        const width = Math.max(160, nextText.length * fontSize * 0.62);
        const height = Math.max(56, fontSize * 1.8);
        commitElements(
            elements.map((item) =>
                item.id === element.id
                    ? bumpElementVersion(item, {
                          text: nextText,
                          width,
                          height,
                      })
                    : item,
            ),
        );
        selectOnlyElement(element.id);
    }

    function openTextEditor(element) {
        const parent = canvasElement.parentElement;
        if (!parent) return;
        parent.querySelector(".wb-text-editor")?.remove();
        const editor = document.createElement("textarea");
        editor.className = "wb-text-editor";
        editor.value = element.text ?? "Text";
        editor.style.left = `${element.x}px`;
        editor.style.top = `${element.y}px`;
        editor.style.width = `${Math.max(180, element.width ?? 180)}px`;
        editor.style.height = `${Math.max(64, element.height ?? 64)}px`;
        editor.style.fontSize = `${element.fontSize ?? 28}px`;
        parent.appendChild(editor);
        editor.focus();
        editor.select();
        const finish = () => {
            if (!editor.isConnected) return;
            const value = editor.value;
            editor.remove();
            updateTextElement(element, value);
        };
        editor.addEventListener("blur", finish, { once: true });
        editor.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                editor.remove();
                selectOnlyElement(element.id);
            } else if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                finish();
            }
        });
    }

    function onPointerDown(event) {
        if (event.button === 1) {
            event.preventDefault();
            const parent = canvasElement.parentElement;
            if (!parent) return;
            canvasElement.setPointerCapture(event.pointerId);
            panState = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                scrollLeft: parent.scrollLeft,
                scrollTop: parent.scrollTop,
            };
            canvasElement.style.cursor = "grabbing";
            return;
        }
        if (event.button !== 0) return;
        event.preventDefault();
        canvasElement.setPointerCapture(event.pointerId);
        canvasElement.focus();
        isDrawing = true;
        if (activeTool !== "select" && selectedElementIds.size > 0) {
            selectedElementIds = new Set();
            selectedElementId = null;
            notifySelection();
        }
        const [x, y] = getCanvasPoint(event);
        dragStartPoint = [x, y];
        historySnapshot = cloneElements();
        if (activeTool === "select") {
            const selected = selectedElement();
            activeAnchorIndex = findAnchorAt(selected, x, y);
            const target =
                activeAnchorIndex >= 0 ? selected : findElementAt(x, y);
            if (event.shiftKey && target) {
                toggleElementSelection(target.id);
                isDrawing = false;
                return;
            }
            if (activeAnchorIndex >= 0 && selected) {
                selectDragMode = "resize";
                originalElement = {
                    ...selected,
                    points: selected.points?.map((point) => [...point]),
                };
            } else if (target) {
                if (!selectedElementIds.has(target.id))
                    selectOnlyElement(target.id);
                selectDragMode = "move";
                originalSelection = new Map(
                    elements
                        .filter((element) => selectedElementIds.has(element.id))
                        .map((element) => [
                            element.id,
                            {
                                ...element,
                                points: element.points?.map((point) => [
                                    ...point,
                                ]),
                            },
                        ]),
                );
            } else {
                selectOnlyElement(null);
                selectDragMode = "box";
                dragSelectBox = buildDragBox(dragStartPoint, [x, y]);
            }
            notifySelection();
            scheduleRender();
            return;
        }
        if (activeTool === "eraser") {
            currentPoints = [[x, y]];
            updateEraserSelection([x, y]);
            return;
        }
        if (activeTool === "text") {
            const existingText = findElementAt(x, y);
            if (existingText?.type === "text") {
                selectOnlyElement(existingText.id);
                openTextEditor(existingText);
                isDrawing = false;
                setActiveTool("select");
                return;
            }
            const element = buildTextElement([x, y], "Text", strokeColor);
            commitCreatedElement(element);
            openTextEditor(element);
            isDrawing = false;
            return;
        }
        currentPoints = [[x, y]];
        scheduleRender();
    }

    function onPointerMove(event) {
        if (panState?.pointerId === event.pointerId) {
            event.preventDefault();
            const parent = canvasElement.parentElement;
            if (!parent) return;
            parent.scrollLeft =
                panState.scrollLeft - (event.clientX - panState.startX);
            parent.scrollTop =
                panState.scrollTop - (event.clientY - panState.startY);
            return;
        }
        if (isDrawing) event.preventDefault();
        const [x, y] = getCanvasPoint(event);
        if (!isDrawing) {
            if (activeTool === "select") {
                const anchorIndex = findAnchorAt(selectedElement(), x, y);
                canvasElement.style.cursor =
                    anchorIndex >= 0 ? "pointer" : "grab";
            }
            return;
        }
        if (activeTool === "select" && dragStartPoint) {
            const dx = x - dragStartPoint[0];
            const dy = y - dragStartPoint[1];
            if (selectDragMode === "box") {
                dragSelectBox = buildDragBox(dragStartPoint, [x, y]);
                selectedElementIds = new Set(
                    elements
                        .filter((element) =>
                            boxContainsElementContent(dragSelectBox, element),
                        )
                        .map((element) => element.id),
                );
                notifySelection();
                scheduleRender();
                return;
            }
            if (selectDragMode === "move" && originalSelection.size > 0) {
                elements = elements.map((element) => {
                    const original = originalSelection.get(element.id);
                    if (!original) return element;
                    return bumpElementVersion(element, {
                        x: original.x + dx,
                        y: original.y + dy,
                    });
                });
                scheduleRender();
                return;
            }
            if (
                selectDragMode === "resize" &&
                selectedElementId &&
                originalElement &&
                activeAnchorIndex >= 0
            ) {
                elements = elements.map((element) => {
                    if (element.id !== selectedElementId) return element;
                    if (element.type === "line" || element.type === "arrow") {
                        const points = (originalElement.points ?? []).map(
                            (point) => [...point],
                        );
                        points[activeAnchorIndex] = [
                            (points[activeAnchorIndex]?.[0] ?? 0) + dx,
                            (points[activeAnchorIndex]?.[1] ?? 0) + dy,
                        ];
                        const absolutePoints = points.map(([px, py]) => [
                            originalElement.x + px,
                            originalElement.y + py,
                        ]);
                        const minX = Math.min(
                            ...absolutePoints.map(([px]) => px),
                        );
                        const minY = Math.min(
                            ...absolutePoints.map(([, py]) => py),
                        );
                        const maxX = Math.max(
                            ...absolutePoints.map(([px]) => px),
                        );
                        const maxY = Math.max(
                            ...absolutePoints.map(([, py]) => py),
                        );
                        return bumpElementVersion(element, {
                            x: minX,
                            y: minY,
                            width: Math.max(1, maxX - minX),
                            height: Math.max(1, maxY - minY),
                            points: absolutePoints.map(([px, py]) => [
                                px - minX,
                                py - minY,
                            ]),
                        });
                    }
                    const leftAnchors = new Set([0, 3]);
                    const topAnchors = new Set([0, 1]);
                    const right = originalElement.x + originalElement.width;
                    const bottom = originalElement.y + originalElement.height;
                    const nextX = leftAnchors.has(activeAnchorIndex)
                        ? originalElement.x + dx
                        : originalElement.x;
                    const nextY = topAnchors.has(activeAnchorIndex)
                        ? originalElement.y + dy
                        : originalElement.y;
                    const nextRight = leftAnchors.has(activeAnchorIndex)
                        ? right
                        : right + dx;
                    const nextBottom = topAnchors.has(activeAnchorIndex)
                        ? bottom
                        : bottom + dy;
                    return scaleElementToBounds(element, {
                        x: Math.min(nextX, nextRight),
                        y: Math.min(nextY, nextBottom),
                        width: Math.max(1, Math.abs(nextRight - nextX)),
                        height: Math.max(1, Math.abs(nextBottom - nextY)),
                    });
                });
                scheduleRender();
                return;
            }
        }
        if (activeTool === "eraser") {
            currentPoints.push([x, y]);
            updateEraserSelection([x, y]);
            return;
        }
        currentPoints.push([x, y]);
        scheduleRender();
    }

    function onPointerUp(event) {
        if (panState && (!event || panState.pointerId === event.pointerId)) {
            panState = null;
            canvasElement.style.cursor =
                activeTool === "select"
                    ? "grab"
                    : activeTool === "eraser"
                      ? "cell"
                      : "crosshair";
            return;
        }
        if (!isDrawing) return;
        isDrawing = false;
        if (activeTool === "select") {
            if (selectDragMode) {
                historyPast.push(historySnapshot ?? cloneElements());
                historyPast = historyPast.slice(-100);
                historyFuture = [];
                updateCanvasOverflow();
                changeCallback?.([...elements]);
            }
        } else if (activeTool === "eraser") {
            if (eraserSelectionIds.size > 0) {
                commitElements(
                    elements.filter(
                        (element) => !eraserSelectionIds.has(element.id),
                    ),
                );
                selectedElementIds = new Set();
                selectedElementId = null;
                notifySelection();
            }
        } else if (activeTool === "pen" && currentPoints.length >= 2) {
            const element = buildFreedrawElement(
                currentPoints,
                strokeColor,
                strokeWidth,
            );
            if (element) commitCreatedElement(element);
        } else if (
            ["rectangle", "diamond", "ellipse", "line", "arrow"].includes(
                activeTool,
            ) &&
            dragStartPoint &&
            currentPoints.length >= 1
        ) {
            commitCreatedElement(
                buildShapeElement(
                    activeTool,
                    dragStartPoint,
                    currentPoints.at(-1),
                    strokeColor,
                    strokeWidth,
                ),
            );
        }
        currentPoints = [];
        dragStartPoint = null;
        originalElement = null;
        originalSelection = new Map();
        activeAnchorIndex = null;
        historySnapshot = null;
        eraserSelectionIds = new Set();
        dragSelectBox = null;
        selectDragMode = null;
        scheduleRender();
    }

    function onDoubleClick(event) {
        const [x, y] = getCanvasPoint(event);
        const element = findElementAt(x, y);
        if (activeTool === "select" && element?.type === "text") {
            selectOnlyElement(element.id);
            openTextEditor(element);
        }
    }

    function onKeyDown(event) {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        if (deleteSelectedElements()) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function calculateImageDimensions(image) {
        const maxWidth = 480;
        const maxHeight = 360;
        const naturalWidth = Math.max(
            1,
            image.naturalWidth || image.width || 240,
        );
        const naturalHeight = Math.max(
            1,
            image.naturalHeight || image.height || 180,
        );
        const scale = Math.min(
            1,
            maxWidth / naturalWidth,
            maxHeight / naturalHeight,
        );
        return {
            width: Math.round(naturalWidth * scale),
            height: Math.round(naturalHeight * scale),
        };
    }

    function createImageElementFromDataUrl(dataUrl) {
        const image = new Image();
        image.addEventListener(
            "load",
            () => {
                commitCreatedElement(
                    buildImageElement(
                        [24, 24],
                        dataUrl,
                        calculateImageDimensions(image),
                    ),
                );
            },
            { once: true },
        );
        image.addEventListener(
            "error",
            () => {
                commitCreatedElement(buildImageElement([24, 24], dataUrl));
            },
            { once: true },
        );
        image.src = dataUrl;
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
            createImageElementFromDataUrl(reader.result);
        });
        reader.readAsDataURL(imageFile);
    }

    canvasElement.addEventListener("pointerdown", onPointerDown);
    canvasElement.addEventListener("pointermove", onPointerMove);
    canvasElement.addEventListener("pointerup", onPointerUp);
    canvasElement.addEventListener("pointercancel", onPointerUp);
    canvasElement.addEventListener("paste", onPaste);
    canvasElement.addEventListener("keydown", onKeyDown);
    canvasElement.addEventListener("whiteboard:image-loaded", scheduleRender);
    canvasElement.addEventListener("dblclick", onDoubleClick);
    canvasElement.addEventListener("auxclick", (event) => {
        if (event.button === 1) event.preventDefault();
    });
    canvasElement.addEventListener("contextmenu", (event) => {
        if (panState) event.preventDefault();
    });

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvasElement.parentElement ?? document.body);
    const themeObserver = new MutationObserver(scheduleRender);
    themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
    });
    resizeCanvas();

    return {
        setTool(tool) {
            setActiveTool(tool);
        },
        setStrokeColor(color) {
            strokeColor = color;
            if (selectedElementId) {
                commitElements(
                    elements.map((element) =>
                        element.id === selectedElementId
                            ? bumpElementVersion(element, {
                                  strokeColor: color,
                              })
                            : element,
                    ),
                );
                notifySelection();
            }
        },
        setStrokeWidth(width) {
            strokeWidth = Number(width);
            if (
                selectedElementId &&
                isStrokeWidthApplicable(selectedElement())
            ) {
                commitElements(
                    elements.map((element) =>
                        element.id === selectedElementId
                            ? bumpElementVersion(element, { strokeWidth })
                            : element,
                    ),
                );
                notifySelection();
            }
        },
        setImageUploadMaxBytes(maxBytes) {
            imageUploadMaxBytes = Number(maxBytes);
        },
        getElements() {
            return [...elements];
        },
        applyElements(remoteElements, { replace = false } = {}) {
            if (replace) {
                elements = cloneElements(remoteElements);
                updateCanvasOverflow();
                selectedElementIds = new Set(
                    [...selectedElementIds].filter((id) =>
                        elements.some((element) => element.id === id),
                    ),
                );
                if (selectedElementId && !selectedElement())
                    selectedElementId = null;
                notifySelection();
                scheduleRender();
                return;
            }
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
            updateCanvasOverflow();
            const currentIds = new Set(elements.map((element) => element.id));
            selectedElementIds = new Set(
                [...selectedElementIds].filter((id) => currentIds.has(id)),
            );
            if (selectedElementId && !selectedElement())
                selectedElementId = null;
            notifySelection();
            scheduleRender();
        },
        clearAll() {
            if (elements.length > 0) {
                historyPast.push(cloneElements());
                historyPast = historyPast.slice(-100);
                historyFuture = [];
            }
            elements = [];
            currentPoints = [];
            eraserSelectionIds = new Set();
            selectedElementIds = new Set();
            scheduleRender();
            selectedElementId = null;
            notifySelection();
            changeCallback?.([]);
        },
        onSelectionChange(callback) {
            selectionCallback = callback;
            notifySelection();
        },
        onToolChange(callback) {
            toolCallback = callback;
            toolCallback?.(activeTool);
        },
        onChange(callback) {
            changeCallback = callback;
        },
        undo,
        redo,
        destroy() {
            resizeObserver.disconnect();
            themeObserver.disconnect();
            canvasElement.removeEventListener("pointerdown", onPointerDown);
            canvasElement.removeEventListener("pointermove", onPointerMove);
            canvasElement.removeEventListener("pointerup", onPointerUp);
            canvasElement.removeEventListener("pointercancel", onPointerUp);
            canvasElement.removeEventListener("paste", onPaste);
            canvasElement.removeEventListener("keydown", onKeyDown);
            canvasElement.removeEventListener(
                "whiteboard:image-loaded",
                scheduleRender,
            );
            canvasElement.removeEventListener("dblclick", onDoubleClick);
            canvasElement.parentElement
                ?.querySelector(".wb-text-editor")
                ?.remove();
        },
    };
}
