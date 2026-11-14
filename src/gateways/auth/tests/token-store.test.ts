import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseTokenStoreEntry } from "../token-store-schema.js";

const now = Date.now();
const record = {
    subject: "synthetic-user",
    role: "user",
    providerId: "local",
    issuedAt: now - 1000,
    expiresAt: now + 60000,
    setupPending: false,
    purpose: "session",
};
const token = "synthetic-offline-token";
const tokenHash = createHash("sha256").update(token).digest("hex");

async function withStore(
    payload: unknown,
    run: (
        load: () => Promise<typeof import("../access-tokens.js")>,
        filename: string,
    ) => Promise<void>,
): Promise<void> {
    const directory = mkdtempSync(path.join(tmpdir(), "cognis-token-schema-"));
    const filename = path.join(directory, "tokens.json");
    const previous = process.env.COGNIS_ACCESS_TOKEN_STORE_PATH;
    process.env.COGNIS_ACCESS_TOKEN_STORE_PATH = filename;
    writeFileSync(filename, JSON.stringify(payload));
    const load = (): Promise<typeof import("../access-tokens.js")> =>
        import(
            `${new URL("../access-tokens.ts", import.meta.url).href}?fixture=${randomUUID()}`
        );
    try {
        await run(load, filename);
    } finally {
        if (previous === undefined)
            delete process.env.COGNIS_ACCESS_TOKEN_STORE_PATH;
        else process.env.COGNIS_ACCESS_TOKEN_STORE_PATH = previous;
        rmSync(directory, { recursive: true, force: true });
    }
}

for (const expiresAt of [now + 60000, null]) {
    test(`unsupported security records cannot authenticate with expiry ${expiresAt === null ? "unlimited" : "finite"}`, async () => {
        for (const version of [undefined, 1, 999, 2]) {
            const previousRecord = {
                ...record,
                expiresAt,
                tfaSetupPending: true,
            };
            Reflect.deleteProperty(previousRecord, "setupPending");
            await withStore(
                {
                    version,
                    tokens: [[tokenHash, previousRecord]],
                    revokedTokens: [],
                },
                async (load) => {
                    assert.equal((await load()).verifyAccessToken(token), null);
                },
            );
        }
    });
}

for (const patch of [
    { issuedAt: "yesterday" },
    { issuedAt: now + 60000 },
    { issuedAt: -1 },
    { expiresAt: now - 2000 },
    { expiresAt: Infinity },
    { role: "superuser" },
    { providerId: "" },
    { subject: " " },
    { setupPending: "false" },
    { purpose: "unknown" },
    { setupPending: true, purpose: "share" },
    { extraAuthority: true },
]) {
    test(`invalid security record is rejected ${JSON.stringify(patch)}`, () => {
        assert.equal(
            parseTokenStoreEntry([tokenHash, { ...record, ...patch }], now),
            null,
        );
    });
}

for (const field of Object.keys(record)) {
    test(`security field ${field} must be explicit`, () => {
        const missing: Record<string, unknown> = { ...record };
        delete missing[field];
        assert.equal(parseTokenStoreEntry([tokenHash, missing], now), null);
    });
}

test("invalid token hash cannot enter the store", () => {
    assert.equal(parseTokenStoreEntry(["invalid-hash", record], now), null);
});

test("current sessions and revoked records preserve authority across reload", async () => {
    await withStore(
        { version: 2, tokens: [], revokedTokens: [] },
        async (load) => {
            const initial = await load();
            const normal = initial.issueAccessToken(
                "synthetic-admin",
                "admin",
                null,
            );
            const pending = initial.issueAccessToken(
                "synthetic-admin",
                "admin",
                60,
                { setupPending: true },
            );
            const other = initial.issueAccessToken(
                "synthetic-other",
                "user",
                null,
                { setupPending: true },
            );
            const reset = initial.issueAccessToken(
                "synthetic-user",
                "user",
                60,
                { purpose: "password-reset" },
            );
            const share = initial.issueAccessToken(
                "synthetic-share",
                "user",
                60,
                { purpose: "share" },
            );
            const restored = await load();
            assert.equal(
                restored.verifyAccessToken(pending)?.setupPending,
                true,
            );
            assert.equal(restored.verifyAccessToken(other)?.setupPending, true);
            assert.equal(
                restored.verifyAccessToken(normal)?.setupPending,
                false,
            );
            assert.equal(restored.verifyAccessToken(reset), null);
            assert.ok(
                restored.verifyAccessToken(reset, {
                    purpose: "password-reset",
                }),
            );
            assert.ok(restored.verifyAccessToken(share, { purpose: "share" }));
            assert.equal(restored.revokeSetupPendingAccessTokens(), 2);
            assert.equal(restored.revokeSetupPendingAccessTokens(), 0);
            const restarted = await load();
            for (const revoked of [pending, other]) {
                assert.equal(restarted.verifyAccessToken(revoked), null);
                assert.equal(restarted.consumeAccessToken(revoked), null);
                assert.equal(
                    restarted.lookupAccessToken(revoked)?.revoked,
                    true,
                );
            }
            assert.ok(restarted.verifyAccessToken(normal));
        },
    );
});

