import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import assert from "node:assert/strict";
import vm from "node:vm";
import test from "node:test";

test("uploaded and recorded drafts replace saved playback, survive late reads and release preview URLs", async () => {
    const revoked = [];
    const played = [];
    let resolveFetch;
    let click;
    const audio = Object.assign(new EventTarget(), {
        dataset: { libraryAudioEntry: "card", libraryAudioField: "audio" },
        isConnected: true,
        src: "",
        closest: () => null,
        pause() {},
        play() {
            played.push(this.src);
            setImmediate(() => this.dispatchEvent(new Event("ended")));
            return Promise.resolve();
        },
    });
    const toggle = {
        disabled: false,
        addEventListener: (_type, listener) => {
            click = listener;
        },
    };
    const stored = {};
    const field = {
        querySelector: (selector) =>
            selector === "audio"
                ? audio
                : selector.includes("toggle")
                  ? toggle
                  : stored,
    };
    const group = {
        querySelectorAll: () => [audio],
        querySelector: () => toggle,
    };
    const form = Object.assign(new EventTarget(), {
        classList: { contains: () => false },
        querySelectorAll: (selector) => {
            if (selector === "[data-library-audio-sequence]") return [group];
            if (selector === "[data-library-audio-upload]") return [field];
            if (selector === "audio") return [audio];
            return [];
        },
    });
    const context = vm.createContext({
        URL: {
            createObjectURL: (file) => `blob:${file.name}`,
            revokeObjectURL: (url) => revoked.push(url),
        },
        fetchLibraryAudioUrl: () =>
            new Promise((resolve) => {
                resolveFetch = resolve;
            }),
    });
    Object.assign(
        context,
        loadLibraryUiModule("app/audio-media-session.js", context),
    );
    Object.assign(context, loadLibraryUiModule("app/presentation.js", context));
    Object.assign(context, loadLibraryUiModule("app/audio-editor.js", context));
    const controller = new AbortController();
    context.bindAudioEditor(
        form,
        { id: "card" },
        { t: String },
        controller.signal,
    );
    const pending = click();
    stored.libraryStagedAudio = new File(["uploaded"], "upload.wav");
    form.dispatchEvent(new Event("change"));
    resolveFetch("blob:saved");
    await pending;
    assert.deepEqual(played, ["blob:upload.wav"]);
    assert.ok(revoked.includes("blob:saved"));
    stored.libraryStagedAudio = new File(["recorded"], "recording");
    form.dispatchEvent(new Event("change"));
    await click();
    assert.deepEqual(played, ["blob:upload.wav", "blob:recording"]);
    assert.ok(revoked.includes("blob:upload.wav"));
    controller.abort();
    assert.ok(revoked.includes("blob:recording"));
});

test("new cards without saved audio have a disabled speaker ready for staged playback", () => {
    const context = vm.createContext({
        escapeHtml: String,
        document: { documentElement: { lang: "en" } },
        parseLanguageCode: String,
    });
    Object.assign(
        context,
        loadLibraryUiModule("app/audio-media-session.js", context),
    );
    Object.assign(context, loadLibraryUiModule("app/presentation.js", context));
    Object.assign(context, loadLibraryUiModule("app/audio-editor.js", context));
    const field = {
        id: "audio",
        type: "audio",
        metadata: { labels: { en: "Audio" } },
    };
    const html = context.renderAudioEditor(
        { language: "en", fields: {} },
        { fields: [field] },
        field,
        { t: String },
    );
    assert.match(html, /<audio /);
    assert.match(html, /data-library-audio-sequence-toggle disabled/);
});

test("a regeneration started before a newer upload cannot replace that draft", async () => {
    let refresh;
    let resolveFetch;
    const revoked = [];
    const stored = { value: "file:saved" };
    const audio = { isConnected: true, src: "blob:staged", pause() {} };
    const button = {
        dataset: { libraryRefreshAudio: "audio" },
        addEventListener: (_event, listener) => {
            refresh = listener;
        },
        closest: () => ({ querySelector: () => audio }),
    };
    const form = Object.assign(new EventTarget(), {
        elements: { namedItem: () => stored },
        classList: { contains: () => false },
        querySelectorAll: (selector) =>
            selector === "[data-library-refresh-audio]" ? [button] : [],
    });
    const context = vm.createContext({
        URL: { revokeObjectURL: (url) => revoked.push(url) },
        loadLibraryAudio() {},
        fetchLibraryAudioUrl: () =>
            new Promise((resolve) => {
                resolveFetch = resolve;
            }),
    });
    Object.assign(context, loadLibraryUiModule("app/audio-editor.js", context));
    context.bindAudioEditor(
        form,
        { id: "card" },
        { t: String },
        new AbortController().signal,
    );
    const pending = refresh();
    stored.value = "file:new-upload";
    stored.libraryStagedAudio = new File(["new"], "new.wav");
    resolveFetch("blob:regenerated");
    await pending;
    assert.equal(stored.value, "file:new-upload");
    assert.equal(audio.src, "blob:staged");
    assert.deepEqual(revoked, ["blob:regenerated"]);
});
