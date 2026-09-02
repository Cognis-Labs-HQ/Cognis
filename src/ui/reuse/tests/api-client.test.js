import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const apiClientSource = readFileSync(
    resolve(ROOT, "src/ui/reuse/api-client.js"),
    "utf8",
);

test("API requests receive a finite default browser timeout", () => {
    assert.match(apiClientSource, /API_REQUEST_TIMEOUT_MS = 30_000/);
    assert.match(apiClientSource, /AbortSignal\?\.timeout\?\.\(timeoutMs\)/);
    assert.match(apiClientSource, /AbortSignal\?\.any\?\.\(/);
});

function loadApiClientForTests({
    token = "test-token",
    fetchImpl = async () => ({ ok: true, status: 200 }),
    now = () => Date.now(),
    origin = "https://example.com",
} = {}) {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/api-client.js"),
        "utf8",
    );
    const testableSource =
        source.replace(/^import .*;\n/gm, "").replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = {\n" +
        "  apiFetch,\n" +
        "  configureConnectionRecoveryPrompt,\n" +
        "  shouldSuppressConnectionRecoveryPopup,\n" +
        "};\n";

    const showToastCalls = [];
    const dispatchedEvents = [];
    const timers = [];
    let reloadCount = 0;
    const context = {
        showToast(message, options) {
            const call = { dismissed: false, message, options };
            showToastCalls.push(call);
            return () => {
                call.dismissed = true;
            };
        },
        setTimeout(callback) {
            timers.push(callback);
            return timers.length;
        },
        localStorage: {
            getItem(key) {
                if (key === "cognis_access_token") return token;
                return null;
            },
        },
        fetch: fetchImpl,
        Headers,
        URL,
        Date: {
            now,
        },
        window: {
            location: {
                origin,
                reload() {
                    reloadCount += 1;
                },
            },
            dispatchEvent(event) {
                dispatchedEvents.push(event);
            },
        },
        CustomEvent: class CustomEvent {
            constructor(type, options) {
                this.type = type;
                this.detail = options?.detail;
            }
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "api-client.js",
    });

    return {
        apiClient: context.__testExports,
        dispatchedEvents,
        getReloadCount: () => reloadCount,
        runNextTimer: async () => {
            const callback = timers.shift();
            callback?.();
            await new Promise((resolve) => setImmediate(resolve));
        },
        showToastCalls,
    };
}

for (const status of [401, 403]) {
    test(`apiFetch announces ${status} API access denial to active share sessions`, async () => {
        const { apiClient, dispatchedEvents } = loadApiClientForTests({
            fetchImpl: async () => ({ ok: false, status }),
        });

        await apiClient.apiFetch("/api/v1/modules/example/resource");

        assert.equal(dispatchedEvents.length, 1);
        assert.equal(dispatchedEvents[0].type, "cognis:api-access-denied");
        assert.equal(
            dispatchedEvents[0].detail.path,
            "/api/v1/modules/example/resource",
        );
        assert.equal(dispatchedEvents[0].detail.status, status);
    });
}

test("apiFetch suppresses expected share-password access-denied events", async () => {
    const { apiClient, dispatchedEvents } = loadApiClientForTests({
        fetchImpl: async () => ({ ok: false, status: 401 }),
    });

    await apiClient.apiFetch("/api/v1/share/resolve/token", {
        suppressAccessDeniedEvent: true,
    });

    assert.equal(dispatchedEvents.length, 0);
});

test("apiFetch preserves Headers input while attaching account authorization", async () => {
    let requestOptions = null;
    const { apiClient } = loadApiClientForTests({
        fetchImpl: async (_path, options) => {
            requestOptions = options;
            return { ok: true, status: 200 };
        },
    });
    const headers = new Headers({ "x-cognis-share-password": "secret" });

    await apiClient.apiFetch("/api/v1/share/resolve/token", { headers });

    assert.equal(
        requestOptions.headers.get("x-cognis-share-password"),
        "secret",
    );
    assert.equal(
        requestOptions.headers.get("authorization"),
        "Bearer test-token",
    );
});

test("apiFetch shows one permanent warning toast for repeated API network failures", async () => {
    assert.match(
        apiClientSource,
        /Symbol\.for\([\s\S]*?"cognis\.connectionRecoveryStates"/,
    );
    const networkError = new Error("network down");
    networkError.name = "TypeError";
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => {
            throw networkError;
        },
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(
        apiClient.apiFetch("/api/v1/notify/inbox"),
        networkError,
    );
    await assert.rejects(
        apiClient.apiFetch("/api/v1/notify/inbox"),
        networkError,
    );

    assert.equal(showToastCalls.length, 1);
    assert.equal(showToastCalls[0].message, "Connection interrupted.");
    assert.equal(showToastCalls[0].options.variant, "warning");
    assert.equal(showToastCalls[0].options.permanent, true);
});

test("apiFetch confirms failures and ignores unrelated HTTP errors", async () => {
    let requestCount = 0;
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => {
            requestCount += 1;
            return requestCount === 1
                ? { ok: false, status: 503 }
                : { ok: true, status: 200 };
        },
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await apiClient.apiFetch("/api/v1/users");
    await apiClient.apiFetch("/api/v1/missing");

    assert.equal(showToastCalls.length, 0);
});

test("apiFetch does not treat another Cognis origin as the current API", async () => {
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => ({ ok: false, status: 503 }),
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await apiClient.apiFetch("https://cognis.study/api/v1/users");

    assert.equal(showToastCalls.length, 0);
});

test("connection recovery dismisses the warning, announces recovery, and reloads after the info toast", async () => {
    let online = false;
    const { apiClient, getReloadCount, runNextTimer, showToastCalls } =
        loadApiClientForTests({
            fetchImpl: async () => {
                if (!online) throw new TypeError("Failed to fetch");
                return { ok: true, status: 200 };
            },
        });
    apiClient.configureConnectionRecoveryPrompt(
        "Connection interrupted.",
        "Connection restored. Refreshing the page.",
    );

    await assert.rejects(apiClient.apiFetch("/api/v1/users"));
    online = true;
    await runNextTimer();

    assert.equal(showToastCalls.length, 2);
    assert.equal(showToastCalls[0].dismissed, true);
    assert.equal(showToastCalls[1].options.variant, "info");
    assert.equal(getReloadCount(), 0);
    showToastCalls[1].options.onDismiss();
    assert.equal(getReloadCount(), 1);
});

test("apiFetch does not show connection toast when there is no authenticated session", async () => {
    const networkError = new Error("network down");
    networkError.name = "TypeError";
    const { apiClient, showToastCalls } = loadApiClientForTests({
        token: null,
        fetchImpl: async () => {
            throw networkError;
        },
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(apiClient.apiFetch("/api/v1/users"), networkError);
    assert.equal(showToastCalls.length, 0);
});

test("apiFetch ignores aborted requests for connection recovery toasts", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => {
            throw abortError;
        },
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(apiClient.apiFetch("/api/v1/users"), abortError);
    assert.equal(showToastCalls.length, 0);
});

test("apiFetch shows a permanent warning toast for retryable API server responses", async () => {
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => ({ ok: false, status: 503 }),
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    const response = await apiClient.apiFetch("/api/v1/users");

    assert.equal(response.status, 503);
    assert.equal(showToastCalls.length, 1);
    assert.equal(showToastCalls[0].message, "Connection interrupted.");
    assert.equal(showToastCalls[0].options.variant, "warning");
    assert.equal(showToastCalls[0].options.permanent, true);
});

test("apiFetch allows suppressing connection recovery toasts per request", async () => {
    const networkError = new Error("network down");
    networkError.name = "TypeError";
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => {
            throw networkError;
        },
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(
        apiClient.apiFetch("/api/v1/modules/jitsi-meet/ping", {
            suppressConnectionRecoveryToast: true,
        }),
        networkError,
    );

    assert.equal(showToastCalls.length, 0);
});

test("apiFetch marks toast-triggering network failures for crash popup suppression", async () => {
    const networkError = new Error("Failed to fetch");
    networkError.name = "TypeError";
    const { apiClient } = loadApiClientForTests({
        fetchImpl: async () => {
            throw networkError;
        },
        now: () => 1_000,
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(apiClient.apiFetch("/api/v1/users"), networkError);

    assert.equal(
        apiClient.shouldSuppressConnectionRecoveryPopup(networkError),
        true,
    );
});

test("api client suppresses crash popups for retryable HTTP errors right after the connection toast", async () => {
    let now = 1_000;
    const { apiClient } = loadApiClientForTests({
        fetchImpl: async () => ({ ok: false, status: 503 }),
        now: () => now,
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await apiClient.apiFetch("/api/v1/users");

    assert.equal(
        apiClient.shouldSuppressConnectionRecoveryPopup(
            new Error('HTTP 503 while loading "/api/v1/users"'),
        ),
        true,
    );
    now = 7_000;
    assert.equal(
        apiClient.shouldSuppressConnectionRecoveryPopup(
            new Error('HTTP 503 while loading "/api/v1/users"'),
        ),
        false,
    );
});

test("api client suppresses marked connection failures across deep cause chains", async () => {
    let now = 1_000;
    const networkError = new Error("Failed to fetch");
    networkError.name = "TypeError";
    const { apiClient } = loadApiClientForTests({
        fetchImpl: async () => {
            throw networkError;
        },
        now: () => now,
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(apiClient.apiFetch("/api/v1/users"), networkError);

    const wrappedError = new Error("Route mount failed");
    let currentError = wrappedError;
    const errorChainDepth = 20_000;
    for (let index = 0; index < errorChainDepth; index += 1) {
        const nextError =
            index === errorChainDepth - 1
                ? networkError
                : new Error(`Wrapped error ${index}`);
        currentError.cause = nextError;
        currentError = nextError;
    }

    assert.equal(
        apiClient.shouldSuppressConnectionRecoveryPopup(wrappedError),
        true,
    );
});
