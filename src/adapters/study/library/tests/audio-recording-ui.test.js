import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
    new URL("../ui/app/audio-upload.js", import.meta.url),
    "utf8",
)
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/\bexport /g, "");

function fixture() {
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
        navigator: {
            mediaDevices: {
                getUserMedia: async () => ({
                    getTracks: () => [{ stop: () => stops++ }],
                }),
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
    vm.createContext(context);
    vm.runInContext(source, context);
    const controller = new AbortController();
    context.bindAudioUploads(
        { querySelectorAll: () => [field] },
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
