import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createUiRoutes } from "../../routes/ui/index.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("module ui routes can be published outside /modules prefix", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "analytics",
                entrypoints: { ui: "./ui/pages/analytics.html" },
            },
        ],
    } as any);
    const token = issueAccessToken("u1", "admin", 60);
    const recorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/analytics"),
    );
    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /Analytics Module/);
});

test("module ui routes resolve installed external modules by UUID", async (t) => {
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
    t.after(() => rm(moduleRoot, { recursive: true, force: true }));

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

test("module ui routes honor role access policies declared in routes.json", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "analytics",
                entrypoints: { ui: "./ui/pages/analytics.html" },
            },
        ],
    } as any);
    const userToken = issueAccessToken("u1", "user", 60);
    const userRecorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userRecorder.res as any,
        new URL("http://localhost/analytics"),
    );
    assert.equal(userRecorder.status, 302);
    assert.equal(userRecorder.headers.location, "/dashboard");

    const ownerToken = issueAccessToken("u1", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${ownerToken}` } } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/analytics"),
    );
    assert.equal(ownerRecorder.status, 200);
    assert.match(ownerRecorder.body, /Analytics Module/);
});

test("module ui routes fail closed on invalid role access policies in routes.json", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "analytics-invalid-policy",
                entrypoints: { ui: "./ui/pages/analytics.html" },
            },
        ],
    } as any);
    const ownerToken = issueAccessToken("u1", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${ownerToken}` } } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/analytics-invalid-policy"),
    );
    assert.equal(ownerRecorder.status, 302);
    assert.equal(ownerRecorder.headers.location, "/dashboard");
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
    const userRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userRes.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(userRes.status, 302);
    assert.equal(userRes.headers.location, "/dashboard");

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        adminRes.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(adminRes.status, 200);
    assert.match(adminRes.body, /static\/app\/administration\/index\.js/);
    assert.match(adminRes.body, /id="app"/);
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
    const userRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userRes.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(userRes.status, 302);
    assert.equal(userRes.headers.location, "/dashboard");

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        adminRes.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(adminRes.status, 200);
    assert.match(adminRes.body, /static\/app\/users\/index\.js/);
});

test("invite page redirects admins to /users", async () => {
    const route = createUiRoutes(
        undefined,
        undefined,
        {
            async isFounder() {
                return true;
            },
        } as any,
        {
            get() {
                return { status: "active" };
            },
        } as any,
    );
    const adminToken = issueAccessToken("u1", "admin", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, "/users");
});

test("invite page is visible to non-admin founders", async () => {
    const route = createUiRoutes(
        undefined,
        undefined,
        {
            async isFounder() {
                return true;
            },
        } as any,
        {
            get() {
                return { status: "active" };
            },
        } as any,
    );
    const founderToken = issueAccessToken("u1", "user", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${founderToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 200);
    assert.match(res.body, /static\/app\/invite\/index\.js/);
});

test("invite page redirects founders to /dashboard when registration gateway is disabled", async () => {
    const route = createUiRoutes(
        undefined,
        undefined,
        {
            async isFounder() {
                return true;
            },
        } as any,
        {
            get() {
                return { status: "disabled" };
            },
        } as any,
    );
    const founderToken = issueAccessToken("u1", "user", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${founderToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, "/dashboard");
});
