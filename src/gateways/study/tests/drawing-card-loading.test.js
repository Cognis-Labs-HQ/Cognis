import { formatTemplate } from "../../../ui/reuse/format-template.js";
import { escapeHtml } from "../../../ui/reuse/escape-html.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../../../ui/reuse/ui-ctx.js";
import { compactDrawingPattern } from "../ui/reuse/drawing-layout.js";
import { drawingViewport } from "../ui/reuse/drawing-viewport.js";

async function drawingSession({ templateAvailable = true } = {}) {
    let templateRequests = 0;
    const capabilities = new Map();
    const elements = new Map();
    const moves = [];
    const frames = [];
    const events = new Map();
    let paints = 0;
    const context = {
        clearRect() {
            paints += 1;
            moves.length = 0;
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
        fillText() {},
    };
    const handlers = new Map();
    const element = () => ({
        clientWidth: 1000,
        scrollTop: 0,
        append(child) {
            child.parentElement = this;
        },
        style: { setProperty() {} },
        classList: { add() {}, remove() {} },
        addEventListener(event, handler) {
            handlers.set(event, handler);
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
    let floatingOptions;
    capabilities.set("ui:makeFloatingWindow", (element, options) => {
        floatingOptions = options;
        return () => {};
    });
    const environment = {
        AbortController,
        compactDrawingPattern,
        drawingViewport,
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
                        new URL("../ui/reuse/drawing.html", import.meta.url),
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
    const source = readFileSync(
        new URL("../ui/reuse/drawing.js", import.meta.url),
        "utf8",
    )
        .replace(/^import .*;\n/gm, "")
        .replaceAll("export function", "function")
        .replaceAll("export async function", "async function");
    const actionSource = readFileSync(
        new URL("../ui/reuse/action-flows.js", import.meta.url),
        "utf8",
    )
        .replace(/^import .*;\n/gm, "")
        .replaceAll("export function", "function")
        .replaceAll("export async function", "async function");
    vm.runInNewContext(
        actionSource + "; globalThis.createActionRunner = createActionRunner;",
        environment,
    );
    await vm.runInNewContext(
        `(async () => { ${source}; uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad); uiCtx.capabilities.contribute("study:drawing:load", loadDrawingPad); })()`,
        environment,
    );
    return {
        templateRequests: () => templateRequests,
        navigate: () => events.get("cognis:route-will-change")?.(),
        open: capabilities.get("study:drawing:open"),
        load: capabilities.get("study:drawing:load"),
        elements,
        moves,
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

function card(index) {
    return {
        card: { id: `card-${index}`, label: `Character ${index}` },
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
            `Character ${index}`,
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

test("drawing uses an independent floating boundary without resizing the main page", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    const boundary = session.pad.parentElement;
    assert.equal(boundary.parentElement, session.host);
    assert.equal(boundary.className, "study-drawing-host");
    assert.equal(session.floatingOptions().boundaryElement, boundary);
    assert.equal(session.host.style.overflow, undefined);
    assert.equal(session.host.style.maxHeight, undefined);
    assert.equal(session.pad.style.top, "16px");
    assert.equal(session.pad.style.left, "584px");
});

test("loading another character preserves the moved pad position", async () => {
    const session = await drawingSession();
    await session.open(card(1));
    session.flushFrames();
    session.pad.style.left = "120px";
    session.pad.style.top = "80px";
    session.host.scrollTop = 200;
    const next = card(2);
    next.strokePattern.columns = 2;
    next.strokePattern.aspectRatio = 2;
    assert.equal(await session.load(next), true);
    session.flushFrames();
    assert.equal(session.pad.style.left, "120px");
    assert.equal(session.pad.style.top, "80px");
    assert.equal(
        session.elements.get("[data-card-label]").textContent,
        "Character 2",
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
    const point = (x, y) => ({
        clientX: 16 + x * 400,
        clientY: 16 + y * 400,
        pointerId: 1,
        pressure: 0.5,
        preventDefault() {},
    });
    session.canvas.setPointerCapture = () => {};
    session.handlers.get("pointerdown")(point(0.1, 0.2));
    await session.handlers.get("pointerup")(point(0.8, 0.9));
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
