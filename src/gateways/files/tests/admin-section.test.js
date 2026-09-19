import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
    loadNamespaceQuotaDefaults,
    updateGlobalQuotaDefault,
    updateNamespaceQuotaDefault,
} from "../ui/client.js";

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
    assert.deepEqual(recorder.calls, [
        { url: "/api/v1/files/admin/namespace-defaults", options: undefined },
        {
            url: "/api/v1/files/admin/namespace-defaults/profile%20media",
            options: {
                method: "PUT",
                body: JSON.stringify({ quotaBytes: 2048 }),
            },
        },
        {
            url: "/api/v1/files/admin/global-default",
            options: {
                method: "PUT",
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
