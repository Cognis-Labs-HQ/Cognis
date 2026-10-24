import * as offlineState from "../../../../ui/reuse/offline-state.js";
import {
    loadTestModule,
    importTestModule,
} from "../../../../tooling/reuse/test-module.ts";
import { entryExploreUrl } from "../../ui/reuse/explore.js";
import {
    setDrawingCard,
    observeDrawingCard,
} from "../../ui/reuse/drawing-state.js";
import { pronunciationClass } from "../../ui/reuse/pronunciation.js";
import { formatTemplate } from "../../../../ui/reuse/format-template.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { compactDrawingPattern } from "../../ui/reuse/drawing-layout.js";
import { drawingViewport } from "../../ui/reuse/drawing-viewport.js";
import { sampleHiddenStrokes } from "../../ui/reuse/drawing-guidance.js";

async function drawingSession({
    templateAvailable = true,
    initialProgress = new Map(),
    completionDelay,
} = {}) {
    let templateRequests = 0;
    const capabilities = new Map();
    const elements = new Map();
    const moves = [];
    const annotations = [];
    const frames = [];
    const events = new Map();
    let paints = 0;
    const progress = new Map(initialProgress);
    let randomValue = 0;
    const context = {
        clearRect() {
            paints += 1;
            moves.length = 0;
            annotations.length = 0;
        },
        moveTo(x, y) {
            moves.push({ x, y });
        },
        beginPath() {},
        lineTo() {},
        quadraticCurveTo() {},
        stroke() {},
        save() {},
        restore() {},
        arc() {},
        fill() {},
        fillText(text) {
            annotations.push(text);
        },
    };
    const handlers = new Map();
    const element = () => ({
        handlers: new Map(),
        clientWidth: 1000,
        scrollTop: 0,
        append(child) {
            child.parentElement = this;
        },
        removeAttribute(name) {
            delete this[name];
        },
        setAttribute(name, value) {
            this[name] = value;
        },
        style: { setProperty() {} },
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener(event, handler) {
            this.handlers.set(event, handler);
            handlers.set(event, handler);
        },
        querySelector(selector) {
            if (!elements.has(selector)) elements.set(selector, element());
            return elements.get(selector);
        },
        getBoundingClientRect: () => ({
            width: 400,
            height: 400,
            top: 16,
            left: 16,
        }),
        remove() {},
    });
    const canvas = {
        ...element(),
        width: 300,
        height: 150,
        getContext: () => context,
    };
    elements.set("canvas", canvas);
    const pad = {
        ...element(),
        querySelector(selector) {
            if (!elements.has(selector)) elements.set(selector, element());
            return elements.get(selector);
        },
    };
    const host = {
        ...element(),
        clientWidth: 1000,
        scrollTop: 0,
        style: {
            getPropertyValue: () => "",
            setProperty() {},
            removeProperty() {},
        },
        append(child) {
            child.parentElement = this;
        },
    };
    capabilities.set("ui:pageOverlay", {
        async create({ signal, bottomInset }) {
            assert.equal(bottomInset, 16);
            assert.equal(signal.aborted, false);
            const boundary = element();
            host.append(boundary);
            signal.addEventListener("abort", () => boundary.remove(), {
                once: true,
            });
            return { element: boundary, destroy: () => boundary.remove() };
        },
    });
    let floatingOptions;
    capabilities.set("ui:makeFloatingWindow", (element, options) => {
        floatingOptions = options;
        element.style.width = options.width;
        element.style.height = options.height;
        return () => {};
    });
    const environment = {
        setDrawingCard,
        pronunciationClass,
        AbortController,
        crypto: globalThis.crypto,
        entryExploreUrl,
        fetchLibrarySchemas: async () => [
            { id: "ja", language: "ja", layers: [{ id: "characters" }] },
        ],
        openPopup: async () => "cancel",
        compactDrawingPattern,
        drawingViewport,
        sampleHiddenStrokes: (count, hidden) =>
            sampleHiddenStrokes(count, hidden, (values) =>
                values.fill(randomValue),
            ),
        fetchDrawingProgress: async (cardId) =>
            progress.get(cardId) ?? { completed: false, hiddenStrokeCount: 0 },
        recordDrawingCompletion: async (cardId, input, options) => {
            assert.equal(options?.signal, undefined);
            await completionDelay;
            const previous = progress.get(cardId) ?? { hiddenStrokeCount: 0 };
            const saved = {
                completed: true,
                hiddenStrokeCount: Math.min(
                    input.strokeCount,
                    previous.hiddenStrokeCount + (input.mistakes <= 1 ? 1 : 0),
                ),
            };
            progress.set(cardId, saved);
            return saved;
        },
        uiCtx: {
            ...uiCtx,
            capabilities: {
                get: (key) => capabilities.get(key),
                contribute: (key, value) => capabilities.set(key, value),
            },
        },
        formatTemplate,
        escapeHtml,
        fetch: async (url) => {
            templateRequests++;
            assert.equal(url, "/static/gateways/study/reuse/drawing.html");
            return {
                ok: templateAvailable,
                text: async () =>
                    readFileSync(
                        new URL("../../ui/reuse/drawing.html", import.meta.url),
                        "utf8",
                    ),
            };
        },
        showToast() {},
        createI18n: async () => ({ t: (key) => key }),
        document: {
            querySelector: (selector) =>
                selector === ".app-page__main" ? host : null,
            createElement: (tag) => (tag === "section" ? pad : element()),
            head: { append() {} },
            body: { append() {} },
        },
        window: {
            location: { pathname: "/study/explore/ja/kanji" },
            crypto: {
                randomUUID: globalThis.crypto.randomUUID,
                getRandomValues: (values) => values.fill(0),
            },
            innerWidth: 1440,
            innerHeight: 900,
            addEventListener(name, handler) {
                events.set(name, handler);
            },
            setTimeout() {},
            requestAnimationFrame(callback) {
                frames.push(callback);
                return frames.length;
            },
            cancelAnimationFrame() {},
        },
        getComputedStyle: () => ({ getPropertyValue: () => "#ffffff" }),
        ResizeObserver: class {
            observe() {}

            disconnect() {}
        },
    };
    Object.assign(
        environment,
        loadTestModule(
            new URL("../../ui/reuse/drawing-heading.js", import.meta.url),
            {
                "/static/reuse/popup.js": environment,
                "/static/reuse/ui-ctx.js": environment,
                "./explore.js": environment,
            },
            environment,
        ),
    );
    environment.createActionRunner = loadTestModule(
        new URL("../../ui/reuse/action-flows.js", import.meta.url),
        {
            "/static/reuse/ui-ctx.js": environment,
        },
        environment,
    ).createActionRunner;
    Object.assign(
        environment,
        await importTestModule(
            new URL("../../ui/reuse/drawing.js", import.meta.url),
            {
                "/static/reuse/offline-state.js": offlineState,
                "../library-client.js": {
                    fetchLibrarySchemas: environment.fetchLibrarySchemas,
                },
                "./drawing-heading.js": {
                    bindDrawingHeading: environment.bindDrawingHeading,
                },
                "./drawing-state.js": {
                    setDrawingCard: environment.setDrawingCard,
                },
                "./pronunciation.js": {
                    pronunciationClass: environment.pronunciationClass,
                },
                "/static/reuse/format-template.js": {
                    formatTemplate: environment.formatTemplate,
                },
                "/static/reuse/escape-html.js": {
                    escapeHtml: environment.escapeHtml,
                },
                "./action-flows.js": {
                    createActionRunner: environment.createActionRunner,
                },
                "/static/reuse/toast.js": { showToast: environment.showToast },
                "/static/reuse/ui-ctx.js": { uiCtx: environment.uiCtx },
                "/static/reuse/i18n.js": { createI18n: environment.createI18n },
                "./drawing-viewport.js": {
                    drawingViewport: environment.drawingViewport,
                },
                "./drawing-layout.js": {
                    compactDrawingPattern: environment.compactDrawingPattern,
                },
                "./drawing-guidance.js": {
                    sampleHiddenStrokes: environment.sampleHiddenStrokes,
                },
                "../drawing-client.js": {
                    fetchDrawingProgress: environment.fetchDrawingProgress,
                    recordDrawingCompletion:
                        environment.recordDrawingCompletion,
                },
            },
            environment,
        ),
    );
    environment.uiCtx.capabilities.contribute(
        "study:drawing:open",
        environment.openDrawingPad,
    );
    environment.uiCtx.capabilities.contribute(
        "study:drawing:load",
        environment.loadDrawingPad,
    );
    return {
        progress,
        templateRequests: () => templateRequests,
        navigate: () => events.get("cognis:route-will-change")?.(),
        open: capabilities.get("study:drawing:open"),
        load: capabilities.get("study:drawing:load"),
        elements,
        moves,
        annotations,
        random: (value) => {
            randomValue = value;
        },
        handlers,
        canvas,
        host,
        pad,
        floatingOptions: () => floatingOptions,
        paints: () => paints,
        flushFrames: () => {
            while (frames.length) frames.shift()();
        },
    };
}

