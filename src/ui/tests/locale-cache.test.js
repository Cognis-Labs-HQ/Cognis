import test from "node:test";
import assert from "node:assert/strict";
import { workerFixture } from "./fixtures/offline-worker.js";

const catalogPath = "/static/app/modules/languages/en/strings.xml";

async function cachedCatalog(options) {
    const worker = workerFixture(options);
    worker.serve(() => new Response("previous catalog"));
    await worker.request(catalogPath);
    return worker;
}

test("mutable catalogs await current bytes and coalesce concurrent refreshes", async () => {
    const worker = await cachedCatalog();
    const current = Promise.withResolvers();
    let requests = 0;
    worker.serve((_url, options) => {
        requests++;
        assert.equal(options.cache, "no-cache");
        assert.equal(options.credentials, "omit");
        return current.promise;
    });
    const pending = Array.from({ length: 10 }, () =>
        worker.request(catalogPath),
    );
    let resolved = false;
    void pending[0].then(() => {
        resolved = true;
    });
    await new Promise(setImmediate);
    assert.equal(requests, 1);
    assert.equal(resolved, false);
    current.resolve(new Response("current catalog"));
    for (const response of await Promise.all(pending)) {
        assert.equal(await response.text(), "current catalog");
    }
    worker.serve(() => new Response("next catalog"));
    assert.equal(
        await (await worker.request(catalogPath)).text(),
        "next catalog",
    );
});

for (const failure of ["network", "gateway"]) {
    test(`${failure} failure retains the cached catalog and permits a later retry`, async () => {
        const worker = await cachedCatalog();
        worker.serve(() => {
            if (failure === "network") throw new TypeError("unreachable");
            return new Response("unavailable", { status: 503 });
        });
        assert.equal(
            await (await worker.request(catalogPath)).text(),
            "previous catalog",
        );
        worker.serve(() => new Response("recovered catalog"));
        assert.equal(
            await (await worker.request(catalogPath)).text(),
            "recovered catalog",
        );
        assert.equal(worker.requests.length, 3);
    });
}

test("a stalled refresh uses the existing four-second deadline and releases coalesced waiters for retry", async () => {
    const deadlines = [];
    const worker = await cachedCatalog({
        abortSignal: {
            timeout(milliseconds) {
                assert.equal(milliseconds, 4000);
                const deadline = new AbortController();
                deadlines.push(deadline);
                return deadline.signal;
            },
            any: AbortSignal.any,
        },
    });
    let receivedSignal;
    worker.serve((_url, { signal }) => {
        receivedSignal = signal;
        return new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
            });
        });
    });
    const requests = Array.from({ length: 4 }, () =>
        worker.request(catalogPath),
    );
    await new Promise(setImmediate);
    const deadline = deadlines.at(-1);
    assert.equal(receivedSignal.aborted, false);
    assert.equal(worker.requests.length, 2);
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    assert.equal(receivedSignal.aborted, true);
    for (const response of await Promise.all(requests)) {
        assert.equal(await response.text(), "previous catalog");
    }
    worker.serve(() => new Response("recovered catalog"));
    assert.equal(
        await (await worker.request(catalogPath)).text(),
        "recovered catalog",
    );
    assert.equal(worker.requests.length, 3);
});

for (const cancelledIndex of [0, 1]) {
    test(`cancelling catalog caller ${cancelledIndex + 1} leaves the other shared waiter active`, async () => {
        const worker = await cachedCatalog();
        const callers = [new AbortController(), new AbortController()];
        const current = Promise.withResolvers();
        let networkSignal;
        worker.serve((_url, { signal }) => {
            networkSignal = signal;
            return current.promise;
        });
        const pending = callers.map((caller) =>
            worker.request(catalogPath, undefined, {
                signal: caller.signal,
            }),
        );
        await new Promise(setImmediate);
        callers[cancelledIndex].abort(
            new DOMException("cancelled", "AbortError"),
        );
        await assert.rejects(pending[cancelledIndex], { name: "AbortError" });
        assert.equal(networkSignal.aborted, false);
        current.resolve(new Response("current catalog"));
        assert.equal(
            await (await pending[1 - cancelledIndex]).text(),
            "current catalog",
        );
        assert.equal(worker.requests.length, 2);
        worker.serve(() => new Response("next catalog"));
        assert.equal(
            await (await worker.request(catalogPath)).text(),
            "next catalog",
        );
    });
}

