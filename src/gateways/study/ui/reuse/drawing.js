import { isOffline } from "/static/reuse/offline-state.js";
import { fetchLibrarySchemas } from "../library-client.js";
import { bindDrawingHeading } from "./drawing-heading.js";
import { setDrawingCard } from "./drawing-state.js";
import { pronunciationClass } from "./pronunciation.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createActionRunner } from "./action-flows.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import { drawingViewport } from "./drawing-viewport.js";
import { compactDrawingPattern } from "./drawing-layout.js";
import { sampleHiddenStrokes } from "./drawing-guidance.js";
import {
    fetchDrawingProgress,
    recordDrawingCompletion,
} from "../drawing-client.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/study/languages"],
});
const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "/static/gateways/study/reuse/drawing.css";
document.head.append(stylesheet);

const runDrawingAction = createActionRunner("study:drawing", [
    "open",
    "load",
    "stroke",
    "reset",
    "guidance",
    "reveal",
    "retry",
    "close",
]);

let activeDrawingSession = null;
let padTemplate;

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

function distanceToSegment(point, start, end) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const lengthSquared = deltaX ** 2 + deltaY ** 2;
    if (!lengthSquared) return distance(point, start);
    const projection = Math.max(
        0,
        Math.min(
            1,
            ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
                lengthSquared,
        ),
    );
    return distance(point, {
        x: start.x + projection * deltaX,
        y: start.y + projection * deltaY,
    });
}

