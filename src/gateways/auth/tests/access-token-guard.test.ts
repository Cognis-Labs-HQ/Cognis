import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    issueAccessToken,
    revokeSetupPendingAccessTokens,
    revokeAccessTokensForSubject,
    verifyAccessToken,
} from "../access-tokens.js";
import {
    registerPageScriptOrigin,
    registerPageScriptOrigins,
    requireAuth,
    setPageSecurityHeaders,
} from "../guard.js";

test("access tokens issue and verify", () => {
    const token = issueAccessToken("u1", "admin", 60);
    const claims = verifyAccessToken(token);
    assert.equal(claims?.sub, "u1");
});

test("guard enforces role scopes", () => {
    const token = issueAccessToken("u1", "user", 60);
    let status = 0;
    const claims = requireAuth(
        { headers: { authorization: `Bearer ${token}` } } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        "admin",
    );
    assert.equal(claims, null);
    assert.equal(status, 403);
});

test("guard allows auth security sections during TFA setup pending flow", () => {
    const token = issueAccessToken("u1", "user", 60, {
        tfaSetupPending: true,
    });
    let status = 0;
    const claims = requireAuth(
        {
            headers: { authorization: `Bearer ${token}` },
            url: "/api/v1/auth/security-sections",
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        "user",
    );
    assert.equal(status, 0);
    assert.deepEqual(claims, {
        sub: "u1",
        role: "user",
        providerId: "local",
        tfaSetupPending: true,
    });
});

test("token store persists tokens to disk across module reload", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "cognis-token-store-"));
    const tokenStorePath = path.join(tempDir, "access-tokens.json");
    const tokenModulePath = new URL("../access-tokens.ts", import.meta.url)
        .href;

    process.env.COGNIS_ACCESS_TOKEN_STORE_PATH = tokenStorePath;

    try {
        const firstLoad = await import(
            `${tokenModulePath}?first-load=${Date.now()}`
        );
        const token = firstLoad.issueAccessToken("persisted-user", "user", 120);

        const secondLoad = await import(
            `${tokenModulePath}?second-load=${Date.now()}`
        );
        const claims = secondLoad.verifyAccessToken(token);

        assert.deepEqual(claims, {
            sub: "persisted-user",
            role: "user",
            providerId: "local",
            tfaSetupPending: false,
        });
    } finally {
        delete process.env.COGNIS_ACCESS_TOKEN_STORE_PATH;
        rmSync(tempDir, { recursive: true, force: true });
    }
});

test("revoking tokens by subject invalidates all issued tokens for that user", () => {
    const firstToken = issueAccessToken("subject-a", "user", 60);
    const secondToken = issueAccessToken("subject-a", "admin", 60);
    const otherToken = issueAccessToken("subject-b", "user", 60);

    const revoked = revokeAccessTokensForSubject("subject-a");
    assert.equal(revoked >= 2, true);
    assert.equal(verifyAccessToken(firstToken), null);
    assert.equal(verifyAccessToken(secondToken), null);
    assert.deepEqual(verifyAccessToken(otherToken), {
        sub: "subject-b",
        role: "user",
        providerId: "local",
        tfaSetupPending: false,
    });

    test("revoking setup-pending tokens excludes provided subject", () => {
        const pendingUserToken = issueAccessToken("pending-user", "user", 60, {
            tfaSetupPending: true,
        });
        const pendingAdminToken = issueAccessToken("pending-admin", "admin", 60, {
            tfaSetupPending: true,
        });
        const normalToken = issueAccessToken("normal-user", "user", 60);

        const revokedCount = revokeSetupPendingAccessTokens("pending-admin");
        assert.equal(revokedCount >= 1, true);
        assert.equal(verifyAccessToken(pendingUserToken), null);
        assert.deepEqual(verifyAccessToken(pendingAdminToken), {
            sub: "pending-admin",
            role: "admin",
            providerId: "local",
            tfaSetupPending: true,
        });
        assert.deepEqual(verifyAccessToken(normalToken), {
            sub: "normal-user",
            role: "user",
            providerId: "local",
            tfaSetupPending: false,
        });
    });
});

test("page security headers include registered script origins", () => {
    const headers = new Map<string, string>();
    const response = {
        setHeader(name: string, value: string) {
            headers.set(name.toLowerCase(), value);
        },
    } as unknown as import("node:http").ServerResponse;

    const registered = registerPageScriptOrigin(
        "https://meetings.example.test/path?ignored=true",
    );
    setPageSecurityHeaders(response);

    const contentSecurityPolicy = headers.get("content-security-policy") ?? "";
    assert.equal(registered, "https://meetings.example.test");
    assert.match(
        contentSecurityPolicy,
        /script-src 'self' https:\/\/meetings\.example\.test/,
    );
    assert.match(
        contentSecurityPolicy,
        /script-src-elem 'self' https:\/\/meetings\.example\.test/,
    );
});

test("page script origin registration rejects non-http origins", () => {
    assert.equal(registerPageScriptOrigin("javascript:alert(1)"), null);
    assert.equal(registerPageScriptOrigin(""), null);
});

test("page script origins are isolated and replaced per owner", () => {
    const firstOrigins = registerPageScriptOrigins("test:replaceable", [
        "https://first.example.test/path",
    ]);
    const secondOrigins = registerPageScriptOrigins("test:replaceable", [
        "https://second.example.test/path",
    ]);
    const headers = new Map<string, string>();
    const response = {
        setHeader(name: string, value: string) {
            headers.set(name.toLowerCase(), value);
        },
    } as unknown as import("node:http").ServerResponse;

    setPageSecurityHeaders(response);

    const contentSecurityPolicy = headers.get("content-security-policy") ?? "";
    assert.deepEqual(firstOrigins, ["https://first.example.test"]);
    assert.deepEqual(secondOrigins, ["https://second.example.test"]);
    assert.doesNotMatch(
        contentSecurityPolicy,
        /https:\/\/first\.example\.test/,
    );
    assert.match(contentSecurityPolicy, /https:\/\/second\.example\.test/);
});
