import test from "node:test";
import assert from "node:assert/strict";
import { CredentialContext } from "../../../services/module-loader/marketplace/credential-context.js";
import { fetchMarketplaceResource } from "../../../services/module-loader/marketplace/request.js";

test("credential-bearing operations redact raw, escaped and basic-auth secrets in nested logs and errors", async () => {
    const context = new CredentialContext();
    const entries: unknown[] = [];
    const log = context.logger((...entry) => entries.push(entry));
    const secret = "private/PAT+?";
    const encoded = encodeURIComponent(secret);
    const basic = Buffer.from(`oauth2:${secret}`).toString("base64");
    await assert.rejects(
        context.run(secret, async () => {
            log("error", `fetch failed: ${secret}`, {
                nested: [{ encoded, basic }],
            });
            throw Object.assign(
                new Error(`failure ${secret} ${encoded} ${basic}`),
                { code: secret },
            );
        }),
        (error) => {
            assert.ok(error instanceof Error);
            assert.equal(
                error.message,
                "failure [redacted] [redacted] [redacted]",
            );
            assert.equal(
                (error as Error & { code: string }).code,
                "[redacted]",
            );
            return true;
        },
    );
    assert.deepEqual(entries, [
        [
            "error",
            "fetch failed: [redacted]",
            { nested: [{ encoded: "[redacted]", basic: "[redacted]" }] },
        ],
    ]);
    log("info", "public", { value: "unrelated" });
    assert.deepEqual(entries[1], ["info", "public", { value: "unrelated" }]);
});

test("marketplace requests reject redirects and retain caller cancellation with bounded lifetime", async (t) => {
    let captured: RequestInit | undefined;
    const controller = new AbortController();
    t.mock.method(globalThis, "fetch", async (_url, options) => {
        captured = options;
        return new Response("{}");
    });
    await fetchMarketplaceResource("https://example.test/api", {
        headers: { authorization: "Bearer test-only" },
        signal: controller.signal,
    });
    assert.equal(captured?.redirect, "error");
    assert.equal(captured?.signal?.aborted, false);
    controller.abort();
    assert.equal(captured?.signal?.aborted, true);
});
