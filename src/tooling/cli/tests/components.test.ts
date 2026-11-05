import assert from "node:assert/strict";
import test from "node:test";
import { executeRegisteredCommand } from "../index.ts";
import { registry } from "../registry.ts";
import { selectComponents } from "../components/selection.ts";

test("component commands preserve selection, channels, acknowledgements and partial-failure exit status", async (context) => {
    const requests: Array<{
        url: string;
        method?: string;
        body?: Record<string, unknown>;
    }> = [];
    context.mock.method(
        globalThis,
        "fetch",
        async (url: string | URL | Request, options?: RequestInit) => {
            requests.push({
                url: String(url),
                method: options?.method,
                body: options?.body
                    ? JSON.parse(String(options.body))
                    : undefined,
            });
            return Response.json({
                data: {
                    results: [
                        {
                            status: "succeeded",
                            target: { type: "module", id: "language" },
                            data: { enabled: true },
                        },
                        {
                            status: "failed",
                            code: "component_operation_failed",
                        },
                    ],
                },
            });
        },
    );
    const options = {
        apiBaseUrl: "http://cli.test",
        getApiToken: async () => "test-token",
    };
    const result = await executeRegisteredCommand(
        "component:upgrade",
        ["module", "--all"],
        options,
    );
    assert.equal(requests[0].url, "http://cli.test/api/v1/components/actions");
    assert.deepEqual(requests[0].body, {
        all: true,
        type: "module",
        action: "upgrade",
        acknowledge: false,
    });
    assert.equal(registry.get("component:upgrade")?.exitCode?.(result), 1);
    await executeRegisteredCommand(
        "component:enable",
        ["adapter", "study", "classes", "--ack-external-disclaimer"],
        options,
    );
    assert.deepEqual(requests[1].body?.target, {
        type: "adapter",
        id: "classes",
        gatewayId: "study",
    });
    await executeRegisteredCommand(
        "component:info",
        ["module", "language"],
        options,
    );
    assert.equal(
        requests[2].url,
        "http://cli.test/api/v1/components/module/language/info",
    );
    await executeRegisteredCommand(
        "component:release-channel",
        ["set", "module", "language", "feature-guided-tutorials"],
        options,
    );
    assert.equal(requests[3].method, "PUT");
    assert.deepEqual(requests[3].body, { channel: "feature-guided-tutorials" });
    assert.throws(() => selectComponents(["module", "language", "--all"]));
    assert.throws(() => selectComponents(["module", "--typo"]));
    assert.deepEqual(selectComponents(["adapter", "study", "--all"]), {
        all: true,
        type: "adapter",
        gatewayId: "study",
    });
});

test("force is forwarded for lifecycle operations and rejected for read-only selections", async (context) => {
    let body: Record<string, unknown> | undefined;
    context.mock.method(globalThis, "fetch", async (_url, options) => {
        body = JSON.parse(String(options?.body));
        return Response.json({
            data: {
                results: [
                    {
                        target: { type: "module", id: "example" },
                        status: "succeeded",
                        data: { enabled: true },
                    },
                ],
            },
        });
    });
    await executeRegisteredCommand(
        "component:upgrade",
        ["module", "example", "--force"],
        { apiBaseUrl: "http://test", getApiToken: async () => "fixture" },
    );
    assert.equal(body?.force, true);
    assert.deepEqual(body?.target, { type: "module", id: "example" });
    assert.throws(
        () => selectComponents(["module", "example", "--force"]),
        /Invalid component option/,
    );
});
