import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { pronunciationClass } from "../../../../../gateways/study/ui/reuse/pronunciation.js";

const context = { pronunciationClass };
vm.createContext(context);
Object.assign(
    context,
    loadTestModule(
        new URL("../../ui/app/detail-layout.js", import.meta.url),
        {
            "./reference-images.js": context,
            "./drawing.js": context,
            "./presentation.js": context,
            "/static/gateways/study/reuse/pronunciation.js": context,
        },
        context,
    ),
);
const { bindDetailLayout } = context;

test("related cards scroll only beyond five rows and release their resize observer", () => {
    let resized;
    let disconnected = false;
    context.ResizeObserver = class {
        constructor(callback) {
            resized = callback;
        }

        observe() {}

        disconnect() {
            disconnected = true;
        }
    };
    const classes = new Set();
    const group = {
        children: [0, 20, 40, 60, 80].map((offsetTop) => ({ offsetTop })),
        classList: {
            remove: (name) => classes.delete(name),
            toggle: (name, enabled) =>
                enabled ? classes.add(name) : classes.delete(name),
        },
    };
    const reading = {
        textContent: "/ˈlæŋɡwɪdʒ/",
        classList: { add: (name) => classes.add(name) },
    };
    const root = {
        querySelector: () => null,
        classList: { add() {} },
        querySelectorAll: (selector) =>
            selector === ".library-related-entries" ? [group] : [reading],
    };
    const controller = new AbortController();
    bindDetailLayout(root, controller.signal);
    assert.ok(classes.has("study-ipa"));
    assert.ok(!classes.has("library-related-entries--scrolling"));
    group.children.push({ offsetTop: 100 });
    resized([{ target: group, contentRect: { width: 300 } }]);
    assert.ok(classes.has("library-related-entries--scrolling"));
    group.children[5].offsetTop = 80;
    resized([{ target: group, contentRect: { width: 600 } }]);
    assert.ok(!classes.has("library-related-entries--scrolling"));
    controller.abort();
    assert.ok(disconnected);
});

test("entry previews initialize drawing concealment and audio with the same abortable context", () => {
    const calls = [];
    let disconnected = false;
    const root = { querySelector: () => null, querySelectorAll: () => [] };
    const entry = { id: "character", label: "学" };
    const controller = new AbortController();
    const objectUrls = new Set();
    const popupApi = { setContentConcealed() {}, appendHeadingAccessory() {} };
    context.ResizeObserver = class {
        observe() {}

        disconnect() {
            disconnected = true;
        }
    };
    context.bindDrawingPreview = (...args) => calls.push(["drawing", ...args]);
    context.placeAudioSpeaker = (...args) => calls.push(["speaker", ...args]);
    context.loadLibraryAudio = (...args) => {
        calls.push(["audio", ...args]);
        return Promise.resolve();
    };
    context.loadReferenceImages = (...args) => {
        calls.push(["images", ...args]);
        return Promise.resolve();
    };
    context.bindEntryDetail(root, entry, {
        signal: controller.signal,
        audioObjectUrls: objectUrls,
        popupApi,
        audioError: "localized-error",
    });
    const images = calls.pop();
    assert.equal(images[0], "images");
    assert.equal(images[1], root);
    assert.equal(images[2].signal, controller.signal);
    assert.equal(images[2].objectUrls, objectUrls);
    assert.deepEqual(calls, [
        ["drawing", popupApi, entry, controller.signal],
        ["speaker", root, controller.signal, popupApi],
        ["audio", root, objectUrls, controller.signal, "localized-error"],
    ]);
    controller.abort();
    assert.equal(disconnected, true);
});