test("a pre-aborted catalog reader never starts a background refresh", async () => {
    const worker = await cachedCatalog();
    const caller = new AbortController();
    caller.abort(new DOMException("cancelled", "AbortError"));
    await assert.rejects(
        worker.request(catalogPath, undefined, { signal: caller.signal }),
        {
            name: "AbortError",
        },
    );
    assert.equal(worker.requests.length, 1);
    worker.serve(() => new Response("next catalog"));
    assert.equal(
        await (await worker.request(catalogPath)).text(),
        "next catalog",
    );
});

test("a truncated catalog transfer returns the complete cached body and remains retryable", async () => {
    const worker = await cachedCatalog();
    worker.serve(
        () =>
            new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(
                            new TextEncoder().encode("partial catalog"),
                        );
                        controller.error(new TypeError("truncated_transfer"));
                    },
                }),
            ),
    );
    assert.equal(
        await (await worker.request(catalogPath)).text(),
        "previous catalog",
    );
    worker.serve(() => new Response("complete catalog"));
    assert.equal(
        await (await worker.request(catalogPath)).text(),
        "complete catalog",
    );
});

test("a stalled catalog body uses the worker deadline and cached fallback", async () => {
    const deadlines = [];
    const worker = await cachedCatalog({
        abortSignal: {
            timeout(milliseconds) {
                assert.equal(milliseconds, 4000);
                const deadline = new AbortController();
                deadlines.push(deadline);
                return deadline.signal;
            },
            any: AbortSignal.any,
        },
    });
    worker.serve(
        (_url, { signal }) =>
            new Response(
                new ReadableStream({
                    start(controller) {
                        controller.enqueue(
                            new TextEncoder().encode("partial catalog"),
                        );
                        signal.addEventListener(
                            "abort",
                            () => controller.error(signal.reason),
                            { once: true },
                        );
                    },
                }),
            ),
    );
    const pending = worker.request(catalogPath);
    let settled = false;
    void pending.then(() => {
        settled = true;
    });
    await new Promise(setImmediate);
    assert.equal(settled, false);
    deadlines.at(-1).abort(new DOMException("deadline", "TimeoutError"));
    assert.equal(await (await pending).text(), "previous catalog");
    worker.serve(() => new Response("recovered catalog"));
    assert.equal(
        await (await worker.request(catalogPath)).text(),
        "recovered catalog",
    );
});

for (const cacheControl of ["private", "no-store"]) {
    test(`a ${cacheControl} catalog revokes cached bytes even when its body fails`, async () => {
        const worker = await cachedCatalog();
        worker.serve(
            () =>
                new Response(
                    new ReadableStream({
                        start(controller) {
                            controller.error(
                                new TypeError("truncated_transfer"),
                            );
                        },
                    }),
                    { headers: { "cache-control": cacheControl } },
                ),
        );
        const response = await worker.request(catalogPath);
        await assert.rejects(response.text(), /truncated_transfer/);
        worker.unavailable = true;
        await assert.rejects(worker.request(catalogPath), /server_unreachable/);
    });
}

for (const status of [401, 403, 404]) {
    test(`authoritative HTTP ${status} catalog responses are not hidden by older cached strings`, async () => {
        const worker = await cachedCatalog();
        worker.serve(() => new Response("unavailable", { status }));
        assert.equal((await worker.request(catalogPath)).status, status);
        if (status !== 404) {
            worker.unavailable = true;
            await assert.rejects(
                worker.request(catalogPath),
                /server_unreachable/,
            );
        }
    });
}

test("content-hashed locale bundles retain immutable cache-first behavior", async () => {
    const worker = workerFixture();
    const path = "/assets/locale-ABCDEF12.xml";
    worker.serve(() => new Response("immutable catalog"));
    await worker.request(path);
    worker.unavailable = true;
    assert.equal(
        await (await worker.request(path)).text(),
        "immutable catalog",
    );
    assert.equal(worker.requests.length, 1);
});
