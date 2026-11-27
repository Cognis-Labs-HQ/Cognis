import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm as removePath, writeFile } from "node:fs/promises";
import path from "node:path";
import { createUiRoutes } from "../../../routes/ui/index.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";
import { createResponseRecorder } from "../ui-routes-test-helpers.js";

test("module ui routes resolve installed external modules by UUID", async (testContext) => {
    const uuid = "11111111-2222-4333-8444-555555555555";
    const moduleRoot = path.resolve("external-modules", uuid);
    await mkdir(path.join(moduleRoot, "ui"), { recursive: true });
    await writeFile(
        path.join(moduleRoot, "routes.json"),
        JSON.stringify([{ path: "/meeting" }]),
    );
    await writeFile(
        path.join(moduleRoot, "ui", "index.html"),
        "<!doctype html><title>External meeting module</title>",
    );
    testContext.after(() =>
        removePath(moduleRoot, { recursive: true, force: true }),
    );

    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "jitsi-meet",
                uuid,
                entrypoints: { ui: "./ui/index.html" },
            },
        ],
    } as any);
    const token = issueAccessToken("u1", "admin", 60);
    const recorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/meeting"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /External meeting module/);
});

test("administration page is visible to admins only", async () => {
    const route = createUiRoutes();

    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const userToken = issueAccessToken("u1", "user", 60);
    const userResponse = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userResponse.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(userResponse.status, 302);
    assert.equal(userResponse.headers.location, "/dashboard");

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminResponse = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        adminResponse.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(adminResponse.status, 200);
    assert.match(adminResponse.body, /static\/app\/administration\/index\.js/);
    assert.match(adminResponse.body, /id="app"/);
});

test("module detail deep links serve the modules SPA entry", async () => {
    const route = createUiRoutes();
    const adminToken = issueAccessToken("u1", "admin", 60);
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${adminToken}` },
        } as any,
        recorder.res as any,
        new URL(
            "http://localhost/administration/modules/11111111-2222-4333-8444-555555555555",
        ),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /static\/app\/modules\/index\.js/);
});

test("users page is visible to admins only", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const userToken = issueAccessToken("u1", "user", 60);
    const userResponse = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userResponse.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(userResponse.status, 302);
    assert.equal(userResponse.headers.location, "/dashboard");

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminResponse = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        adminResponse.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(adminResponse.status, 200);
    assert.match(adminResponse.body, /static\/app\/users\/index\.js/);
});
