import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { resolveReleaseChangelogStatus } from "../../../layouts/release-changelog/status.js";

function fixture() {
    const response = Promise.withResolvers();
    const closed = Promise.withResolvers();
    const writes = [];
    let popup;
    const { maybeShowReleaseChangelogPopup } = loadTestModule(
        new URL("../../../layouts/release-changelog/popup.js", import.meta.url),
        {
            "../../reuse/api-client.js": {
                apiFetch: async (_url, options) => {
                    await response.promise;
                    options.signal.throwIfAborted();
                    return Response.json({
                        data: {
                            releaseVersion: "1.0",
                            entries: [
                                {
                                    slug: "release",
                                    title: "Release",
                                    changes: [],
                                },
                            ],
                        },
                    });
                },
            },
            "../../reuse/escape-html.js": { escapeHtml: (value) => value },
            "../../reuse/commit-links.js": {
                linkShortCommitRefs: (value) => value,
            },
            "../../reuse/markdown-renderer.js": {
                renderMarkdown: (value) => value,
            },
            "../../reuse/i18n.js": { readPreferredLanguages: () => ["en"] },
            "../../reuse/popup.js": {
                openPopup: async (options) => {
                    popup = options;
                    options.signal.addEventListener(
                        "abort",
                        () => closed.resolve(null),
                        { once: true },
                    );
                    return closed.promise;
                },
            },
            "../../reuse/app-router.js": { navigateTo: async () => {} },
            "../../reuse/ui-ctx.js": {
                uiCtx: { capabilities: { get: () => undefined } },
            },
            "../../reuse/ui-preferences.js": {
                loadUiPreferences: async () => ({}),
                saveUiPreferences: async (value) => writes.push(value),
            },
            "./state.js": {
                loadReleaseChangelogState: async () => ({
                    seenSlugs: [],
                    lastVersion: null,
                }),
                saveReleaseChangelogState: async (value) => writes.push(value),
            },
            "./status.js": { resolveReleaseChangelogStatus },
        },
        { localStorage: { getItem: () => "fixture" }, DOMException, Response },
    );
    const controller = new AbortController();
    const work = maybeShowReleaseChangelogPopup(
        { t: (key) => key },
        { signal: controller.signal },
    );
    return { response, closed, writes, controller, work, popup: () => popup };
}

const tick = () => new Promise(setImmediate);

test("the changelog task stays pending across data loading and popup display, then persists acknowledgement", async () => {
    const state = fixture();
    let finished = false;
    void state.work.then(() => {
        finished = true;
    });
    await tick();
    assert.equal(state.popup(), undefined);
    assert.equal(finished, false);
    state.response.resolve();
    await tick();
    assert.equal(state.popup().signal, state.controller.signal);
    assert.equal(finished, false);
    assert.deepEqual(state.writes, []);
    state.closed.resolve("dismiss");
    await state.work;
    assert.equal(state.writes.length, 2);
    assert.deepEqual(Array.from(state.writes[1].seenSlugs), ["release"]);
});

test("navigation cancels an open changelog and does not acknowledge an aborted popup", async () => {
    const state = fixture();
    state.response.resolve();
    await tick();
    state.controller.abort();
    await assert.rejects(state.work, { name: "AbortError" });
    assert.deepEqual(state.writes, []);
});
