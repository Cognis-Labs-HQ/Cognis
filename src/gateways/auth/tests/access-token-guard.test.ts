import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    issueAccessToken,
    revokeAccessTokensForSubject,
    verifyAccessToken,
} from "../access-tokens.js";
import { requireAuth } from "../guard.js";

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

        assert.deepEqual(claims, { sub: "persisted-user", role: "user" });
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
    });
});
