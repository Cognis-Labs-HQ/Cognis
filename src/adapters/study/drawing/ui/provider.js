import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n } from "/static/reuse/i18n.js";
import { drawingViewport } from "./viewport.js";
import { compactDrawingPattern } from "./layout.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/adapters/study/drawing/languages"],
});
const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "/static/adapters/study/drawing/drawing.css";
document.head.append(stylesheet);

const difficultyByCardId = new Map();
const hiddenGuideIndicesByCardId = new Map();
const attemptedCardIds = new Set();
let activeDrawingSession = null;

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

function addRandomHiddenGuide(cardId, strokeCount) {
    const hidden = new Set(hiddenGuideIndicesByCardId.get(cardId) ?? []);
    const available = Array.from(
        { length: strokeCount },
        (_, index) => index,
    ).filter((index) => !hidden.has(index));
    if (!available.length) return hidden;
    const randomValue = new Uint32Array(1);
    window.crypto.getRandomValues(randomValue);
    hidden.add(available[randomValue[0] % available.length]);
    hiddenGuideIndicesByCardId.set(cardId, hidden);
    return hidden;
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

function openDrawingPad({
    card,
    definition = "",
    pronunciations = [],
    strokePattern,
}) {
    if (!card?.id || !strokePattern?.strokes?.length)
        throw new Error("drawing_card_required");
    if (activeDrawingSession) {
        activeDrawingSession.load({
            card,
            definition,
            pronunciations,
            strokePattern,
        });
        return activeDrawingSession;
    }
    const makeFloatingWindow = uiCtx.capabilities.get("ui:makeFloatingWindow");
    if (!makeFloatingWindow) throw new Error("floating_window_unavailable");
    const controller = new AbortController();
    const host = document.querySelector(".app-page__main");
    if (!host) throw new Error("drawing_host_unavailable");
    const previousHostHeight = host.style.getPropertyValue(
        "--drawing-host-height",
    );
    const footer = document.querySelector(".global-footer");
    const fitHost = () => {
        const bottom =
            footer?.getBoundingClientRect().top ?? window.innerHeight;
        const top = Math.max(0, host.getBoundingClientRect().top);
        host.style.setProperty(
            "--drawing-host-height",
            `${Math.max(0, bottom - top - 16)}px`,
        );
    };
    fitHost();
    const pad = document.createElement("section");
    pad.className = "study-drawing-pad is-opening";
    pad.innerHTML = `<header><span class="study-drawing-heading"><strong data-card-label></strong><span data-pronunciations></span><span data-definition></span></span><span class="study-drawing-header-actions"><button class="btn-neutral" type="button" data-guidance hidden aria-label="${i18n.t("adapter.study.drawing.guidance")}">?</button><button class="btn-cancel" type="button" data-close>×</button></span></header><div class="study-drawing-stage"><canvas></canvas><section class="study-drawing-complete" data-complete hidden aria-live="polite"><span class="study-drawing-result" aria-hidden="true"></span><strong data-result-message></strong><p data-mistakes></p><div><button class="btn-neutral" type="button" data-complete-close>${i18n.t("adapter.study.drawing.close")}</button><button class="btn-neutral" type="button" data-try-again>${i18n.t("adapter.study.drawing.try_again")}</button></div></section></div><div class="study-drawing-controls"><button class="btn-cancel" type="button" data-reset>${i18n.t("adapter.study.drawing.reset")}</button></div>`;
    host.append(pad);
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
    let difficulty = difficultyByCardId.get(card.id) ?? 0;
    let hiddenGuideIndices = new Set(
        hiddenGuideIndicesByCardId.get(card.id) ?? [],
    );
    let revealHiddenGuides = false;
    let active = null;
    let mistakes = 0;
    let successiveMistakes = 0;
    let hasAttemptedPiece = attemptedCardIds.has(card.id);
    let drawingFrame;
    const colors = {};
    const animateResult = (className) => {
        stage.classList.remove("is-error", "is-success");
        window.requestAnimationFrame(() => stage.classList.add(className));
        window.setTimeout(() => stage.classList.remove(className), 520);
    };
    const resize = () => {
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
        const guides = (() => {
            const groupLengths = currentPattern.groups?.length
                ? currentPattern.groups
                : [currentPattern.strokes.length];
            let groupStart = 0;
            for (const length of groupLengths) {
                const groupEnd = groupStart + length;
                if (completed.length < groupEnd) {
                    if (completed.length === groupStart && !hasAttemptedPiece)
                        return currentPattern.strokes
                            .slice(groupStart, groupEnd)
                            .map((stroke, index) => ({
                                stroke,
                                index: groupStart + index,
                            }));
                    break;
                }
                groupStart = groupEnd;
            }
            return currentPattern.strokes
                .slice(completed.length, completed.length + 1)
                .map((stroke) => ({ stroke, index: completed.length }));
        })();
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
        const groupStart = (
            currentPattern.groups ?? [currentPattern.strokes.length]
        )
            .reduce(
                (starts, length) => [...starts, starts.at(-1) + length],
                [0],
            )
            .findLast((start) => start <= completed.length);
        if (completed.length === groupStart && !hasAttemptedPiece) {
            const groupIndex = (
                currentPattern.groups ?? [currentPattern.strokes.length]
            )
                .slice(0, -1)
                .reduce((index, length, candidate) => {
                    return index + length <= completed.length
                        ? candidate + 1
                        : index;
                }, 0);
            const groupLength = (currentPattern.groups ?? [
                currentPattern.strokes.length,
            ])[groupIndex];
            visibleGuides
                .filter(
                    ({ index }) =>
                        index >= groupStart && index < groupStart + groupLength,
                )
                .forEach(({ stroke, index }) =>
                    drawStrokeOrder(
                        stroke,
                        index,
                        occupiedAnnotations,
                        annotationPaths,
                    ),
                );
        } else if (visibleGuides.length === 1) {
            drawStrokeOrder(
                visibleGuides[0].stroke,
                visibleGuides[0].index,
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
            active = [normalized(event)];
            revealHiddenGuides = false;
            hasAttemptedPiece = true;
            attemptedCardIds.add(currentCard.id);
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
        (event) => {
            if (!active) return;
            active.push(normalized(event));
            const expected =
                currentPattern.strokes[completed.length]?.points ?? [];
            const score = scoreStroke(active, expected);
            if (
                score >=
                (currentPattern.tolerance ?? 55) + Math.min(difficulty, 3) * 5
            ) {
                completed.push(expected);
                successiveMistakes = 0;
                const groupEnds = (
                    currentPattern.groups ?? [currentPattern.strokes.length]
                ).reduce(
                    (ends, length) => [...ends, (ends.at(-1) ?? 0) + length],
                    [],
                );
                if (
                    groupEnds.includes(completed.length) &&
                    completed.length < currentPattern.strokes.length
                )
                    hasAttemptedPiece = false;
                if (completed.length === currentPattern.strokes.length) {
                    animateResult("is-success");
                    playSuccessSound();
                    completion.classList.remove("is-failure");
                    completion.querySelector(
                        "[data-result-message]",
                    ).textContent = i18n.t("adapter.study.drawing.well_done");
                    completion.querySelector("[data-mistakes]").textContent =
                        i18n
                            .t("adapter.study.drawing.mistakes")
                            .replace("{{ count }}", String(mistakes));
                    completion.hidden = false;
                    pad.classList.add("is-complete");
                    if (mistakes <= 1) {
                        hiddenGuideIndices = addRandomHiddenGuide(
                            currentCard.id,
                            currentPattern.strokes.length,
                        );
                        difficulty = hiddenGuideIndices.size;
                        difficultyByCardId.set(currentCard.id, difficulty);
                    }
                }
            } else {
                mistakes += 1;
                successiveMistakes += 1;
                animateResult("is-error");
                if (successiveMistakes >= 10) {
                    completion.classList.add("is-failure");
                    completion.querySelector(
                        "[data-result-message]",
                    ).textContent = i18n.t("adapter.study.drawing.loser");
                    completion.querySelector("[data-mistakes]").textContent =
                        "";
                    completion.hidden = false;
                    pad.classList.add("is-complete");
                }
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
            mistakes = 0;
            successiveMistakes = 0;
            hasAttemptedPiece = attemptedCardIds.has(currentCard.id);
            revealHiddenGuides = false;
            completion.hidden = true;
            pad.classList.remove("is-complete");
            draw();
        },
        { signal: controller.signal },
    );
    const release = makeFloatingWindow(pad, {
        boundaryElement: host,
        handle: pad.querySelector("header"),
        signal: controller.signal,
        minWidth: 280,
        minHeight: 240,
        width: "min(40vw, 28rem)",
        height: "auto",
        allowOrientationSwap: false,
    });
    const observer = new ResizeObserver(resize);
    const hostObserver = new ResizeObserver(fitHost);
    hostObserver.observe(host);
    if (footer) hostObserver.observe(footer);
    const pageHeader = document.querySelector(".site-header");
    if (pageHeader) hostObserver.observe(pageHeader);
    window.addEventListener("resize", fitHost, { signal: controller.signal });
    let closing = false;
    let closed = false;
    const finishClose = () => {
        if (closed) return;
        closed = true;
        controller.abort();
        if (drawingFrame) window.cancelAnimationFrame(drawingFrame);
        observer.disconnect();
        hostObserver.disconnect();
        release?.();
        pad.remove();
        if (previousHostHeight)
            host.style.setProperty("--drawing-host-height", previousHostHeight);
        else host.style.removeProperty("--drawing-host-height");
        activeDrawingSession = null;
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
    window.addEventListener(
        "keydown",
        (event) => {
            if (event.key !== "Escape") return;
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
        () => {
            completed.length = 0;
            active = null;
            mistakes = 0;
            successiveMistakes = 0;
            hasAttemptedPiece = true;
            revealHiddenGuides = false;
            completion.hidden = true;
            completion.classList.remove("is-failure");
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
    pad.querySelector("[data-guidance]").addEventListener(
        "click",
        () => {
            hasAttemptedPiece = false;
            revealHiddenGuides = true;
            pad.querySelector("[data-guidance]").hidden = true;
            draw();
        },
        { signal: controller.signal },
    );
    observer.observe(canvas);
    resize();
    const load = ({
        card: nextCard,
        definition: nextDefinition = "",
        pronunciations: nextPronunciations = [],
        strokePattern: nextPattern,
    }) => {
        if (!nextCard?.id || !nextPattern?.strokes?.length) return false;
        currentCard = nextCard;
        currentDefinition = nextDefinition;
        currentPronunciations = nextPronunciations;
        currentPattern = compactDrawingPattern(nextPattern);
        const columns = currentPattern.columns ?? 1;
        const aspectRatio = currentPattern.aspectRatio ?? columns;
        const maximumWidth = Math.min(
            window.innerWidth * 0.4,
            Math.max(1, host.clientWidth - 32),
        );
        const fittedWidth =
            Math.min(maximumWidth, 448 * columns) * (aspectRatio / columns);
        pad.style.width = `${fittedWidth}px`;
        pad.style.height = "auto";
        pad.style.setProperty("--drawing-columns", String(aspectRatio));
        difficulty = difficultyByCardId.get(nextCard.id) ?? 0;
        hiddenGuideIndices = new Set(
            hiddenGuideIndicesByCardId.get(nextCard.id) ?? [],
        );
        revealHiddenGuides = false;
        completed.length = 0;
        active = null;
        mistakes = 0;
        successiveMistakes = 0;
        hasAttemptedPiece = attemptedCardIds.has(nextCard.id);
        completion.hidden = true;
        completion.classList.remove("is-failure");
        pad.classList.remove("is-complete");
        pad.querySelector("[data-card-label]").textContent = currentCard.label;
        pad.querySelector("[data-pronunciations]").textContent = [
            currentPronunciations,
        ]
            .flat()
            .filter(Boolean)
            .join(" · ");
        pad.querySelector("[data-definition]").textContent = currentDefinition;
        pad.querySelector("[data-guidance]").hidden =
            !attemptedCardIds.has(nextCard.id) && !hiddenGuideIndices.size;
        resize();
        window.requestAnimationFrame(resize);
        return true;
    };
    activeDrawingSession = { close, load };
    load({ card, definition, pronunciations, strokePattern });
    pad.style.top = `${host.scrollTop + 16}px`;
    pad.style.left = `${Math.max(16, host.clientWidth - pad.getBoundingClientRect().width - 16)}px`;
    return activeDrawingSession;
}

uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad);
uiCtx.capabilities.contribute("study:drawing:load", (payload) =>
    activeDrawingSession?.load(payload),
);
