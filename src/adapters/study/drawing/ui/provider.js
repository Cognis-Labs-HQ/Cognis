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

function guidedStrokePoints(points, extent) {
    const visibleCount = Math.max(2, Math.ceil(points.length * extent));
    return points.slice(0, visibleCount);
}

function playSuccessSound() {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
        0.16,
        audioContext.currentTime + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.42,
    );
    gain.connect(audioContext.destination);
    [659.25, 783.99].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const startsAt = audioContext.currentTime + index * 0.11;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, startsAt);
        oscillator.connect(gain);
        oscillator.start(startsAt);
        oscillator.stop(startsAt + 0.28);
    });
    window.setTimeout(() => void audioContext.close(), 600);
}

function openDrawingPad({ card, definition = "", strokePattern }) {
    if (!card?.id || !strokePattern?.strokes?.length)
        throw new Error("drawing_card_required");
    const makeFloatingWindow = uiCtx.capabilities.get("ui:makeFloatingWindow");
    if (!makeFloatingWindow) throw new Error("floating_window_unavailable");
    const controller = new AbortController();
    const pad = document.createElement("section");
    pad.className = "study-drawing-pad";
    pad.innerHTML = `<header><span class="study-drawing-heading"><strong></strong><span data-definition></span></span><button class="btn-cancel" type="button" data-close>×</button></header><canvas></canvas><div class="study-drawing-controls"><button class="btn-cancel" type="button" data-reset>${i18n.t("adapter.study.drawing.reset")}</button></div>`;
    pad.querySelector("strong").textContent = card.label;
    pad.querySelector("[data-definition]").textContent = definition;
    document.body.append(pad);
    const canvas = pad.querySelector("canvas");
    const context = canvas.getContext("2d");
    const completed = [];
    let active = null;
    let guidanceExtent = 1;
    const animateResult = (className) => {
        pad.classList.remove("is-error", "is-success");
        void pad.offsetWidth;
        pad.classList.add(className);
        window.setTimeout(() => pad.classList.remove(className), 520);
    };
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
        const expected = strokePattern.strokes[completed.length];
        if (expected)
            drawPath(
                guidedStrokePoints(expected.points, guidanceExtent),
                guide,
                5,
            );
        completed.forEach((stroke) => drawPath(stroke, ink, 5));
        if (active) drawPath(active, activeInk, 5);
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
            if (score >= (strokePattern.tolerance ?? 55)) {
                completed.push(active);
                guidanceExtent = Math.max(0.25, guidanceExtent - 0.18);
                if (completed.length === strokePattern.strokes.length) {
                    animateResult("is-success");
                    playSuccessSound();
                }
            } else {
                guidanceExtent = Math.min(1, guidanceExtent + 0.25);
                animateResult("is-error");
            }
            active = null;
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
        minWidth: 320,
        minHeight: 480,
        width: "min(92vw, 30rem)",
        height: "min(88vh, 38rem)",
    });
    const observer = new ResizeObserver(resize);
    let closing = false;
    let closed = false;
    const finishClose = () => {
        if (closed) return;
        closed = true;
        controller.abort();
        observer.disconnect();
        release?.();
        pad.remove();
    };
    const close = () => {
        if (closing) return;
        closing = true;
        pad.classList.add("is-closing");
        pad.addEventListener(
            "animationend",
            (event) => {
                if (event.animationName === "drawing-pad-close") finishClose();
            },
            { signal: controller.signal },
        );
        window.setTimeout(finishClose, 220);
    };
    pad.querySelector("[data-close]").addEventListener("click", close, {
        signal: controller.signal,
    });
    observer.observe(canvas);
    resize();
    return { close };
}

uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad);