function pointer(x, y) {
    return {
        clientX: 16 + x * 400,
        clientY: 16 + y * 400,
        pointerId: 1,
        pressure: 0.5,
        preventDefault() {},
    };
}

function card(index) {
    return {
        card: {
            id: `card-${index}`,
            label: `Character ${index}`,
            schemaId: "ja",
            layer: "characters",
        },
        definition: `Definition ${index}`,
        pronunciations: [`Reading ${index}`],
        strokePattern: {
            coordinateSystem: "normalized",
            groups: [1],
            strokes: [
                {
                    points: [
                        { x: index / 10, y: 0.2 },
                        { x: 0.8, y: 0.9 },
                    ],
                },
            ],
        },
    };
}

test("every card selection paints its guide when the open pad keeps the same size", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    session.flushFrames();
    for (let index = 2; index <= 5; index += 1) {
        const previousPaints = session.paints();
        assert.equal(await session.load(card(index)), true);
        session.flushFrames();
        assert.ok(
            session.paints() > previousPaints,
            `Card ${index} must repaint`,
        );
        assert.deepEqual(session.moves[0], { x: index * 40, y: 80 });
        assert.equal(
            session.elements.get("[data-card-label]").textContent,
            "漢".repeat("Character 1".length),
        );
        assert.equal(
            session.elements.get("[data-definition]").textContent,
            `Definition ${index}`,
        );
        assert.equal(
            session.elements.get("[data-pronunciations]").textContent,
            `Reading ${index}`,
        );
        assert.equal(session.canvas.width, 400);
        assert.equal(session.canvas.height, 400);
    }
});

