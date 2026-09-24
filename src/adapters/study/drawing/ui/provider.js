import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/adapters/study/drawing/languages"],
});
const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "/static/adapters/study/drawing/drawing.css";
document.head.append(stylesheet);

function pointDistance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
}

function scoreStroke(input, expected) {
    if (input.length < 2 || expected.length < 2) return 0;
    const distance = input.reduce(
        (sum, point) =>
            sum +
            Math.min(...expected.map((target) => pointDistance(point, target))),
        0,
    );
    const direction =
        pointDistance(input[0], expected[0]) <=
        pointDistance(input[0], expected.at(-1));
    return (
        Math.max(0, Math.round(100 - (distance / input.length) * 150)) *
        (direction ? 1 : 0.5)
    );
}

function openDrawingPad({ card, strokePattern }) {
    if (!card?.id || !strokePattern?.strokes?.length)
        throw new Error("drawing_card_required");
    const makeFloatingWindow = uiCtx.capabilities.get("ui:makeFloatingWindow");
    if (!makeFloatingWindow) throw new Error("floating_window_unavailable");
    const controller = new AbortController();
    const pad = document.createElement("section");
    pad.className = "study-drawing-pad";
    pad.innerHTML = `<header><strong></strong><button class="btn-cancel" type="button" data-close>×</button></header><canvas></canvas><div class="study-drawing-controls"><label>${i18n.t("adapter.study.drawing.guidance")} <input type="range" min="0" max="3" value="2" data-guidance></label><button class="btn-neutral" type="button" data-undo>${i18n.t("adapter.study.drawing.undo")}</button><button class="btn-cancel" type="button" data-reset>${i18n.t("adapter.study.drawing.reset")}</button><progress class="study-drawing-progress" max="100" value="0"></progress><output></output></div>`;
    pad.querySelector("strong").textContent = card.label;
    document.body.append(pad);
    const canvas = pad.querySelector("canvas");
    const context = canvas.getContext("2d");
    const progress = pad.querySelector("progress");
    const output = pad.querySelector("output");
    const completed = [];
    let active = null;
    const resize = () => {
        const size = Math.max(
            280,
            Math.round(canvas.getBoundingClientRect().width),
        );
        canvas.width = size;
        canvas.height = size;
        draw();
    };
    const normalized = (event) => {
        const bounds = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - bounds.left) / bounds.width,
            y: (event.clientY - bounds.top) / bounds.height,
            pressure: event.pressure || 0.5,
        };
    };
    const path = (points, color, width = 3) => {
        if (!points.length) return;
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
        points
            .slice(1)
            .forEach((point) =>
                context.lineTo(point.x * canvas.width, point.y * canvas.height),
            );
        context.stroke();
    };
    const draw = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        const guidance = Number(pad.querySelector("[data-guidance]").value);
        strokePattern.strokes.forEach((stroke, index) => {
            if (
                guidance === 3 ||
                (guidance === 2 && index === completed.length) ||
                (guidance === 1 && index === 0)
            )
                path(stroke.points, "#c8cdd8", 5);
        });
        completed.forEach((stroke) => path(stroke, "#172033", 5));
        if (active) path(active, "#0b8f75", 5);
        progress.value =
            (completed.length / strokePattern.strokes.length) * 100;
        output.textContent = `${completed.length}/${strokePattern.strokes.length}`;
    };
    canvas.addEventListener(
        "pointerdown",
        (event) => {
            active = [normalized(event)];
            canvas.setPointerCapture(event.pointerId);
            draw();
        },
        { signal: controller.signal },
    );
    canvas.addEventListener(
        "pointermove",
        (event) => {
            if (active) {
                active.push(normalized(event));
                draw();
            }
        },
        { signal: controller.signal },
    );
    canvas.addEventListener(
        "pointerup",
        (event) => {
            if (!active) return;
            active.push(normalized(event));
            const expected =
                strokePattern.strokes[completed.length]?.points ?? [];
            const score = scoreStroke(active, expected);
            if (score >= (strokePattern.tolerance ?? 55))
                completed.push(active);
            active = null;
            output.textContent = score
                ? `${Math.round(score)}%`
                : output.textContent;
            draw();
        },
        { signal: controller.signal },
    );
    pad.querySelector("[data-guidance]").addEventListener("input", draw, {
        signal: controller.signal,
    });
    pad.querySelector("[data-undo]").addEventListener(
        "click",
        () => {
            completed.pop();
            draw();
        },
        { signal: controller.signal },
    );
    pad.querySelector("[data-reset]").addEventListener(
        "click",
        () => {
            completed.length = 0;
            draw();
        },
        { signal: controller.signal },
    );
    const release = makeFloatingWindow(pad, {
        handle: pad.querySelector("header"),
        signal: controller.signal,
        minSize: { width: 300, height: 360 },
    });
    const close = () => {
        controller.abort();
        observer.disconnect();
        release?.();
        pad.remove();
    };
    pad.querySelector("[data-close]").addEventListener("click", close, {
        signal: controller.signal,
    });
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return {
        close,
        reset: () => {
            completed.length = 0;
            draw();
        },
    };
}

uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad);
