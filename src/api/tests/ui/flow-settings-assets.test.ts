import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createCtx } from "@cognis/core";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { createUiRoutes } from "../../routes/ui/index.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("flow-added settings resolve bundles after live authorization and retain fresh source revisions", async () => {
    const registry = new UIRegistry(
        new URL("./fixtures/asset-manifest.json", import.meta.url).pathname,
    );
    registry.registerStaticDir(
        "alias",
        path.resolve("src/adapters/example/sample/ui"),
    );
    const descriptors = JSON.parse(
        await readFile(
            new URL("./fixtures/flow-settings-sections.json", import.meta.url),
            "utf8",
        ),
    );
    let enabled = true;
    descriptors[0].isEnabled = () => enabled;
    const ctx = createCtx();
    ctx.registerFlow({
        id: "construct-settings-ui",
        stages: ["augment-sections", "compose-page"],
    });
    for (const descriptor of descriptors) {
        ctx.flow.extend(
            "construct-settings-ui",
            "augment-sections",
            { id: descriptor.id },
            () => descriptor,
        );
    }
    let flowRuns = 0;
    ctx.flow.extend(
        "construct-settings-ui",
        "compose-page",
        { id: "compose" },
        (stage) => {
            flowRuns++;
            stage.data.sections = stage.stageResults["augment-sections"];
        },
    );
    const context = createDefaultRouteContext({ flow: ctx.flow });
    let role: "user" | "admin" | null = null;
    context.requireAuth = (_request, response) => {
        if (role)
            return { sub: role === "admin" ? "account-b" : "account-a", role };
        response.writeHead(401);
        response.end();
        return null;
    };
    const route = createUiRoutes(
        undefined,
        registry,
        undefined,
        undefined,
        undefined,
        undefined,
        context,
    );
    const read = async () => {
        const response = createResponseRecorder();
        await route(
            { method: "GET", headers: {} } as IncomingMessage,
            response.res as unknown as ServerResponse,
            new URL("http://localhost/api/v1/ui/settings-sections"),
        );
        return response;
    };
    assert.equal((await read()).status, 401);
    assert.equal(flowRuns, 0);
    role = "user";
    const user = JSON.parse((await read()).body).data;
    const userSections = new Map<
        string,
        { id: string; scriptUrl: string; stringsBaseUrl?: string }
    >(
        user.map(
            (item: {
                id: string;
                scriptUrl: string;
                stringsBaseUrl?: string;
            }) => [item.id, item],
        ),
    );
    assert.deepEqual(
        user.map((item: { id: string }) => item.id),
        ["external", "host", "module", "source"],
    );
    assert.equal(
        userSections.get("host")!.scriptUrl,
        "/assets/provider-ABC123.js",
    );
    assert.equal(
        userSections.get("host")!.stringsBaseUrl,
        "/static/gateways/alias/languages",
    );
    assert.equal(
        userSections.get("module")!.scriptUrl,
        "/static/modules/example/section.js?revision=1&v=development",
    );
    assert.equal(
        userSections.get("external")!.scriptUrl,
        "https://example.invalid/section.js",
    );
    assert.equal(
        userSections.get("source")!.scriptUrl,
        "/static/gateways/unbuilt/section.js?v=development",
    );
    assert.equal(
        descriptors[0].scriptUrl,
        "/static/gateways/alias/provider.js",
        "response resolution does not mutate contributions",
    );
    enabled = false;
    descriptors[2].scriptUrl = "/static/modules/example/section.js?revision=2";
    role = "admin";
    const admin = JSON.parse((await read()).body).data;
    const adminSections = new Map<string, { id: string; scriptUrl: string }>(
        admin.map((item: { id: string; scriptUrl: string }) => [item.id, item]),
    );
    assert.deepEqual(
        admin.map((item: { id: string }) => item.id),
        ["admin", "external", "module", "source"],
    );
    assert.equal(
        adminSections.get("admin")!.scriptUrl,
        "/assets/direct-ABC123.js",
    );
    assert.equal(
        adminSections.get("module")!.scriptUrl,
        "/static/modules/example/section.js?revision=2&v=development",
    );
    role = "user";
    assert.equal(JSON.parse((await read()).body).data.length, 3);
    assert.equal(flowRuns, 3);
    role = null;
    assert.equal((await read()).status, 401);
    assert.equal(flowRuns, 3);
});
