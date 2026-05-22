import test from "node:test";
import assert from "node:assert/strict";
import { createUiRoutes } from "../../routes/ui/index.js";
import path from "node:path";
import {
    issueAccessToken,
    lookupAccessToken,
    revokeAccessTokensForSubject,
} from "../../../gateways/auth/access-tokens.js";

function createResponseRecorder() {
    let status = 0;
    let headers: Record<string, string> = {};
    const chunks: string[] = [];
    return {
        res: {
            setHeader() {},
            writeHead(code: number, nextHeaders: Record<string, string>) {
                status = code;
                headers = nextHeaders ?? {};
            },
            end(body?: string | Buffer) {
                if (body) chunks.push(body.toString());
            },
        },
        get status() {
            return status;
        },
        get headers() {
            return headers;
        },
        get body() {
            return chunks.join("");
        },
    };
}

test("ui routes redirect root to dashboard", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/"),
    );

    assert.equal(handled, true);
    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/dashboard");
});

test("dashboard route requires login cookie", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();

    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const token = issueAccessToken("u1", "user", 60);
    const authed = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        authed.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(authed.status, 200);
    assert.match(authed.body, /static\/app\/dashboard\/index\.js/);
});

test("dashboard route redirects missing-account sessions with account_deleted reason", async () => {
    const token = issueAccessToken("missing-user", "user", 60);
    const route = createUiRoutes(undefined, undefined, {
        async getInfo() {
            return null;
        },
    } as any);
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login?reason=account_deleted");
});

test("dashboard route redirects revoked disabled-account sessions with account_disabled reason", async () => {
    const disabledToken = issueAccessToken("disabled-user", "user", 60);
    revokeAccessTokensForSubject("disabled-user");
    const route = createUiRoutes(undefined, undefined, {
        async getInfo(username: string) {
            if (username !== "disabled-user") return null;
            return { enabled: false };
        },
    } as any);
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${disabledToken}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login?reason=account_disabled");
});

test("login page serves html for authenticated sessions", async () => {
    const route = createUiRoutes();
    const token = issueAccessToken("u1", "user", 60);
    const recorder = createResponseRecorder();

    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /id="app"/);
    assert.match(recorder.body, /app\/login\/index\.js/);
});

test("login page serves html for revoked cookie tokens", async () => {
    const route = createUiRoutes();
    const token = issueAccessToken("u2", "user", 60);
    revokeAccessTokensForSubject("u2");
    assert.equal(lookupAccessToken(token)?.revoked, true);
    const recorder = createResponseRecorder();

    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /id="app"/);
    assert.match(recorder.body, /app\/login\/index\.js/);
});

test("login page is served as standalone page html", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /id="app"/);
    assert.match(recorder.body, /app\/login\/index\.js/);
});

test("ui static route serves templates and assets from public folder", async () => {
    const route = createUiRoutes();

    const templateRes = createResponseRecorder();
    await route(
        { headers: {} } as any,
        templateRes.res as any,
        new URL("http://localhost/static/templates/dashboard-layout.html"),
    );
    assert.equal(templateRes.status, 200);
    assert.match(templateRes.body, /topbar-icon/);

    const assetRes = createResponseRecorder();
    await route(
        { headers: {} } as any,
        assetRes.res as any,
        new URL("http://localhost/static/assets/icons/cognis-icon.png"),
    );
    assert.equal(assetRes.status, 200);
    assert.equal(assetRes.headers["content-type"], "image/png");
});

test("ui routes serve public assets directly from /assets", async () => {
    const route = createUiRoutes();

    const assetRes = createResponseRecorder();
    await route(
        { headers: {} } as any,
        assetRes.res as any,
        new URL("http://localhost/assets/icons/cognis-icon.png"),
    );

    assert.equal(assetRes.status, 200);
    assert.equal(assetRes.headers["content-type"], "image/png");
});

test("module ui routes can be published outside /modules prefix", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "sample-analytics",
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
    assert.match(recorder.body, /Sample Analytics Module/);
});

test("module ui routes honor role access policies declared in routes.json", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "sample-analytics",
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
    assert.match(ownerRecorder.body, /Sample Analytics Module/);
});

test("module ui routes fail closed on invalid role access policies in routes.json", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "sample-analytics-invalid-policy",
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

test("core ui routes do not serve /profile (owned by profile gateway)", async () => {
    const route = createUiRoutes();

    const anonymous = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/profile/u1"),
    );
    assert.equal(
        handled,
        false,
        "/profile route should not be handled by core UI routes",
    );
});

test("license route requires login cookie and serves dedicated page", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/license"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const token = issueAccessToken("u1", "user", 60);
    const authed = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        authed.res as any,
        new URL("http://localhost/license"),
    );
    assert.equal(authed.status, 200);
    assert.match(authed.body, /static\/app\/license\/index\.js/);
    assert.match(authed.body, /id="app"/);
});

test("changelogs route requires login cookie and serves changelog entrypoint from docs boilerplate", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/changelogs"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const token = issueAccessToken("u1", "user", 60);
    const authed = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        authed.res as any,
        new URL("http://localhost/changelogs"),
    );
    assert.equal(authed.status, 200);
    assert.match(authed.body, /static\/app\/changelogs\/index\.js/);
    assert.match(authed.body, /{{ui\.page\.title\.changelogs}}/);
    assert.match(authed.body, /id="app"/);
});