test("floating pads request the same large frame for different drawing aspect ratios", async () => {
    const session = await drawingSession();
    const sizes = [];
    for (const columns of [1, 3, 5]) {
        const input = card(columns);
        input.strokePattern.columns = columns;
        input.strokePattern.aspectRatio = columns;
        await session.open(input);
        const { width, height, minWidth, minHeight } =
            session.floatingOptions();
        assert.equal(session.pad.style.width, width);
        assert.equal(session.pad.style.height, height);
        sizes.push({ width, height, minWidth, minHeight });
        session.navigate();
    }
    assert.deepEqual(
        sizes,
        Array(3).fill({
            width: "min(64vw, 48rem)",
            height: "min(68vh, 36rem)",
            minWidth: 360,
            minHeight: 320,
        }),
    );
});

test("the whole pattern is previewed before input and only the next stroke after input across groups", async () => {
    const session = await drawingSession();
    const input = card(1);
    input.strokePattern.groups = [2, 2];
    input.strokePattern.strokes = [0.1, 0.3, 0.5, 0.7].map((x) => ({
        points: [
            { x, y: 0.2 },
            { x, y: 0.8 },
        ],
    }));
    await session.open(input);
    session.flushFrames();
    assert.deepEqual(session.annotations, ["1", "2", "3", "4"]);
    session.canvas.setPointerCapture = () => {};
    for (const [index, x] of [0.1, 0.3, 0.5].entries()) {
        session.handlers.get("pointerdown")(pointer(x, 0.2));
        session.flushFrames();
        assert.deepEqual(session.annotations, [String(index + 1)]);
        session.handlers.get("pointerup")(pointer(x, 0.8));
        await new Promise((resolve) => setImmediate(resolve));
        session.flushFrames();
        assert.deepEqual(session.annotations, [String(index + 2)]);
    }
    session.elements.get("[data-reset]").handlers.get("click")();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(session.annotations, ["1", "2", "3", "4"]);
    session.navigate();
    await session.open(input);
    session.flushFrames();
    assert.deepEqual(session.annotations, ["1", "2", "3", "4"]);

    for (const x of [0.1, 0.3, 0.5, 0.7]) {
        session.handlers.get("pointerdown")(pointer(x, 0.2));
        session.handlers.get("pointerup")(pointer(x, 0.8));
        await new Promise((resolve) => setImmediate(resolve));
        session.flushFrames();
    }
    session.elements.get("[data-try-again]").handlers.get("click")();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(session.annotations, ["?"]);
    session.elements.get("[data-guidance]").handlers.get("click")();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(session.annotations, ["1", "2", "3", "4"]);
    session.navigate();
    await session.open(input);
    session.flushFrames();
    assert.deepEqual(session.annotations, ["?"]);
});