function annotationPosition(start, angle, canvas, occupied, paths) {
    const directions = [
        angle - Math.PI / 2,
        angle + Math.PI / 2,
        angle + Math.PI,
        angle - (Math.PI * 3) / 4,
        angle + (Math.PI * 3) / 4,
        angle - Math.PI / 4,
        angle + Math.PI / 4,
        angle,
    ];
    const candidates = [18, 24, 30].flatMap((radius) =>
        directions.map((direction) => ({
            x: start.x + Math.cos(direction) * radius,
            y: start.y + Math.sin(direction) * radius,
        })),
    );
    const clearance = (candidate) =>
        Math.min(
            ...occupied.map((position) => distance(candidate, position) - 21),
            ...paths.flatMap((path) =>
                path
                    .slice(1)
                    .map(
                        (point, index) =>
                            distanceToSegment(candidate, path[index], point) -
                            12,
                    ),
            ),
        );
    const scoredCandidates = candidates
        .filter(
            ({ x, y }) =>
                x >= 12 &&
                y >= 12 &&
                x <= canvas.width - 12 &&
                y <= canvas.height - 12,
        )
        .map((candidate, preference) => ({
            candidate,
            preference,
            clearance: clearance(candidate),
        }));
    return (
        scoredCandidates
            .filter(
                ({ clearance: candidateClearance }) => candidateClearance >= 0,
            )
            .sort((left, right) => left.preference - right.preference)[0]
            ?.candidate ??
        scoredCandidates.sort(
            (left, right) =>
                right.clearance - left.clearance ||
                left.preference - right.preference,
        )[0]?.candidate
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

async function createDrawingPad({
    card,
    definition = "",
    pronunciations = [],
    strokePattern,
    container,
    signal,
    onResult,
    onNavigate,
    suppressRetry = false,
}) {
    if (!card?.id || !strokePattern?.strokes?.length)
        throw new Error("drawing_card_required");
    if (!container && activeDrawingSession) {
        await activeDrawingSession.load({
            card,
            definition,
            pronunciations,
            strokePattern,
        });
        return activeDrawingSession;
    }
    const schemas = await fetchLibrarySchemas();
    if (!padTemplate) {
        const response = await fetch(
            "/static/gateways/study/reuse/drawing.html",
            { signal },
        );
        if (!response.ok) throw new Error("drawing_template_unavailable");
        padTemplate = await response.text();
    }
    signal?.throwIfAborted();
    const makeFloatingWindow = uiCtx.capabilities.get("ui:makeFloatingWindow");
    if (!container && !makeFloatingWindow)
        throw new Error("floating_window_unavailable");
    const controller = new AbortController();
    let pageOverlay;
    try {
        if (!container) {
            pageOverlay = await uiCtx.capabilities
                .get("ui:pageOverlay")
                ?.create({
                    signal: controller.signal,
                    bottomInset: 16,
                });
        }
    } catch (error) {
        controller.abort();
        throw error;
    }
    if (!container && !pageOverlay) throw new Error("drawing_host_unavailable");
    if (signal?.aborted) {
        controller.abort();
        signal.throwIfAborted();
    }
    const host = container
        ? document.createElement("div")
        : pageOverlay.element;
    if (container) {
        host.className = "study-drawing-embedded";
        container.append(host);
    } else host.classList.add("study-drawing-host");
    const pad = document.createElement("section");
    pad.className = "study-drawing-pad is-opening";
    pad.innerHTML = formatTemplate(
        padTemplate,
        Object.fromEntries(
            Object.entries({
                guidance: "gateway.study.drawing.guidance",
                close: "ui.reuse.close",
                try_again: "ui.reuse.try_again",
                reset: "ui.reuse.reset",
                reveal: "gateway.study.drawing.reveal",
            }).map(([key, translation]) => [
                key,
                escapeHtml(i18n.t(translation)),
            ]),
        ),
    );
    host.append(pad);
    if (container) {
        pad.querySelector("[data-close]").hidden = true;
        pad.querySelector("[data-complete-close]").hidden = true;
    }
    pad.querySelector("[data-try-again]").hidden = suppressRetry;
    const canvas = pad.querySelector("canvas");
    const stage = pad.querySelector(".study-drawing-stage");
    const completion = pad.querySelector("[data-complete]");
    const header = pad.querySelector("header");
    const context = canvas.getContext("2d");
    const completed = [];
    let currentCard = card;
    let currentDefinition = definition;
    let currentPronunciations = pronunciations;
    let currentPattern = strokePattern;
    let progress = { completed: false, hiddenStrokeCount: 0 };
    let difficulty = 0;
    let hiddenGuideIndices = new Set();
    let attemptNumber = 0;
    let attemptIdentity;
    const startAttempt = () => {
        attemptNumber += 1;
        attemptIdentity = {
            id: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
        };
    };
    let pendingCompletion;
    const persistAttempt = async (result) => {
        const attempt = attemptNumber;
        const sequence = loadSequence;
        if (isOffline()) return;
        const request = recordDrawingCompletion(currentCard.id, {
            strokeCount: currentPattern.strokes.length,
            mistakes,
            result,
            assisted: assistedAttempt,
            attempt: attemptIdentity,
        });
        pendingCompletion = request;
        try {
            const saved = await request;
            if (attempt === attemptNumber && sequence === loadSequence)
                progress = saved;
            return saved;
        } finally {
            if (pendingCompletion === request) pendingCompletion = undefined;
        }
    };
    let loadSequence = 0;
    stage.style.visibility = "hidden";
    const resetHiddenGuides = () => {
        difficulty = Math.min(
            progress.hiddenStrokeCount,
            currentPattern.strokes.length,
        );
        hiddenGuideIndices = sampleHiddenStrokes(
            currentPattern.strokes.length,
            difficulty,
        );
    };
    let assistedAttempt = false;
    let revealHiddenGuides = false;
    let hasStarted = false;
    let active = null;
    let mistakes = 0;
    let successiveMistakes = 0;
    let drawingFrame;
    const colors = {};
    const animateResult = (className) => {
        stage.classList.remove("is-error", "is-success");
        window.requestAnimationFrame(() => stage.classList.add(className));
        window.setTimeout(() => stage.classList.remove(className), 520);
    };
    const resize = () => {
        if (container)
            stage.style.maxHeight = `${Math.max(220, window.innerHeight - stage.getBoundingClientRect().top - 120)}px`;
        const bounds = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(bounds.width));
        const height = Math.max(1, Math.round(bounds.height));
        header.style.width = `${Math.round(bounds.width)}px`;
        const styles = getComputedStyle(pad);
        colors.guide = styles.getPropertyValue("--drawing-guide").trim();
        colors.ink = styles.getPropertyValue("--drawing-ink").trim();
        colors.active = styles.getPropertyValue("--drawing-active").trim();
        colors.canvas = styles.getPropertyValue("--drawing-canvas").trim();
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }
        draw();
    };
    const normalized = (event) => {
        const bounds = canvas.getBoundingClientRect();
        const viewport = drawingViewport(
            { width: bounds.width, height: bounds.height },
            currentPattern.aspectRatio ?? currentPattern.columns,
        );
        return {
            x: Math.max(
                0,
                Math.min(
                    1,
                    (event.clientX - bounds.left - viewport.x) / viewport.width,
                ),
            ),
            y: Math.max(
                0,
                Math.min(
                    1,
                    (event.clientY - bounds.top - viewport.y) / viewport.height,
                ),
            ),
            pressure: event.pressure || 0.5,
        };
    };
    const drawPath = (points, color, width = 3) => {
        if (!points.length) return;
        const viewport = drawingViewport(
            canvas,
            currentPattern.aspectRatio ?? currentPattern.columns,
        );
        const plotted = (point) => ({
            x: viewport.x + point.x * viewport.width,
            y: viewport.y + point.y * viewport.height,
        });
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineCap = "round";
        context.lineJoin = "round";
        const first = plotted(points[0]);
        context.moveTo(first.x, first.y);
        for (let index = 1; index < points.length - 1; index += 1) {
            const point = plotted(points[index]);
            const next = plotted(points[index + 1]);
            context.quadraticCurveTo(
                point.x,
                point.y,
                (point.x + next.x) / 2,
                (point.y + next.y) / 2,
            );
        }
        const last = plotted(points.at(-1));
        context.lineTo(last.x, last.y);
        context.stroke();
    };
    const drawStrokeOrder = (stroke, index, occupiedAnnotations, paths) => {
        const [start, next] = stroke.points;
        if (!start || !next) return;
        const viewport = drawingViewport(
            canvas,
            currentPattern.aspectRatio ?? currentPattern.columns,
        );
        const startX = viewport.x + start.x * viewport.width;
        const startY = viewport.y + start.y * viewport.height;
        const angle = Math.atan2(
            (next.y - start.y) * viewport.height,
            (next.x - start.x) * viewport.width,
        );
        const label = annotationPosition(
            { x: startX, y: startY },
            angle,
            canvas,
            occupiedAnnotations,
            paths,
        );
        if (!label) return;
        occupiedAnnotations.push(label);
        const labelX = label.x;
        const labelY = label.y;
        const arrowX = startX + Math.cos(angle) * 22;
        const arrowY = startY + Math.sin(angle) * 22;
        context.save();
        context.fillStyle = colors.active;
        context.strokeStyle = colors.active;
        context.lineWidth = 2;
        context.font = "700 14px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.beginPath();
        context.arc(labelX, labelY, 11, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = colors.canvas;
        context.fillText(String(index + 1), labelX, labelY);
        context.beginPath();
        context.moveTo(
            startX + Math.cos(angle) * 13,
            startY + Math.sin(angle) * 13,
        );
        context.lineTo(arrowX, arrowY);
        context.lineTo(
            arrowX - Math.cos(angle - Math.PI / 5) * 7,
            arrowY - Math.sin(angle - Math.PI / 5) * 7,
        );
        context.moveTo(arrowX, arrowY);
        context.lineTo(
            arrowX - Math.cos(angle + Math.PI / 5) * 7,
            arrowY - Math.sin(angle + Math.PI / 5) * 7,
        );
        context.stroke();
        context.restore();
    };
    const draw = () => {
        pad.querySelector("[data-guidance]").disabled = revealHiddenGuides;
        context.clearRect(0, 0, canvas.width, canvas.height);
        const viewport = drawingViewport(
            canvas,
            currentPattern.aspectRatio ?? currentPattern.columns,
        );
        const annotationPaths = currentPattern.strokes.map(({ points }) =>
            points.map(({ x, y }) => ({
                x: viewport.x + x * viewport.width,
                y: viewport.y + y * viewport.height,
            })),
        );
        const hasHiddenGuide =
            !revealHiddenGuides && hiddenGuideIndices.has(completed.length);
        const occupiedAnnotations = hasHiddenGuide ? [{ x: 20, y: 22 }] : [];
        const guideStart = revealHiddenGuides ? 0 : completed.length;
        const guides = currentPattern.strokes
            .slice(
                guideStart,
                revealHiddenGuides || (!hasStarted && !progress.completed)
                    ? currentPattern.strokes.length
                    : completed.length + 1,
            )
            .map((stroke, index) => ({
                stroke,
                index: guideStart + index,
            }));
        const visibleGuides = guides.filter(
            ({ index }) => revealHiddenGuides || !hiddenGuideIndices.has(index),
        );
        visibleGuides.forEach(({ stroke }) =>
            drawPath(stroke.points, colors.guide, Math.max(2, 5 - difficulty)),
        );
        if (hasHiddenGuide) {
            context.fillStyle = colors.active;
            context.font = "700 24px sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText("?", 20, 22);
        }
        for (const { stroke, index } of visibleGuides) {
            drawStrokeOrder(
                stroke,
                index,
                occupiedAnnotations,
                annotationPaths,
            );
        }
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
            if (completed.length >= currentPattern.strokes.length) return;
            active = [normalized(event)];
            hasStarted = true;
            revealHiddenGuides = false;
            pad.querySelector("[data-guidance]").hidden = false;
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
        (event) =>
            void runDrawingAction(
                "stroke",
                async () => {
                    if (!active) return;
                    active.push(normalized(event));
                    const expected =
                        currentPattern.strokes[completed.length]?.points ?? [];
                    const score = scoreStroke(active, expected);
                    if (
                        score >=
                        (currentPattern.tolerance ?? 55) +
                            Math.min(difficulty, 3) * 5
                    ) {
                        completed.push(expected);
                        active = null;
                        successiveMistakes = 0;
                        if (
                            completed.length === currentPattern.strokes.length
                        ) {
                            const finishedAttempt = attemptNumber;
                            const saved = await persistAttempt("correct");
                            if (
                                finishedAttempt !== attemptNumber ||
                                controller.signal.aborted
                            )
                                return;
                            progress = saved;
                            onResult?.({
                                correct: true,
                                assisted: assistedAttempt,
                                mistakes,
                            });
                            animateResult("is-success");
                            playSuccessSound();
                            completion.classList.remove("is-failure");
                            completion.querySelector(
                                "[data-result-message]",
                            ).textContent = i18n.t(
                                "gateway.study.drawing.well_done",
                            );
                            completion.querySelector(
                                "[data-mistakes]",
                            ).textContent = i18n
                                .t("gateway.study.drawing.mistakes")
                                .replace("{{ count }}", String(mistakes));
                            completion.hidden = false;
                            pad.classList.add("is-complete");
                        }
                    } else {
                        onResult?.({ correct: false, mistakes: mistakes + 1 });
                        mistakes += 1;
                        successiveMistakes += 1;
                        animateResult("is-error");
                        if (successiveMistakes >= 10) {
                            const finishedAttempt = attemptNumber;
                            const saved = await persistAttempt("incorrect");
                            if (
                                finishedAttempt !== attemptNumber ||
                                controller.signal.aborted
                            )
                                return;
                            progress = saved;
                            completion.classList.add("is-failure");
                            completion.querySelector(
                                "[data-result-message]",
                            ).textContent = i18n.t(
                                "gateway.study.drawing.loser",
                            );
                            completion.querySelector(
                                "[data-mistakes]",
                            ).textContent = "";
                            completion.hidden = false;
                            pad.classList.add("is-complete");
                        }
                    }
                    active = null;
                    draw();
                },
                controller.signal,
            ).catch(reportFailure),
        { signal: controller.signal },
    );
    const resetHeading = bindDrawingHeading(
        pad.querySelector("[data-card-label]"),
        {
            signal: controller.signal,
            i18n,
            schemas,
            getCard: () => currentCard,
            onNavigate,
            onReveal: () => {
                assistedAttempt = true;
                onResult?.({ correct: false, assisted: true, mistakes });
            },
            runAction: (work) =>
                runDrawingAction("reveal", work, controller.signal),
            reportFailure,
        },
    );
    pad.querySelector("[data-reset]").addEventListener(
        "click",
        () =>
            void runDrawingAction(
                "reset",
                async () => {
                    const restartingAttempt = attemptNumber;
                    await pendingCompletion;
                    if (
                        controller.signal.aborted ||
                        restartingAttempt !== attemptNumber
                    )
                        return;
                    completed.length = 0;
                    startAttempt();
                    resetHiddenGuides();
                    hasStarted = false;
                    active = null;
                    mistakes = 0;
                    successiveMistakes = 0;
                    assistedAttempt = false;
                    revealHiddenGuides = false;
                    completion.hidden = true;
                    pad.classList.remove("is-complete");
                    draw();
                },
                controller.signal,
            ).catch(reportFailure),
        { signal: controller.signal },
    );
    const release = container
        ? undefined
        : makeFloatingWindow(pad, {
              boundaryElement: host,
              handle: pad.querySelector("header"),
              signal: controller.signal,
              minWidth: 360,
              minHeight: 320,
              width: "min(64vw, 48rem)",
              height: "min(68vh, 36rem)",
              allowOrientationSwap: false,
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
        pageOverlay?.destroy();
        release?.();
        pad.remove();
        host.remove();
        if (!container) {
            activeDrawingSession = null;
            setDrawingCard(null);
        }
    };
    signal?.addEventListener("abort", finishClose, { once: true });
    window.addEventListener("cognis:route-will-change", finishClose, {
        signal: controller.signal,
    });
    const close = () =>
        runDrawingAction("close", () => {
            if (closing) return;
            closing = true;
            pad.classList.add("is-closing");
            pad.addEventListener(
                "animationend",
                (event) => {
                    if (event.animationName === "drawing-pad-close")
                        finishClose();
                },
                { signal: controller.signal },
            );
            window.setTimeout(finishClose, 220);
        });
    window.addEventListener(
        "keydown",
        (event) => {
            if (container || event.key !== "Escape") return;
            event.preventDefault();
            close();
        },
        { signal: controller.signal },
    );
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
        () =>
            void runDrawingAction(
                "retry",
                async () => {
                    if (suppressRetry) return;
                    const restartingAttempt = attemptNumber;
                    await pendingCompletion;
                    if (
                        controller.signal.aborted ||
                        restartingAttempt !== attemptNumber
                    )
                        return;
                    completed.length = 0;
                    startAttempt();
                    resetHiddenGuides();
                    hasStarted = false;
                    active = null;
                    mistakes = 0;
                    successiveMistakes = 0;
                    assistedAttempt = false;
                    revealHiddenGuides = false;
                    completion.hidden = true;
                    completion.classList.remove("is-failure");
                    pad.classList.remove("is-complete");
                    draw();
                },
                controller.signal,
            ).catch(reportFailure),
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
    pad.querySelector("[data-guidance]").addEventListener(
        "click",
        () =>
            void runDrawingAction(
                "guidance",
                () => {
                    revealHiddenGuides = true;
                    assistedAttempt = true;
                    onResult?.({ correct: false, assisted: true, mistakes });
                    pad.querySelector("[data-guidance]").disabled = true;
                    draw();
                },
                controller.signal,
            ).catch(reportFailure),
        { signal: controller.signal },
    );
    observer.observe(canvas);
    resize();
    const load = async ({
        card: nextCard,
        definition: nextDefinition = "",
        pronunciations: nextPronunciations = [],
        strokePattern: nextPattern,
    }) => {
        if (!nextCard?.id || !nextPattern?.strokes?.length) return false;
        if (container && nextCard.id !== card.id) return false;
        const sequence = ++loadSequence;
        const loaded = await fetchDrawingProgress(nextCard.id, {
            signal: controller.signal,
        });
        if (sequence !== loadSequence || controller.signal.aborted)
            return false;
        startAttempt();
        progress = loaded;
        currentCard = nextCard;
        currentDefinition = nextDefinition;
        currentPronunciations = nextPronunciations;
        currentPattern = compactDrawingPattern(nextPattern);
        const columns = currentPattern.columns ?? 1;
        const aspectRatio = currentPattern.aspectRatio ?? columns;
        if (container) {
            const maximumWidth = Math.min(
                container.clientWidth,
                Math.max(1, host.clientWidth - 32),
            );
            const fittedWidth =
                Math.min(maximumWidth, 448 * columns) * (aspectRatio / columns);
            pad.style.width = `${fittedWidth}px`;
            pad.style.height = "auto";
        }
        pad.style.setProperty("--drawing-columns", String(aspectRatio));
        resetHiddenGuides();
        revealHiddenGuides = false;
        completed.length = 0;
        hasStarted = false;
        active = null;
        mistakes = 0;
        successiveMistakes = 0;
        assistedAttempt = false;
        completion.hidden = true;
        completion.classList.remove("is-failure");
        pad.classList.remove("is-complete");
        resetHeading();
        if (!container)
            setDrawingCard({ id: currentCard.id, label: currentCard.label });
        pad.querySelector("[data-pronunciations]").classList.toggle(
            "study-ipa",
            Boolean(pronunciationClass(currentPronunciations)),
        );
        pad.querySelector("[data-pronunciations]").textContent = [
            currentPronunciations,
        ]
            .flat()
            .filter(Boolean)
            .join(" · ");
        pad.querySelector("[data-definition]").textContent = currentDefinition;
        pad.querySelector("[data-guidance]").disabled = false;
        stage.style.visibility = "visible";
        resize();
        window.requestAnimationFrame(resize);
        return true;
    };
    const session = {
        close: () => runDrawingAction("close", finishClose),
        load: (payload) =>
            runDrawingAction("load", () => load(payload), controller.signal),
    };
    if (!container) activeDrawingSession = session;
    try {
        await load({ card, definition, pronunciations, strokePattern });
    } catch (error) {
        finishClose();
        throw error;
    }
    pad.style.top = `${host.scrollTop + 16}px`;
    pad.style.left = `${Math.max(16, host.clientWidth - pad.getBoundingClientRect().width - 16)}px`;
    return session;
}

function reportFailure() {
    showToast(i18n.t("gateway.study.drawing.error"), { variant: "error" });
}

export async function openDrawingPad(payload) {
    return runDrawingAction(
        "open",
        () => createDrawingPad(payload),
        payload.signal,
    );
}

export async function loadDrawingPad(payload) {
    return (
        activeDrawingSession?.load(payload) ??
        runDrawingAction("load", () => undefined)
    );
}
