import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { compactDrawingPattern } from "../ui/layout.js";
import { drawingViewport } from "../ui/viewport.js";

async function drawingSession() {
    const capabilities = new Map();
    const elements = new Map();
    const moves = [];
    const frames = [];
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
    const element = () => ({
        style: { setProperty() {} },
        classList: { add() {}, remove() {} },
        addEventListener() {},
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
            capabilities: {
                get: (key) => capabilities.get(key),
                contribute: (key, value) => capabilities.set(key, value),
            },
        },
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
            addEventListener() {},
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
        new URL("../ui/provider.js", import.meta.url),
        "utf8",
    ).replace(/^import .*;\n/gm, "");
    await vm.runInNewContext(`(async () => { ${source} })()`, environment);
    return {
        open: capabilities.get("study:drawing:open"),
        load: capabilities.get("study:drawing:load"),
        elements,
        moves,
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
    session.open(card(1));
    session.flushFrames();
    for (let index = 2; index <= 5; index += 1) {
        const previousPaints = session.paints();
        assert.equal(session.load(card(index)), true);
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

test("drawing opens inside the main page through a container-bound floating window", async () => {
    const session = await drawingSession();
    session.open(card(1));
    assert.equal(session.pad.parentElement, session.host);
    assert.equal(session.floatingOptions().boundaryElement, session.host);
    assert.equal(session.pad.style.top, "16px");
    assert.equal(session.pad.style.left, "584px");
});

test("loading another character preserves the moved pad position", async () => {
    const session = await drawingSession();
    session.open(card(1));
    session.flushFrames();
    session.pad.style.left = "120px";
    session.pad.style.top = "80px";
    session.host.scrollTop = 200;
    const next = card(2);
    next.strokePattern.columns = 2;
    next.strokePattern.aspectRatio = 2;
    assert.equal(session.load(next), true);
    session.flushFrames();
    assert.equal(session.pad.style.left, "120px");
    assert.equal(session.pad.style.top, "80px");
    assert.equal(
        session.elements.get("[data-card-label]").textContent,
        "Character 2",
    );
    session.open(card(3));
    session.flushFrames();
    assert.equal(session.pad.style.left, "120px");
    assert.equal(session.pad.style.top, "80px");
});
