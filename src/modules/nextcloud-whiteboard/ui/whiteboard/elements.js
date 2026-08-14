export const SESSION_VERSION_NONCE_MAX = 2 ** 31;

const imageElementCache = new Map();

function generateElementId() {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `element-${randomNonce().toString(36)}-${randomNonce().toString(36)}`;
}

function randomNonce() {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % SESSION_VERSION_NONCE_MAX;
}

export function bumpElementVersion(element, patch = {}) {
    return {
        ...element,
        ...patch,
        version: (element.version ?? 1) + 1,
        versionNonce: randomNonce(),
    };
}

export function buildFreedrawElement(
    points,
    strokeColor = "auto",
    strokeWidth,
) {
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

export function buildShapeElement(
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

export function buildTextElement(point, text, strokeColor) {
    return buildShapeElement(
        "text",
        point,
        [point[0] + 240, point[1] + 72],
        strokeColor,
        1,
        {
            text,
            fontSize: 28,
            fontFamily: "sans-serif",
            fontWeight: "400",
            fontStyle: "normal",
            textDecoration: "none",
        },
    );
}

export function buildImageElement(point, dataUrl, dimensions = {}) {
    const width = Math.max(1, Number(dimensions.width) || 240);
    const height = Math.max(1, Number(dimensions.height) || 180);
    return buildShapeElement(
        "image",
        point,
        [point[0] + width, point[1] + height],
        "#000000",
        1,
        {
            dataUrl,
        },
    );
}

function resolvedStrokeColor(context, element) {
    const strokeColor =
        element.strokeColor === "auto"
            ? getComputedStyle(context.canvas)
                  .getPropertyValue("--whiteboard-auto-stroke")
                  .trim() || "#111827"
            : (element.strokeColor ?? "#000000");
    const canvasColor =
        getComputedStyle(context.canvas)
            .getPropertyValue("--whiteboard-canvas-bg")
            .trim() || "#ffffff";
    return ensureVisibleStrokeColor(strokeColor, canvasColor);
}

function ensureVisibleStrokeColor(strokeColor, canvasColor) {
    const stroke = parseHexColor(strokeColor);
    const canvas = parseHexColor(canvasColor);
    if (!stroke || !canvas) return strokeColor;
    const contrast = contrastRatio(stroke, canvas);
    if (contrast >= 3) return strokeColor;
    return relativeLuminance(canvas) > 0.5 ? "#0f172a" : "#f8fafc";
}

function parseHexColor(value) {
    const match = String(value ?? "").match(/^#([a-f\d]{6})$/i);
    if (!match) return null;
    const valueNumber = Number.parseInt(match[1], 16);
    return [valueNumber >> 16, (valueNumber >> 8) & 255, valueNumber & 255];
}

function relativeLuminance(color) {
    const channels = color.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(left, right) {
    const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
    const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
    return (lighter + 0.05) / (darker + 0.05);
}
function renderFreedraw(context, element) {
    const rawPoints = element.points ?? [];
    if (rawPoints.length < 2) return;
    context.save();
    context.strokeStyle = resolvedStrokeColor(context, element);
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
    context.strokeStyle = resolvedStrokeColor(context, element);
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
    context.strokeStyle = resolvedStrokeColor(context, element);
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
    context.strokeStyle = resolvedStrokeColor(context, element);
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
    context.fillStyle = resolvedStrokeColor(context, element);
    const fontSize = element.fontSize ?? 16;
    const fontStyle = element.fontStyle === "italic" ? "italic" : "normal";
    const fontWeight = element.fontWeight === "700" ? "700" : "400";
    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${element.fontFamily ?? "sans-serif"}`;
    context.globalAlpha = (element.opacity ?? 100) / 100;
    const baselineY = element.y + fontSize;
    context.fillText(element.text, element.x, baselineY);
    const metrics = context.measureText(element.text);
    const decoration = String(element.textDecoration ?? "none");
    if (decoration.includes("underline")) {
        context.fillRect(element.x, baselineY + 3, metrics.width, 2);
    }
    if (decoration.includes("line-through")) {
        context.fillRect(
            element.x,
            element.y + fontSize * 0.55,
            metrics.width,
            2,
        );
    }
    context.restore();
}

function renderImage(context, element) {
    if (!element.dataUrl) return;
    const cachedImage = imageElementCache.get(element.dataUrl);
    if (cachedImage?.complete && cachedImage.naturalWidth > 0) {
        context.drawImage(
            cachedImage,
            element.x,
            element.y,
            element.width,
            element.height,
        );
        return;
    }
    if (cachedImage) return;
    const image = new Image();
    imageElementCache.set(element.dataUrl, image);
    image.onload = () => {
        context.drawImage(
            image,
            element.x,
            element.y,
            element.width,
            element.height,
        );
        context.canvas.dispatchEvent(
            new CustomEvent("whiteboard:image-loaded"),
        );
    };
    image.onerror = () => imageElementCache.delete(element.dataUrl);
    image.src = element.dataUrl;
}

export function getElementBounds(element) {
    if (element.type === "line" || element.type === "arrow") {
        const points = element.points ?? [
            [0, 0],
            [element.width ?? 1, element.height ?? 1],
        ];
        const xs = points.map(([px]) => element.x + px);
        const ys = points.map(([, py]) => element.y + py);
        return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(1, Math.max(...xs) - Math.min(...xs)),
            height: Math.max(1, Math.max(...ys) - Math.min(...ys)),
        };
    }
    return {
        x: element.x,
        y: element.y,
        width: element.width ?? 1,
        height: element.height ?? 1,
    };
}

export function boxContains(container, item) {
    return (
        item.x >= container.x &&
        item.y >= container.y &&
        item.x + item.width <= container.x + container.width &&
        item.y + item.height <= container.y + container.height
    );
}

export function buildDragBox(startPoint, endPoint) {
    const [startX, startY] = startPoint;
    const [endX, endY] = endPoint;
    return {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY),
    };
}
function distanceToSegment(pointX, pointY, startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    if (dx === 0 && dy === 0)
        return Math.hypot(pointX - startX, pointY - startY);
    const t = Math.max(
        0,
        Math.min(
            1,
            ((pointX - startX) * dx + (pointY - startY) * dy) /
                (dx * dx + dy * dy),
        ),
    );
    return Math.hypot(pointX - (startX + t * dx), pointY - (startY + t * dy));
}

function elementContentPoints(element) {
    if (Array.isArray(element.points) && element.points.length > 0) {
        return element.points.map(([px, py]) => [
            element.x + px,
            element.y + py,
        ]);
    }
    switch (element.type) {
        case "rectangle":
        case "image":
        case "text":
            return [
                [element.x, element.y],
                [element.x + (element.width ?? 1), element.y],
                [
                    element.x + (element.width ?? 1),
                    element.y + (element.height ?? 1),
                ],
                [element.x, element.y + (element.height ?? 1)],
            ];
        case "diamond":
            return [
                [element.x + (element.width ?? 1) / 2, element.y],
                [
                    element.x + (element.width ?? 1),
                    element.y + (element.height ?? 1) / 2,
                ],
                [
                    element.x + (element.width ?? 1) / 2,
                    element.y + (element.height ?? 1),
                ],
                [element.x, element.y + (element.height ?? 1) / 2],
            ];
        case "ellipse": {
            const cx = element.x + (element.width ?? 1) / 2;
            const cy = element.y + (element.height ?? 1) / 2;
            const rx = Math.abs((element.width ?? 1) / 2);
            const ry = Math.abs((element.height ?? 1) / 2);
            return Array.from({ length: 16 }, (_, index) => {
                const angle = (Math.PI * 2 * index) / 16;
                return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
            });
        }
        default:
            return [[element.x, element.y]];
    }
}

export function boxContainsElementContent(container, element) {
    return elementContentPoints(element).every(
        ([x, y]) =>
            x >= container.x &&
            y >= container.y &&
            x <= container.x + container.width &&
            y <= container.y + container.height,
    );
}

export function elementContainsPoint(element, x, y) {
    const tolerance = Math.max(8, (element.strokeWidth ?? 2) + 4);
    const points = elementContentPoints(element);
    if (["freedraw", "line", "arrow"].includes(element.type)) {
        return points.some((point, index) => {
            if (index === 0) return false;
            const previous = points[index - 1];
            return (
                distanceToSegment(
                    x,
                    y,
                    previous[0],
                    previous[1],
                    point[0],
                    point[1],
                ) <= tolerance
            );
        });
    }
    if (element.type === "rectangle" || element.type === "image") {
        const left = element.x;
        const top = element.y;
        const right = element.x + (element.width ?? 1);
        const bottom = element.y + (element.height ?? 1);
        if (element.type === "image")
            return x >= left && x <= right && y >= top && y <= bottom;
        return (
            x >= left - tolerance &&
            x <= right + tolerance &&
            y >= top - tolerance &&
            y <= bottom + tolerance &&
            (Math.abs(x - left) <= tolerance ||
                Math.abs(x - right) <= tolerance ||
                Math.abs(y - top) <= tolerance ||
                Math.abs(y - bottom) <= tolerance)
        );
    }
    if (element.type === "text") {
        const bounds = getElementBounds(element);
        return (
            x >= bounds.x &&
            x <= bounds.x + bounds.width &&
            y >= bounds.y &&
            y <= bounds.y + bounds.height
        );
    }
    return points.some((point, index) => {
        const next = points[(index + 1) % points.length];
        return (
            distanceToSegment(x, y, point[0], point[1], next[0], next[1]) <=
            tolerance
        );
    });
}

export function drawAnchor(context, x, y) {
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

export function getElementAnchorPoints(element) {
    if (element.type === "line" || element.type === "arrow") {
        const points = element.points ?? [
            [0, 0],
            [element.width ?? 1, element.height ?? 1],
        ];
        return points
            .slice(0, 2)
            .map(([px, py]) => [element.x + px, element.y + py]);
    }
    return [
        [element.x, element.y],
        [element.x + (element.width ?? 1), element.y],
        [element.x + (element.width ?? 1), element.y + (element.height ?? 1)],
        [element.x, element.y + (element.height ?? 1)],
    ];
}

export function isStrokeWidthApplicable(element) {
    return Boolean(
        element &&
        [
            "freedraw",
            "rectangle",
            "diamond",
            "ellipse",
            "line",
            "arrow",
        ].includes(element.type),
    );
}

function renderLine(context, element) {
    const rawPoints = element.points ?? [];
    if (rawPoints.length < 2) return;
    context.save();
    context.strokeStyle = resolvedStrokeColor(context, element);
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

export function renderElement(context, element) {
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
