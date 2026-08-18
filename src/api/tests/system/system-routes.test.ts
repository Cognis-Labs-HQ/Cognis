import test from "node:test";
import assert from "node:assert/strict";
import { createSystemRoutes } from "../../routes/system/index.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

const healthService = {
    status() {
        return {
            status: "ok",
            timestamp: "2026-01-01T00:00:00.000Z",
            startedAt: "2026-01-01T00:00:00.000Z",
            uptimeMs: 1,
        };
    },
};

test("system route handles healthcheck endpoint", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/healthcheck"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /uptimeMs/);
});

test("owner can list every registered capability", async () => {
    const route = createSystemRoutes(
        healthService as any,
        undefined,
        undefined,
        createDefaultRouteContext({
            getCapability: (id) =>
                id === "system:listCapabilities"
                    ? () => ["auth:requireAuth", "ui:profileAvatarRenderer"]
                    : undefined,
        }),
    );
    const token = issueAccessToken("owner", "owner", 60);
    let status = 0;
    let body = "";
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/capabilities"),
    );

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body).data, [
        "auth:requireAuth",
        "ui:profileAvatarRenderer",
    ]);
});

test("system route exposes env-backed ui config", async () => {
    process.env.COGNIS_UI_DEMO_MODE = "true";
    const route = createSystemRoutes(healthService as any);
    let body = "";

    await route(
        { method: "GET" } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/ui-config"),
    );

    assert.match(body, /"demoMode":true/);
});

test("system release changelog feed requires authentication", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET", headers: {} } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/release-changelog"),
    );

    assert.equal(handled, true);
    assert.equal(status, 401);
    assert.match(body, /"unauthorized"/);
});

test("system release changelog feed returns release version and entries", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/release-changelog"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.match(parsed.data.releaseVersion, /^\d+\.\d+\.\d+$/);
    assert.ok(Array.isArray(parsed.data.entries));
    assert.ok(parsed.data.entries.length > 0);
    const [firstEntry] = parsed.data.entries;
    assert.equal(typeof firstEntry.slug, "string");
    assert.equal(typeof firstEntry.title, "string");
    assert.ok(Array.isArray(firstEntry.changes));
    assert.equal(typeof firstEntry.path, "string");
    assert.ok(firstEntry.path.startsWith("/changelogs/"));
});

test("system release changelog feed resolves localized entry summaries across supported languages", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const route = createSystemRoutes(healthService as any);
    const localizedExpectations = [
        {
            lang: "en",
            expectedTitle: "Changelog Summary Update",
            expectedFirstChange: "Parse Changelog Headings",
        },
        {
            lang: "de",
            expectedTitle: "Changelog-Struktur Update",
            expectedFirstChange: "Changelog-Überschriften Parsen",
        },
        {
            lang: "id",
            expectedTitle: "Update Ringkasan Changelog",
            expectedFirstChange: "Parsing Heading Changelog",
        },
        {
            lang: "ja",
            expectedTitle: "変更履歴要約更新",
            expectedFirstChange: "見出し解析を統一",
        },
    ];

    for (const expectation of localizedExpectations) {
        let status = 0;
        let body = "";
        const handled = await route(
            {
                method: "GET",
                headers: { authorization: "Bearer " + token },
            } as any,
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload: string) {
                    body = payload;
                },
            } as any,
            new URL(
                `http://localhost/api/v1/system/release-changelog?langs=${expectation.lang}`,
            ),
        );

        assert.equal(handled, true);
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        const localizedEntry = parsed.data.entries.find(
            (entry: { slug?: string }) =>
                entry?.slug === "create-changelog-ingestion-system",
        );
        assert.ok(localizedEntry);
        assert.equal(localizedEntry.title, expectation.expectedTitle);
        assert.equal(
            localizedEntry.changes[0],
            expectation.expectedFirstChange,
        );
    }
});

test("system route serves license markdown payload", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/license"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /GNU Affero General Public License/);
});

test("system security settings require authentication", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET", headers: {} } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(handled, true);
    assert.equal(status, 401);
    assert.match(body, /"unauthorized"/);
});

test("system security settings accept disabled session expiry", async () => {
    const token = issueAccessToken("admin-timeout", "admin", 60);
    let status = 0;
    let persisted = "";
    const route = createSystemRoutes(healthService as any, {
        async get() {
            return null;
        },
        async set(_accountId, _key, value) {
            persisted = value;
        },
        async clearUser() {},
    });

    await route(
        {
            method: "PUT",
            headers: { authorization: `Bearer ${token}` },
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({ loginSessionTimeoutMinutes: 0 }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(status, 200);
    assert.equal(JSON.parse(persisted).loginSessionTimeoutMinutes, 0);
});

test("system security settings sanitize and survive malformed persisted data", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const headers = { authorization: `Bearer ${token}` };
    let status = 0;
    let body = "";
    const preferenceStore = {
        get: async () =>
            '{ "trustedDomains": ["Example.COM", " ", 7], "userValidationMode": "smtp" }',
    };
    const route = createSystemRoutes(
        healthService as any,
        preferenceStore as any,
    );

    await route(
        { method: "GET", headers } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body).data.trustedDomains, ["example.com"]);
    assert.equal(JSON.parse(body).data.registrationsEnabled, false);
    assert.equal(JSON.parse(body).data.userValidationMode, "smtp");

    const malformedStore = { get: async () => "not-json" };
    const malformedRoute = createSystemRoutes(
        healthService as any,
        malformedStore as any,
    );

    await malformedRoute(
        { method: "GET", headers } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body).data.trustedDomains, []);
    assert.equal(JSON.parse(body).data.registrationsEnabled, false);
    assert.equal(JSON.parse(body).data.userValidationMode, "none");
});

