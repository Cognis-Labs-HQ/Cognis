import { loadLibraryUiModule } from "../reuse/ui-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("system media metadata names the playing card and layer, publishes Cognis artwork and owns controls until disposal", async () => {
    const handlers = new Map();
    const session = {
        setActionHandler: (action, handler) => handlers.set(action, handler),
    };
    const context = vm.createContext({
        URL,
        window: { location: { origin: "https://cognis.example" } },
        navigator: { mediaSession: session },
        MediaMetadata: class {
            constructor(input) {
                Object.assign(this, input);
            }
        },
        createI18n: async () => ({
            t: (key) => {
                assert.equal(key, "ui.reuse.brand_name");
                return "Cognis";
            },
        }),
    });
    Object.assign(
        context,
        loadLibraryUiModule("app/audio-media-session.js", context),
    );
    const controller = new AbortController();
    const audio = Object.assign(new EventTarget(), {
        isConnected: true,
        dataset: {
            libraryAudioTitle: "先生と学校へ行く",
            libraryAudioAlbum: "Sentences",
        },
        currentTime: 3,
        play() {
            this.dispatchEvent(new Event("play"));
            return Promise.resolve();
        },
        pause() {
            this.dispatchEvent(new Event("pause"));
        },
    });
    await context.activateLibraryMediaSession(audio, controller.signal);
    assert.equal(session.metadata.title, "先生と学校へ行く");
    assert.equal(session.metadata.artist, "Cognis");
    assert.equal(session.metadata.album, "Sentences");
    assert.equal(
        session.metadata.artwork[1].src,
        "https://cognis.example/static/assets/icons/cognis-icon-512.png",
    );
    assert.equal(session.metadata.artwork[1].sizes, "512x512");
    assert.equal(session.metadata.artwork[1].type, "image/png");
    await handlers.get("play")();
    assert.equal(session.playbackState, "playing");
    handlers.get("pause")();
    assert.equal(session.playbackState, "paused");
    handlers.get("stop")();
    assert.equal(audio.currentTime, 0);
    assert.equal(session.playbackState, "none");
    const next = Object.assign(new EventTarget(), {
        isConnected: true,
        dataset: { libraryAudioTitle: "学校" },
    });
    const nextController = new AbortController();
    await context.activateLibraryMediaSession(next, nextController.signal);
    controller.abort();
    assert.equal(session.metadata.title, "学校");
    nextController.abort();
    assert.equal(session.metadata, null);
    assert.equal(handlers.get("play"), null);
});
