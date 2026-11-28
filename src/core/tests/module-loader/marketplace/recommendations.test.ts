import test from "node:test";
import assert from "node:assert/strict";
import { createRecommendationReader } from "../../../services/module-loader/marketplace/recommendations.js";
import { ModuleMarketplaceService } from "../../../services/module-loader/marketplace/index.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const response = (ids: string[]) => new Response(JSON.stringify(ids));

test("public marketplace reads share the cache and configuration changes select the new feed", async (context) => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-recommendations-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    const originalFetch = globalThis.fetch;
    context.after(() => {
        globalThis.fetch = originalFetch;
    });
    const urls: string[] = [];
    globalThis.fetch = async (url) => {
        urls.push(String(url));
        return response([first]);
    };
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    await service.saveSettings({
        recommendedModulesUrl: "https://example.test/first",
    });
    await Promise.all([
        service.listRecommendedModuleUuids(),
        service.listRecommendedModuleUuids(),
    ]);
    assert.deepEqual(urls, ["https://example.test/first"]);
    await service.listRecommendedModuleUuids(true);
    await service.saveSettings({
        recommendedModulesUrl: "https://example.test/second",
    });
    await service.listRecommendedModuleUuids();
    assert.deepEqual(urls, [
        "https://example.test/first",
        "https://example.test/first",
        "https://example.test/second",
    ]);
});

test("marketplace recommendations coalesce and remain fresh across ordinary polls", async () => {
    let requests = 0,
        now = 0;
    const read = createRecommendationReader(
        () => {},
        async () => {
            requests++;
            return response([first, first, "invalid"]);
        },
        () => now,
    );
    assert.deepEqual(
        await Promise.all([
            read("https://example.test/feed"),
            read("https://example.test/feed"),
        ]),
        [[first], [first]],
    );
    for (let poll = 0; poll < 19; poll++) {
        now += 15_000;
        const values = await read("https://example.test/feed");
        values.push(second);
    }
    assert.equal(requests, 1);
    now += 15_000;
    assert.deepEqual(await read("https://example.test/feed"), [first]);
    assert.equal(requests, 2);
    await read("https://example.test/feed", true);
    assert.equal(requests, 3);
});

test("a failed refresh retains the shared result and retries after its failure backoff", async () => {
    let healthy = true,
        requests = 0,
        now = 0;
    const logs: unknown[][] = [];
    const read = createRecommendationReader(
        (...args) => logs.push(args),
        async () => {
            requests++;
            return healthy
                ? response([first])
                : new Response(null, { status: 503 });
        },
        () => now,
    );
    await read("https://example.test/feed");
    healthy = false;
    now = 300_000;
    assert.deepEqual(await read("https://example.test/feed"), [first]);
    await read("https://example.test/feed");
    assert.equal(requests, 2);
    assert.equal(logs.length, 1);
    healthy = true;
    now += 60_000;
    await read("https://example.test/feed");
    assert.equal(requests, 3);
});

test("a changed feed cannot receive a late cached result from the previous URL", async () => {
    let finish: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => {
        finish = resolve;
    });
    let requests = 0;
    const read = createRecommendationReader(
        () => {},
        async (url) => {
            requests++;
            return url.endsWith("/earlier") ? pending : response([second]);
        },
    );
    const earlier = read("https://example.test/earlier");
    assert.deepEqual(await read("https://example.test/current"), [second]);
    finish!(response([first]));
    assert.deepEqual(await earlier, [first]);
    assert.deepEqual(await read("https://example.test/current"), [second]);
    assert.equal(requests, 2);
});
