import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createCtx } from "@cognis/core";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { ResponseRecorder } from "../reuse/route-test-helpers.js";

test("host admits explicitly authenticated guest resources without widening account route metadata", async (context) => {
    const directory = await mkdtemp(path.join(tmpdir(), "cognis-guest-host-"));
    const uuid = "d49288a3-106e-43d8-a5a4-cd7a142a6fc7";
    const previous = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    context.after(async () => {
        if (previous === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previous;
        await rm(directory, { recursive: true, force: true });
    });
    await mkdir(path.join(directory, uuid));
    await copyFile(
        new URL("./fixtures/guest-resource/bootstrap.mjs", import.meta.url),
        path.join(directory, uuid, "bootstrap.mjs"),
    );
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = directory;
    const system = createCtx();
    let live = true;
    let authorized = true;
    const accountGuard = (req: IncomingMessage, res: ServerResponse) => {
        if (req.headers.authorization === "account")
            return { sub: "share:ordinary-account", role: "user" as const };
        res.writeHead(401);
        res.end();
        return null;
    };
    system.contributeCapability("system:ctx", system);
    system.contributeCapability("auth:requireAuth", accountGuard);
    system.contributeCapability(
        "share:getGuestClaims",
        async (req: IncomingMessage) =>
            live && req.headers.authorization === "guest"
                ? {
                      sub: "share:resource:guest",
                      purpose: "share",
                      role: "user",
                  }
                : null,
    );
    system.contributeCapability(
        "fixture:authorizeResource",
        async () => authorized,
    );
    const routeContext = {
        ...createDefaultRouteContext({
            getCapability: (id) => system.getCapability(id),
            flow: system.flow,
        }),
        requireAuth: accountGuard,
        requireRoleAccess: accountGuard,
    };
    const host = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "guest-resource",
                    uuid,
                    entrypoints: { bootstrap: "./bootstrap.mjs" },
                },
            ],
        } as never,
        () => true,
        undefined,
        { routeContext },
    );
    await host.refresh({ throwOnFailure: true });
    async function dispatch(
        action: string,
        authorization: string,
    ): Promise<number> {
        const response = new ResponseRecorder();
        await host.handle(
            { method: "GET", headers: { authorization } } as IncomingMessage,
            response as unknown as ServerResponse,
            new URL(`http://localhost/api/v1/modules/guest-resource/${action}`),
        );
        return response.statusCode;
    }
    assert.equal(await dispatch("read", "guest"), 200);
    assert.equal(await dispatch("manage", "guest"), 401);
    authorized = false;
    assert.equal(await dispatch("read", "guest"), 403);
    authorized = true;
    live = false;
    assert.equal(await dispatch("read", "guest"), 401);
    assert.equal(await dispatch("read", "account"), 200);
    assert.equal(await dispatch("manage", "account"), 200);
});
