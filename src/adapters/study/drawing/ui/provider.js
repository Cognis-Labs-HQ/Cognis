import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/adapters/study/drawing/languages"],
});
const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "/static/adapters/study/drawing/drawing.css";
document.head.append(stylesheet);

function distance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
}

function pathLength(points) {
    return points
        .slice(1)
        .reduce(
            (total, point, index) => total + distance(points[index], point),
            0,
        );
}

function resample(points, count = 48) {
    if (points.length < 2) return points;
    const total = pathLength(points);
    if (!total) return Array.from({ length: count }, () => points[0]);
    const result = [points[0]];
    let segment = 1;
    let traversed = 0;
    for (let sample = 1; sample < count - 1; sample += 1) {
        const target = (total * sample) / (count - 1);
        while (
            segment < points.length &&
            traversed + distance(points[segment - 1], points[segment]) < target
        ) {
            traversed += distance(points[segment - 1], points[segment]);
            segment += 1;
        }
        const end = points[Math.min(segment, points.length - 1)];
        const start = points[Math.max(0, segment - 1)];
        const length = Math.max(distance(start, end), Number.EPSILON);
        const ratio = Math.min(1, (target - traversed) / length);
        result.push({
            x: start.x + (end.x - start.x) * ratio,
            y: start.y + (end.y - start.y) * ratio,
        });
    }
    result.push(points.at(-1));
    return result;
}

function scoreStroke(input, expected) {
    if (input.length < 2 || expected.length < 2) return 0;
    const sampledInput = resample(input);
    const sampledExpected = resample(expected);
    const rootMeanSquare = Math.sqrt(
        sampledInput.reduce(
            (sum, point, index) =>
                sum + distance(point, sampledExpected[index]) ** 2,
            0,
        ) / sampledInput.length,
    );
    const endpointError =
        distance(sampledInput[0], sampledExpected[0]) +
        distance(sampledInput.at(-1), sampledExpected.at(-1));
    const lengthRatio = Math.abs(
        Math.log(
            Math.max(pathLength(input), Number.EPSILON) /
                Math.max(pathLength(expected), Number.EPSILON),
        ),
    );
    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                100 -
                    rootMeanSquare * 180 -
                    endpointError * 45 -
                    lengthRatio * 18,
            ),
        ),
    );
}

function guidanceLevel(attempts, accepted, difficulty) {
    const successRate = attempts ? accepted / attempts : 0.5;
    const performanceLevel =
        successRate < 0.45
            ? 3
            : successRate < 0.7
              ? 2
              : successRate < 0.9
                ? 1
                : 0;
    return Math.max(0, Math.min(3, performanceLevel + difficulty));
}

function openDrawingPad({ card, strokePattern }) {
    if (!card?.id || !strokePattern?.strokes?.length)
        throw new Error("drawing_card_required");
    const makeFloatingWindow = uiCtx.capabilities.get("ui:makeFloatingWindow");
    if (!makeFloatingWindow) throw new Error("floating_window_unavailable");
    const controller = new AbortController();
    const pad = document.createElement("section");
    pad.className = "study-drawing-pad";
    pad.innerHTML = `<header><strong></strong><button class="btn-cancel" type="button" data-close>×</button></header><canvas></canvas><div class="study-drawing-controls"><span>${i18n.t("adapter.study.drawing.guidance")}: <output data-guidance></output></span><button class="btn-neutral" type="button" data-undo>${i18n.t("adapter.study.drawing.undo")}</button><button class="btn-cancel" type="button" data-reset>${i18n.t("adapter.study.drawing.reset")}</button><progress class="study-drawing-progress" max="100" value="0"></progress><output data-progress></output><div class="study-drawing-feedback" data-feedback hidden><button class="btn-neutral" type="button" data-difficulty="-1">${i18n.t("adapter.study.drawing.easy")}</button><button class="btn-neutral" type="button" data-difficulty="1">${i18n.t("adapter.study.drawing.hard")}</button></div></div>`;
    pad.querySelector("strong").textContent = card.label;
    document.body.append(pad);
    const canvas = pad.querySelector("canvas");
    const context = canvas.getContext("2d");
    const progress = pad.querySelector("progress");
    const progressOutput = pad.querySelector("[data-progress]");
    const guidanceOutput = pad.querySelector("[data-guidance]");
    const feedback = pad.querySelector("[data-feedback]");
    const completed = [];
    let active = null;
    let attempts = 0;
    let accepted = 0;
    let difficulty = 0;
    const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        canvas.width = Math.max(240, Math.round(bounds.width));
        canvas.height = Math.max(240, Math.round(bounds.height));
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
    const drawPath = (points, color, width = 3) => {
        if (!points.length) return;
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
        for (let index = 1; index < points.length - 1; index += 1) {
            const point = points[index];
            const next = points[index + 1];
            context.quadraticCurveTo(
                point.x * canvas.width,
                point.y * canvas.height,
                ((point.x + next.x) / 2) * canvas.width,
                ((point.y + next.y) / 2) * canvas.height,
            );
        }
        const last = points.at(-1);
        context.lineTo(last.x * canvas.width, last.y * canvas.height);
        context.stroke();
    };
    const draw = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        const styles = getComputedStyle(pad);
        const guide = styles.getPropertyValue("--drawing-guide").trim();
        const ink = styles.getPropertyValue("--drawing-ink").trim();
        const activeInk = styles.getPropertyValue("--drawing-active").trim();
        const guidance = guidanceLevel(attempts, accepted, difficulty);
        guidanceOutput.textContent = String(guidance);
        strokePattern.strokes.forEach((stroke, index) => {
            if (
                guidance === 3 ||
                (guidance === 2 && index === completed.length) ||
                (guidance === 1 && index === 0)
            )
                drawPath(stroke.points, guide, 5);
        });
        completed.forEach((stroke) => drawPath(stroke, ink, 5));
        if (active) drawPath(active, activeInk, 5);
        progress.value =
            (completed.length / strokePattern.strokes.length) * 100;
        progressOutput.textContent = `${completed.length}/${strokePattern.strokes.length}`;
        feedback.hidden = completed.length !== strokePattern.strokes.length;
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
            attempts += 1;
            const expected =
                strokePattern.strokes[completed.length]?.points ?? [];
            const score = scoreStroke(active, expected);
            if (score >= (strokePattern.tolerance ?? 55)) {
                completed.push(active);
                accepted += 1;
            }
            active = null;
            progressOutput.textContent = `${Math.round(score)}%`;
            draw();
        },
        { signal: controller.signal },
    );
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
    feedback.addEventListener(
        "click",
        (event) => {
            const value = Number(
                event.target.closest("[data-difficulty]")?.dataset.difficulty,
            );
            if (!Number.isFinite(value)) return;
            difficulty = value;
            completed.length = 0;
            draw();
        },
        { signal: controller.signal },
    );
    const release = makeFloatingWindow(pad, {
        handle: pad.querySelector("header"),
        signal: controller.signal,
        minWidth: 320,
        minHeight: 480,
        width: "min(92vw, 30rem)",
        height: "min(88vh, 38rem)",
    });
    const observer = new ResizeObserver(resize);
    const close = () => {
        controller.abort();
        observer.disconnect();
        release?.();
        pad.remove();
    };
    pad.querySelector("[data-close]").addEventListener("click", close, {
        signal: controller.signal,
    });
    observer.observe(canvas);
    resize();
    return { close };
}

uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad);