test("drawing uses an independent floating boundary without resizing the main page", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    const boundary = session.pad.parentElement;
    assert.equal(boundary.parentElement, session.host);
    assert.ok(boundary);
    assert.equal(session.floatingOptions().boundaryElement, boundary);
    assert.equal(session.host.style.overflow, undefined);
    assert.equal(session.host.style.maxHeight, undefined);
    assert.equal(session.pad.style.top, "16px");
    assert.equal(session.pad.style.left, "584px");
});

test("stored hiding counts are resampled on each reset and retry", async () => {
    const session = await drawingSession({
        initialProgress: new Map([
            ["card-1", { completed: true, hiddenStrokeCount: 1 }],
        ]),
    });
    const input = card(1);
    input.strokePattern.strokes = Array.from(
        { length: 3 },
        () => input.strokePattern.strokes[0],
    );
    input.strokePattern.groups = [3];
    await session.open(input);
    session.flushFrames();
    assert.deepEqual(session.annotations, ["?"]);
    session.random(1);
    session.elements.get("[data-reset]").handlers.get("click")();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(session.annotations, ["1"]);
    session.random(0);
    session.elements.get("[data-try-again]").handlers.get("click")();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(session.annotations, ["?"]);
});

test("loading another character preserves the moved pad position", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    session.flushFrames();
    session.pad.style.left = "120px";
    session.pad.style.top = "80px";
    session.pad.style.width = "640px";
    session.pad.style.height = "480px";
    session.host.scrollTop = 200;
    const next = card(2);
    next.strokePattern.columns = 2;
    next.strokePattern.aspectRatio = 2;
    assert.equal(await session.load(next), true);
    session.flushFrames();
    assert.equal(session.pad.style.left, "120px");
    assert.equal(session.pad.style.top, "80px");
    assert.equal(session.pad.style.width, "640px");
    assert.equal(session.pad.style.height, "480px");
    assert.equal(
        session.elements.get("[data-card-label]").textContent,
        "漢".repeat("Character 1".length),
    );
    await session.open(card(3));
    session.flushFrames();
    assert.equal(session.pad.style.left, "120px");
    assert.equal(session.pad.style.top, "80px");
});

test("navigation releases the drawing session so a later Explore page can open a fresh pad", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    session.navigate();
    assert.equal(await session.load(card(2)), undefined);
    assert.ok(await session.open(card(2)));
});

test("embedded drawing uses the same scoring, rejects a different character, and aborts cleanly", async () => {
    const session = await drawingSession();
    const controller = new AbortController();
    const results = [];
    const opened = await session.open({
        ...card(1),
        container: session.host,
        signal: controller.signal,
        onResult: (result) => results.push(result),
    });
    assert.equal(session.pad.parentElement.className, "study-drawing-embedded");
    assert.equal(session.floatingOptions(), undefined);
    assert.equal(await opened.load(card(2)), false);
    session.canvas.setPointerCapture = () => {};
    session.handlers.get("pointerdown")(pointer(0.1, 0.2));
    await session.handlers.get("pointerup")(pointer(0.8, 0.9));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(results.at(-1).correct, true);
    controller.abort();
    assert.equal(controller.signal.aborted, true);
});

test("drawing templates are loaded once and unavailable templates fail before mounting", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    session.navigate();
    await session.open(card(2));
    assert.equal(session.templateRequests(), 1);
    const unavailable = await drawingSession({ templateAvailable: false });
    await assert.rejects(
        unavailable.open(card(1)),
        /drawing_template_unavailable/,
    );
});

