import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

test("documentation titles arrive before content, content concurrency is bounded, and cancellation stops indexing", async () => {
    const controller = new AbortController();
    const emitted = [];
    let active = 0;
    let maximum = 0;
    let bodyCalls = 0;
    const { collectGlobalDocsSearchGroups } = loadTestModule(
        new URL("../docs-index.js", import.meta.url),
        {},
        {
            localStorage: { getItem: () => null },
            console,
            fetch: async (path, options) => {
                assert.equal(options.signal, controller.signal);
                if (path === "/api/v1/docs")
                    return {
                        ok: true,
                        json: async () => ({
                            data: Array.from({ length: 25 }, (_, i) => ({
                                slug: `guide-${i}`,
                                title: `Guide ${i}`,
                            })),
                        }),
                    };
                bodyCalls++;
                active++;
                maximum = Math.max(maximum, active);
                return await new Promise((resolve, reject) =>
                    options.signal.addEventListener(
                        "abort",
                        () => {
                            active--;
                            reject(options.signal.reason);
                        },
                        { once: true },
                    ),
                );
            },
        },
    );
    const indexing = collectGlobalDocsSearchGroups({
        signal: controller.signal,
        onResults: (groups) => emitted.push(groups),
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(emitted[0][0].items.length, 25);
    assert.equal(emitted[0][0].items[0].url, "/docs/guide-0");
    assert.equal(maximum, 4);
    controller.abort();
    const groups = await indexing;
    assert.equal(bodyCalls, 4);
    assert.equal(active, 0);
    assert.equal(groups[0].items.length, 25);
    assert.equal(emitted.length, 1);
});