test("revocation write failures are visible and retry persists the revoked state", async () => {
    await withStore(
        { version: 2, tokens: [], revokedTokens: [] },
        async (load, filename) => {
            const current = await load();
            const pending = current.issueAccessToken(
                "synthetic-admin",
                "admin",
                60,
                { setupPending: true },
            );
            const temporary = `${filename}.${process.pid}.tmp`;
            mkdirSync(temporary);
            assert.throws(
                () => current.revokeSetupPendingAccessTokens(),
                /access_token_persistence_failed/,
            );
            assert.equal(current.verifyAccessToken(pending), null);
            assert.throws(
                () =>
                    current.issueAccessToken(
                        "synthetic-unpublished",
                        "user",
                        60,
                    ),
                /access_token_persistence_failed/,
            );
            rmSync(temporary, { recursive: true });
            assert.equal(current.revokeSetupPendingAccessTokens(), 0);
            assert.equal((await load()).verifyAccessToken(pending), null);
        },
    );
});

test("revoked copy takes precedence over an active duplicate", async () => {
    await withStore(
        {
            version: 2,
            tokens: [[tokenHash, record]],
            revokedTokens: [[tokenHash, record]],
        },
        async (load) => {
            const current = await load();
            assert.equal(current.verifyAccessToken(token), null);
        },
    );
});

for (const entries of [
    [
        [tokenHash, { ...record, setupPending: true }],
        [tokenHash, record],
    ],
    [
        [tokenHash, record],
        [tokenHash, { ...record, setupPending: true }],
    ],
    [
        [tokenHash, { ...record, setupPending: "invalid" }],
        [tokenHash, record],
    ],
]) {
    test("ambiguous duplicate records cannot authenticate", async () => {
        await withStore(
            { version: 2, tokens: entries, revokedTokens: [] },
            async (load) => {
                assert.equal((await load()).verifyAccessToken(token), null);
            },
        );
    });
}

for (const version of [undefined, 1, 3, 999, "2"]) {
    test(`unsupported envelope ${String(version)} rejects an otherwise valid session`, async () => {
        await withStore(
            { version, tokens: [[tokenHash, record]], revokedTokens: [] },
            async (load) => {
                assert.equal((await load()).verifyAccessToken(token), null);
            },
        );
    });
}

test("rejected records do not discard unrelated valid current sessions", async () => {
    await withStore(
        {
            version: 2,
            tokens: [
                ["bad-hash", record],
                [tokenHash, record],
            ],
            revokedTokens: [],
        },
        async (load) => {
            assert.ok((await load()).verifyAccessToken(token));
        },
    );
});

for (const patch of [
    { expiresAt: null },
    { expiresAt: record.issuedAt + 1801 * 1000 },
    { expiresAt: record.issuedAt },
    { setupPending: true },
    { role: "admin" },
    { providerId: "external" },
]) {
    test(`onboarding records require bounded least authority ${JSON.stringify(patch)}`, () => {
        assert.equal(
            parseTokenStoreEntry(
                [tokenHash, { ...record, purpose: "onboarding", ...patch }],
                now,
            ),
            null,
        );
    });
}

test("persisted onboarding credentials reload only for their purpose and retain revocation", async () => {
    await withStore(
        {
            version: 2,
            tokens: [[tokenHash, { ...record, purpose: "onboarding" }]],
            revokedTokens: [],
        },
        async (load) => {
            const first = await load();
            assert.equal(first.verifyAccessToken(token), null);
            assert.equal(
                first.verifyAccessToken(token, { purpose: "onboarding" })?.sub,
                record.subject,
            );
            first.revokeOnboardingAccessToken(token);
            const reloaded = await load();
            assert.equal(
                reloaded.verifyAccessToken(token, { purpose: "onboarding" }),
                null,
            );
            assert.equal(reloaded.lookupAccessToken(token)?.revoked, true);
            assert.equal(reloaded.revokeOnboardingAccessToken(token), true);
        },
    );
});

test("onboarding revocation persistence failure remains retryable without restoring live memory authority", async () => {
    await withStore(
        { version: 2, tokens: [], revokedTokens: [] },
        async (load, filename) => {
            const current = await load();
            const token = current.issueAccessToken(
                "synthetic-onboarding",
                "user",
                1800,
                { purpose: "onboarding" },
            );
            const ordinary = current.issueAccessToken(
                "synthetic-onboarding",
                "user",
                60,
            );
            const temporary = `${filename}.${process.pid}.tmp`;
            mkdirSync(temporary);
            assert.throws(
                () => current.revokeOnboardingAccessToken(token),
                /access_token_persistence_failed/,
            );
            assert.equal(
                current.verifyAccessToken(token, { purpose: "onboarding" }),
                null,
            );
            assert.ok(
                (await load()).verifyAccessToken(token, {
                    purpose: "onboarding",
                }),
            );
            rmSync(temporary, { recursive: true });
            assert.equal(current.revokeOnboardingAccessToken(token), true);
            const reloaded = await load();
            assert.equal(
                reloaded.verifyAccessToken(token, { purpose: "onboarding" }),
                null,
            );
            assert.ok(reloaded.verifyAccessToken(ordinary));
        },
    );
});
