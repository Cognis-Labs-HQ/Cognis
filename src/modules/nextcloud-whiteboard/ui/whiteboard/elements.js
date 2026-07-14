export const SESSION_VERSION_NONCE_MAX = 2 ** 31;

function generateElementId() {
    return typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

function randomNonce() {
    return Math.floor(Math.random() * SESSION_VERSION_NONCE_MAX);
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
        },
    );
}

export function buildImageElement(point, dataUrl) {
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

function resolvedStrokeColor(context, element) {
    return element.strokeColor === "auto"
        ? getComputedStyle(context.canvas)
              .getPropertyValue("--wb-auto-stroke")
              .trim() || "#111827"
        : (element.strokeColor ?? "#000000");
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
