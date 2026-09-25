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
    pad.className = "study-drawing-pad is-opening";
    pad.innerHTML = `<header><span class="study-drawing-heading"><strong></strong><span data-definition></span></span><button class="btn-cancel" type="button" data-close>×</button></header><div class="study-drawing-stage"><canvas></canvas><section class="study-drawing-complete" data-complete hidden aria-live="polite"><span class="study-drawing-tick" aria-hidden="true"></span><strong>${i18n.t("adapter.study.drawing.well_done")}</strong><p data-mistakes></p><div><button class="btn-neutral" type="button" data-complete-close>${i18n.t("adapter.study.drawing.close")}</button><button class="btn-neutral" type="button" data-try-again>${i18n.t("adapter.study.drawing.try_again")}</button></div></section></div><div class="study-drawing-controls"><button class="btn-cancel" type="button" data-reset>${i18n.t("adapter.study.drawing.reset")}</button></div>`;
    pad.querySelector("strong").textContent = card.label;
    pad.querySelector("[data-definition]").textContent = definition;
    document.body.append(pad);
    const canvas = pad.querySelector("canvas");
    const stage = pad.querySelector(".study-drawing-stage");
    const completion = pad.querySelector("[data-complete]");
    const header = pad.querySelector("header");
    const context = canvas.getContext("2d");
    const completed = [];
    let active = null;
    let mistakes = 0;
    let drawingFrame;
    const colors = {};
    const animateResult = (className) => {
        stage.classList.remove("is-error", "is-success");
        window.requestAnimationFrame(() => stage.classList.add(className));
        window.setTimeout(() => stage.classList.remove(className), 520);
    };
    const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        const width = Math.max(240, Math.round(bounds.width));
        const height = Math.max(240, Math.round(bounds.height));
        header.style.width = `${Math.round(bounds.width)}px`;
        const styles = getComputedStyle(pad);
        colors.guide = styles.getPropertyValue("--drawing-guide").trim();
        colors.ink = styles.getPropertyValue("--drawing-ink").trim();
        colors.active = styles.getPropertyValue("--drawing-active").trim();
        if (canvas.width === width && canvas.height === height) return;
        canvas.width = width;
        canvas.height = height;
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
        const guides =
            completed.length === 0
                ? strokePattern.strokes
                : strokePattern.strokes.slice(
                      completed.length,
                      completed.length + 1,
                  );
        guides.forEach((stroke) => drawPath(stroke.points, colors.guide, 5));
        completed.forEach((stroke) => drawPath(stroke, colors.ink, 5));
        if (active) drawPath(active, colors.active, 5);
    };
    const scheduleDraw = () => {
        if (drawingFrame) return;
        drawingFrame = window.requestAnimationFrame(() => {
            drawingFrame = undefined;
            draw();
        });
    };
    canvas.addEventListener(
        "pointerdown",
        (event) => {
            active = [normalized(event)];
            canvas.setPointerCapture(event.pointerId);
            scheduleDraw();
        },
        { signal: controller.signal },
    );
    canvas.addEventListener(
        "pointermove",
        (event) => {
            if (active) {
                active.push(normalized(event));
                scheduleDraw();
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
                completed.push(expected);
                if (completed.length === strokePattern.strokes.length) {
                    animateResult("is-success");
                    playSuccessSound();
                    completion.querySelector("[data-mistakes]").textContent =
                        i18n
                            .t("adapter.study.drawing.mistakes")
                            .replace("{{ count }}", String(mistakes));
                    completion.hidden = false;
                    pad.classList.add("is-complete");
                }
            } else {
                mistakes += 1;
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
            active = null;
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
        if (drawingFrame) window.cancelAnimationFrame(drawingFrame);
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
    pad.querySelector("[data-complete-close]").addEventListener(
        "click",
        close,
        {
            signal: controller.signal,
        },
    );
    pad.querySelector("[data-try-again]").addEventListener(
        "click",
        () => {
            completed.length = 0;
            active = null;
            mistakes = 0;
            completion.hidden = true;
            pad.classList.remove("is-complete");
            draw();
        },
        { signal: controller.signal },
    );
    pad.addEventListener(
        "animationend",
        (event) => {
            if (event.animationName === "drawing-pad-open")
                pad.classList.remove("is-opening");
        },
        { signal: controller.signal },
    );
    window.setTimeout(() => pad.classList.remove("is-opening"), 220);
    observer.observe(canvas);
    resize();
    return { close };
}

uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad);