test("system security settings log malformed persisted data", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const headers = { authorization: `Bearer ${token}` };
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const route = createSystemRoutes(
        healthService as any,
        { get: async () => "not-json" } as any,
        (level, message, meta) => {
            entries.push({ level, message, meta });
        },
    );

    await route(
        { method: "GET", headers } as any,
        {
            writeHead() {},
            end() {},
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.deepEqual(entries, [
        {
            level: "warn",
            message: "Failed to parse persisted security settings.",
            meta: {
                component: "api-system",
                method: "GET",
                path: "/api/v1/system/security",
                accountId: "alice",
            },
        },
        {
            level: "debug",
            message: "Read security settings.",
            meta: {
                component: "api-system",
                method: "GET",
                path: "/api/v1/system/security",
                accountId: "alice",
            },
        },
    ]);
});

test("security PUT rejects smtp validation mode when SMTP adapter unavailable", async () => {
    const token = issueAccessToken("admin", "admin", 60);
    const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
    };
    let status = 0;
    let body = "";
    const preferenceStore = {
        get: async () => null,
        set: async () => {},
    };
    const route = createSystemRoutes(
        healthService as any,
        preferenceStore as any,
        undefined,
        createDefaultRouteContext({
            getCapability: (cap) =>
                (cap === "notify:canSendVerificationEmail"
                    ? () => false
                    : undefined) as any,
        }),
    );

    const handled = await route(
        {
            method: "PUT",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({ userValidationMode: "smtp" }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(handled, true);
    assert.equal(status, 400);
    assert.match(body, /"smtp_unavailable"/);
});

test("security PUT accepts smtp validation mode when SMTP adapter is available", async () => {
    const token = issueAccessToken("admin", "admin", 60);
    const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
    };
    let status = 0;
    let savedValue = "";
    const preferenceStore = {
        get: async () => null,
        set: async (_: string, __: string, value: string) => {
            savedValue = value;
        },
    };
    const route = createSystemRoutes(
        healthService as any,
        preferenceStore as any,
        undefined,
        createDefaultRouteContext({
            getCapability: (cap) =>
                (cap === "notify:canSendVerificationEmail"
                    ? () => true
                    : undefined) as any,
        }),
    );

    const handled = await route(
        {
            method: "PUT",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({ userValidationMode: "smtp" }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(_payload: string) {},
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(savedValue, /"userValidationMode":"smtp"/);
});

test("security PUT revokes setup-pending tokens when mandatory TFA is disabled", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
    };
    let status = 0;
    let setEnforceValue: boolean | null = null;
    let revokeExcludedSubject = "";
    const preferenceStore = {
        get: async () => null,
        set: async () => {},
    };
    const route = createSystemRoutes(
        healthService as any,
        preferenceStore as any,
        undefined,
        createDefaultRouteContext({
            getCapability: (capabilityName) => {
                if (capabilityName === "tfa:applyEnforcementPolicy") {
                    return async ({
                        required,
                        excludedSubject,
                    }: {
                        required: boolean;
                        excludedSubject?: string;
                    }) => {
                        setEnforceValue = required;
                        revokeExcludedSubject = String(excludedSubject ?? "");
                        return {
                            required,
                            previousRequired: true,
                            revokedSetupPendingCount: 2,
                        };
                    };
                }
                return undefined;
            },
        }),
    );

    const handled = await route(
        {
            method: "PUT",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({ enforceTfaForAllUsers: false }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.equal(setEnforceValue, false);
    assert.equal(revokeExcludedSubject, "admin-user");
});

test("security PUT does not revoke setup-pending tokens when mandatory TFA was already disabled", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const headers = {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
    };
    let status = 0;
    let revokeCalled = false;
    const preferenceStore = {
        get: async () => null,
        set: async () => {},
    };
    const route = createSystemRoutes(
        healthService as any,
        preferenceStore as any,
        undefined,
        undefined,
        (capabilityName) => {
            if (capabilityName === "tfa:applyEnforcementPolicy") {
                return async () => {
                    revokeCalled = false;
                    return {
                        required: false,
                        previousRequired: false,
                        revokedSetupPendingCount: 0,
                    };
                };
            }
            return undefined;
        },
    );

    const handled = await route(
        {
            method: "PUT",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({ enforceTfaForAllUsers: false }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.equal(revokeCalled, false);
});
