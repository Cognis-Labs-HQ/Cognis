import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

function fixture({ getUserMedia, recorderAvailable = true } = {}) {
    let activeRecorder;
    let stops = 0;
    const uploads = [];
    const toasts = [];
    const button = new EventTarget();
    const attributes = new Map();
    button.setAttribute = (name, value) => attributes.set(name, value);
    const picker = new EventTarget();
    const stored = {};
    const filename = {};
    const field = {
        dataset: {},
        querySelector: (selector) =>
            selector.includes("file")
                ? picker
                : selector.includes("hidden")
                  ? stored
                  : selector.includes("filename")
                    ? filename
                    : button,
    };
    const context = {
        reportClientError() {},
        File,
        Blob,
        Event,
        navigator: {
            mediaDevices: {
                getUserMedia:
                    getUserMedia ??
                    (async () => ({
                        getTracks: () => [{ stop: () => stops++ }],
                    })),
            },
        },
        MediaRecorder: class extends EventTarget {
            static isTypeSupported() {
                return true;
            }

            constructor() {
                super();
                activeRecorder = this;
                this.mimeType = "audio/webm;codecs=opus";
            }

            start() {
                this.state = "recording";
            }

            stop() {
                this.state = "inactive";
                const event = new Event("dataavailable");
                event.data = new Blob([
                    new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]),
                ]);
                this.dispatchEvent(event);
                this.dispatchEvent(new Event("stop"));
            }
        },
        uploadLibraryAudio: async (file) => {
            uploads.push(file);
            return { value: "file:uploads/alice/recording.audio" };
        },
        showToast: (...args) => toasts.push(args),
    };
    if (!recorderAvailable) delete context.MediaRecorder;
    vm.createContext(context);
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/app/audio-upload.js", import.meta.url),
            {
                "/static/reuse/error-reporting.js": context,
                "/static/gateways/study/library-client.js": context,
                "/static/reuse/toast.js": context,
            },
            context,
        ),
    );
    const controller = new AbortController();
    context.bindAudioUploads(
        {
            dispatchEvent() {},
            querySelectorAll: (selector) => {
                const playback = { querySelector: () => null };
                return selector === "[data-library-audio-upload]"
                    ? [field]
                    : [field, playback];
            },
        },
        { t: (key) => key },
        controller.signal,
    );
    const click = async () => {
        button.dispatchEvent(new Event("click", { cancelable: true }));
        await new Promise(setImmediate);
    };
    return {
        click,
        controller,
        uploads,
        stored,
        attributes,
        field,
        picker,
        toasts,
        button,
        stops: () => stops,
        recorder: () => activeRecorder,
    };
}

test("microphone recording uploads the captured file and releases all tracks", async () => {
    const context = fixture();
    await context.click();
    assert.equal(context.attributes.get("aria-pressed"), "true");
    assert.equal(context.field.dataset.uploading, "true");
    await context.click();
    assert.equal(context.uploads.length, 1);
    assert.equal(context.uploads[0].type, "audio/webm");
    assert.equal(context.stored.value, "file:uploads/alice/recording.audio");
    assert.equal(context.stored.libraryStagedAudio, context.uploads[0]);
    assert.equal(context.stops(), 1);
    assert.equal(context.attributes.get("aria-pressed"), "false");
});

test("closing the popup discards recording and oversized files never upload", async () => {
    const context = fixture();
    await context.click();
    context.controller.abort();
    await new Promise(setImmediate);
    assert.equal(context.recorder().state, "inactive");
    assert.equal(context.uploads.length, 0);
    assert.ok(context.stops() >= 1);
    const other = fixture();
    other.picker.files = [{ size: 5 * 1024 * 1024 + 1 }];
    other.picker.dispatchEvent(new Event("change"));
    await new Promise(setImmediate);
    assert.equal(other.uploads.length, 0);
    assert.match(other.toasts[0][0], /upload_limit/);
});

test("microphone waits for the permission dialog and ignores repeated clicks while the browser is deciding", async () => {
    let grant;
    let requested = 0;
    const permission = new Promise((resolve) => {
        grant = resolve;
    });
    const context = fixture({
        getUserMedia: () => {
            requested++;
            return permission;
        },
    });
    await context.click();
    await context.click();
    assert.equal(requested, 1);
    assert.equal(context.toasts.length, 0);
    assert.equal(context.recorder(), undefined);
    assert.equal(context.button.disabled, true);
    assert.equal(context.field.dataset.uploading, "true");
    assert.equal(context.attributes.get("aria-busy"), "true");
    grant({ getTracks: () => [{ stop() {} }] });
    await new Promise(setImmediate);
    assert.equal(context.recorder().state, "recording");
    assert.equal(context.attributes.get("aria-busy"), "false");
    await context.click();
    assert.equal(context.uploads.length, 1);
});

test("closing during microphone permission discards a late stream; denying permission reports an error only after the response", async () => {
    let grant;
    let stops = 0;
    const context = fixture({
        getUserMedia: () =>
            new Promise((resolve) => {
                grant = resolve;
            }),
    });
    await context.click();
    context.controller.abort();
    grant({
        getTracks: () => [
            {
                stop() {
                    stops++;
                },
            },
        ],
    });
    await new Promise(setImmediate);
    assert.equal(stops, 1);
    assert.equal(context.uploads.length, 0);
    assert.equal(context.toasts.length, 0);
    let deny;
    const denied = fixture({
        getUserMedia: () =>
            new Promise((_resolve, reject) => {
                deny = reject;
            }),
        recorderAvailable: false,
    });
    await denied.click();
    assert.equal(denied.toasts.length, 0);
    const error = new Error("denied");
    error.name = "NotAllowedError";
    deny(error);
    await new Promise(setImmediate);
    assert.match(denied.toasts[0][0], /permission_denied/);
    assert.equal(denied.button.disabled, false);
});
