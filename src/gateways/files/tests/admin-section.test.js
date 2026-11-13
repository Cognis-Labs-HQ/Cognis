import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
const client = vm.createContext({ TextEncoder, Blob });
Object.assign(
    client,
    loadTestModule(
        new URL("../ui/client.js", import.meta.url),
        { "/static/reuse/api-client.js": client },
        client,
    ),
);
const {
    loadNamespaceQuotaDefaults,
    updateGlobalQuotaDefault,
    updateNamespaceQuotaDefault,
} = client;

function apiRecorder(data = {}) {
    const calls = [];
    return {
        calls,
        apiFetch: async (url, options) => {
            calls.push({ url, options });
            return { ok: true, json: async () => ({ data }) };
        },
    };
}

test("files UI client owns namespace quota endpoint requests", async () => {
    const recorder = apiRecorder({ namespaces: [], globalDefault: 1024 });
    assert.deepEqual(await loadNamespaceQuotaDefaults(recorder.apiFetch), {
        namespaces: [],
        globalDefault: 1024,
    });
    await updateNamespaceQuotaDefault(recorder.apiFetch, "profile media", 2048);
    await updateGlobalQuotaDefault(recorder.apiFetch, 4096);
    assert.deepEqual(JSON.parse(JSON.stringify(recorder.calls)), [
        { url: "/api/v1/files/admin/namespace-defaults" },
        {
            url: "/api/v1/files/admin/namespace-defaults/profile%20media",
            options: {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ quotaBytes: 2048 }),
            },
        },
        {
            url: "/api/v1/files/admin/global-default",
            options: {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ quotaBytes: 4096 }),
            },
        },
    ]);
});

test("files gateway contributes its namespace quota administration section", async () => {
    const root = resolve(import.meta.dirname, "..");
    const [bootstrap, section] = await Promise.all([
        readFile(resolve(root, "bootstrap.ts"), "utf8"),
        readFile(resolve(root, "ui/admin-section.js"), "utf8"),
    ]);
    assert.match(
        bootstrap,
        /registerAdminSection\(\{[\s\S]*id: "file-namespace-quotas"/,
    );
    assert.match(section, /loadNamespaceQuotaDefaults/);
    assert.match(section, /updateNamespaceQuotaDefault/);
    assert.match(section, /updateGlobalQuotaDefault/);
    assert.match(section, /subComposerOptions/);
});

test("quota administration renders current defaults and saves the chosen namespace", async () => {
    const recorder = apiRecorder({
        globalDefault: 1024,
        namespaces: [
            {
                namespaceId: "study",
                ownerComponent: "study",
                visibility: "private",
                quotaBytes: 2048,
            },
        ],
    });
    const toasts = [];
    const context = vm.createContext({ ...client, CSS: { escape: String } });
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/admin-section.js", import.meta.url),
            { "./client.js": context },
            context,
        ),
    );
    const section = context.createAdminSection({
        i18n: { t: (key) => key },
        apiFetch: recorder.apiFetch,
        escapeHtml: String,
        showToast: (...args) => toasts.push(args),
    });
    await section.dataReady;
    const html = section.subComposerOptions.elements[0].render();
    assert.match(html, /value="2048"/);
    let save;
    const panel = {
        querySelector: (selector) =>
            selector === "[data-files-save-global]" ? null : { value: "4096" },
        querySelectorAll: () => [
            {
                dataset: { filesSaveNamespace: "study" },
                addEventListener: (_event, callback) => {
                    save = callback;
                },
            },
        ],
    };
    section.subComposerOptions.onRender({ querySelector: () => panel });
    await save();
    assert.equal(
        recorder.calls.at(-1).url,
        "/api/v1/files/admin/namespace-defaults/study",
    );
    assert.equal(
        JSON.parse(recorder.calls.at(-1).options.body).quotaBytes,
        4096,
    );
    assert.equal(toasts.at(-1)[1].variant, "success");
});
