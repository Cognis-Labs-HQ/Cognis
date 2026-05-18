import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function loadApiClientForTests({
    token = "test-token",
    fetchImpl = async () => ({ ok: true, status: 200 }),
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
        "};\n";

    const showToastCalls = [];
    const context = {
        showToast(message, options) {
            showToastCalls.push({ message, options });
        },
        localStorage: {
            getItem(key) {
                if (key === "cognis_access_token") return token;
                return null;
            },
        },
        fetch: fetchImpl,
        URL,
        window: {
            location: {
                origin: "https://example.com",
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "api-client.js",
    });

    return { apiClient: context.__testExports, showToastCalls };
}

test("apiFetch shows one permanent warning toast for repeated API network failures", async () => {
    const networkError = new Error("network down");
    networkError.name = "TypeError";
    const { apiClient, showToastCalls } = loadApiClientForTests({
        fetchImpl: async () => {
            throw networkError;
        },
    });
    apiClient.configureConnectionRecoveryPrompt("Connection interrupted.");

    await assert.rejects(
        apiClient.apiFetch("/api/v1/notifications/inbox"),
        networkError,
    );
    await assert.rejects(
        apiClient.apiFetch("/api/v1/notifications/inbox"),
        networkError,
    );

    assert.equal(showToastCalls.length, 1);
    assert.equal(showToastCalls[0].message, "Connection interrupted.");
    assert.equal(showToastCalls[0].options.variant, "warning");
    assert.equal(showToastCalls[0].options.permanent, true);
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