test("the final stroke saves difficulty before retry and an immediate retry waits for it", async () => {
    const { promise: completionDelay, resolve: finish } =
        Promise.withResolvers();
    const session = await drawingSession({ completionDelay });
    await session.open(card(1));
    session.flushFrames();
    session.canvas.setPointerCapture = () => {};
    session.handlers.get("pointerdown")(pointer(0.1, 0.2));
    session.handlers.get("pointerup")(pointer(0.8, 0.9));
    await new Promise((resolve) => setImmediate(resolve));
    session.elements.get("[data-try-again]").handlers.get("click")();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(session.elements.get("[data-complete]").hidden, true);
    finish();
    await new Promise((resolve) => setImmediate(resolve));
    session.flushFrames();
    assert.equal(session.progress.get("card-1").hiddenStrokeCount, 1);
    assert.deepEqual(session.annotations, ["?"]);
    session.navigate();
    await session.open(card(1));
    session.flushFrames();
    assert.deepEqual(session.annotations, ["?"]);
});

test("closing after the final stroke preserves the completed difficulty without retry", async () => {
    const { promise: completionDelay, resolve: finish } =
        Promise.withResolvers();
    const session = await drawingSession({ completionDelay });
    await session.open(card(1));
    session.canvas.setPointerCapture = () => {};
    session.handlers.get("pointerdown")(pointer(0.1, 0.2));
    session.handlers.get("pointerup")(pointer(0.8, 0.9));
    await new Promise((resolve) => setImmediate(resolve));
    session.navigate();
    finish();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(session.progress.get("card-1").hiddenStrokeCount, 1);
    await session.open(card(1));
    session.flushFrames();
    assert.deepEqual(session.annotations, ["?"]);
});

test("drawing masks its heading, reports the active character, and clears it on close", async () => {
    const changes = [];
    const unsubscribe = observeDrawingCard((value) => changes.push(value));
    const session = await drawingSession();
    const results = [];
    const pad = await session.open({
        ...card(1),
        onResult: (result) => results.push(result),
    });
    const heading = session.elements.get("[data-card-label]");
    assert.equal(heading.textContent, "漢".repeat("Character 1".length));
    assert.equal(changes.at(-1).id, "card-1");
    await heading.handlers.get("click")({ preventDefault() {} });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(heading.textContent, "Character 1");
    assert.equal(heading["aria-expanded"], "true");
    assert.equal(results[0].assisted, true);
    assert.equal(results[0].correct, false);
    await session.load(card(2));
    assert.equal(heading.textContent, "漢".repeat("Character 1".length));
    assert.equal(changes.at(-1).id, "card-2");
    await pad.close();
    assert.equal(changes.at(-1), null);
    unsubscribe();
});

test("guidance reveals every stroke after drawing starts, including completed strokes", async () => {
    for (const completed of [false, true]) {
        const session = await drawingSession({
            initialProgress: new Map([
                ["card-1", { completed, hiddenStrokeCount: 0 }],
            ]),
        });
        const input = card(1);
        input.strokePattern.groups = [3];
        input.strokePattern.strokes = Array(3).fill(
            input.strokePattern.strokes[0],
        );
        await session.open(input);
        session.canvas.setPointerCapture = () => {};
        session.handlers.get("pointerdown")(pointer(0.1, 0.2));
        session.handlers.get("pointerup")(pointer(0.8, 0.9));
        await new Promise((resolve) => setImmediate(resolve));
        session.flushFrames();
        assert.deepEqual(session.annotations, ["2"]);
        const guidance = session.elements.get("[data-guidance]");
        assert.equal(guidance.disabled, false);
        guidance.handlers.get("click")();
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(session.annotations, ["1", "2", "3"]);
        assert.equal(guidance.disabled, true);
        session.navigate();
    }
});

test("embedded callers can suppress retries while standalone practice retains them", async () => {
    for (const suppressRetry of [false, true]) {
        const session = await drawingSession();
        const opened = await session.open({
            ...card(1),
            container: session.host,
            suppressRetry,
        });
        const retry = session.elements.get("[data-try-again]");
        assert.equal(retry.hidden, suppressRetry);
        const completion = session.elements.get("[data-complete]");
        completion.hidden = false;
        retry.handlers.get("click")();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(completion.hidden, !suppressRetry);
        await opened.close();
    }
});
