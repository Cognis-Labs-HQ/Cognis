import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

function fixture(entry = { label: "dog", fields: {} }) {
    const listeners = {};
    const stored = {};
    const picker = {
        value: "",
        disabled: false,
        files: [],
        addEventListener: (_type, handler) => {
            listeners.upload = handler;
        },
    };
    const files = {
        innerHTML: "",
        addEventListener: (_type, handler) => {
            listeners.remove = handler;
        },
    };
    const field = {
        dataset: { imageField: "images" },
        querySelector: (selector) =>
            selector.includes('file"') ? picker : files,
    };
    const form = {
        elements: { "field:images": stored },
        querySelectorAll: () => [field],
        dispatchEvent() {},
        addEventListener() {},
    };
    const deleted = [];
    const revoked = [];
    const fetched = [];
    const errors = [];
    let serial = 0;
    const context = {
        Event,
        Set,
        Map,
        URL: {
            createObjectURL: () => `blob:local-${++serial}`,
            revokeObjectURL: (value) => revoked.push(value),
        },
        escapeHtml: String,
        reportClientError: (error) => errors.push(error),
        showToast() {},
        uploadLibraryImage: async () => ({
            value: `file:uploads/alice/${++serial}.image`,
        }),
        discardLibraryImage: async (value) => {
            deleted.push(value);
            return { discarded: true };
        },
        fetchLibraryImageUrl: async (...args) => {
            fetched.push(args);
            return "blob:bundled";
        },
    };
    Object.assign(
        context,
        loadTestModule(
            new URL(
                "../../../../../ui/reuse/image-preview.js",
                import.meta.url,
            ),
            {
                "./escape-html.js": context,
                "./popup.js": context,
                "./page-styles.js": context,
                "./i18n.js": context,
                "./ui-ctx.js": context,
                "./scoped-actions.js": context,
                "./toast.js": context,
            },
            context,
        ),
    );
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/app/reference-images.js", import.meta.url),
            {
                "/static/reuse/image-preview.js": context,
                "/static/reuse/error-reporting.js": context,
                "/static/reuse/toast.js": context,
                "/static/gateways/study/library-client.js": context,
            },
            context,
        ),
    );
    const controller = new AbortController();
    context.bindReferenceImageUploads(
        form,
        entry,
        { t: (key) => key },
        controller.signal,
    );
    return {
        listeners,
        picker,
        files,
        stored,
        deleted,
        revoked,
        fetched,
        errors,
        controller,
    };
}

test("uploaded images show thumbnails and removing one immediately clears the draft, picker and staged file", async () => {
    const state = fixture();
    state.picker.files = [{ size: 100, name: "dog.png" }];
    await state.listeners.upload();
    assert.match(state.files.innerHTML, /<img[^>]*src="blob:local-/);
    assert.match(state.files.innerHTML, /image-preview-remove/);
    assert.equal(state.stored.libraryFieldValue.length, 1);
    const value = state.stored.libraryFieldValue[0];
    let prevented = false;
    state.picker.value = "selected-file";
    await state.listeners.remove({
        preventDefault: () => {
            prevented = true;
        },
        target: { closest: () => ({ dataset: { imagePreviewRemove: "0" } }) },
    });
    assert.equal(prevented, true);
    assert.equal(state.picker.value, "");
    assert.equal(state.stored.libraryFieldValue.length, 0);
    assert.deepEqual(state.deleted, [value]);
    assert.equal(state.revoked.length, 1);
    state.controller.abort();
});

test("the Library editor loads bundled and staged-request images and releases previews on close", async () => {
    const state = fixture({
        id: "card",
        label: "dog",
        previewRequestId: "request",
        fields: {
            images: [
                "/api/v1/study/library/assets/publisher/pack/1/images/dog.jpg",
            ],
        },
    });
    await new Promise(setImmediate);
    assert.match(state.files.innerHTML, /src="blob:bundled"/);
    assert.deepEqual(state.fetched[0].slice(0, 3), ["card", "images", 0]);
    assert.equal(state.fetched[0][3].requestId, "request");
    state.controller.abort();
    assert.deepEqual(state.revoked, ["blob:bundled"]);
    assert.deepEqual(state.deleted, []);
});

test("closing an unsaved image editor discards uploaded files and releases their previews", async () => {
    const state = fixture();
    state.picker.files = [{ size: 100, name: "dog.png" }];
    await state.listeners.upload();
    const value = state.stored.libraryFieldValue[0];
    state.controller.abort();
    await new Promise(setImmediate);
    assert.deepEqual(state.deleted, [value]);
    assert.equal(state.revoked.length, 1);
});
