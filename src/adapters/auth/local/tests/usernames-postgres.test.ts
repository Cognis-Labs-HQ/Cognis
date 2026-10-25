import assert from "node:assert/strict";
import test from "node:test";
import { createDbExecutor } from "../../../../gateways/db/executor.js";
import { DbLocalAccountStore } from "../store.js";

const databaseUrl = process.env.COGNIS_TEST_IDENTITY_POSTGRES_URL;
test(
    "persisted identities use opaque IDs and transactional username claims",
    { skip: !databaseUrl && "Requires a disposable identity test database" },
    async (context) => {
        process.env.DATABASE_URL = databaseUrl;
        let shutdown: (() => Promise<void>) | undefined;
        const executor = await createDbExecutor(
            "postgresql",
            undefined,
            undefined,
            {
                registerShutdown(handler) {
                    shutdown = handler;
                },
            },
        );
        try {
            await executor.ensureTable({
                name: "accounts",
                columns: [
                    { name: "id", type: "text", primaryKey: true },
                    { name: "email", type: "text" },
                    { name: "display_name", type: "text" },
                    { name: "is_admin", type: "boolean" },
                    { name: "role", type: "text" },
                    { name: "enabled", type: "boolean" },
                    { name: "created_at", type: "timestamp" },
                    { name: "updated_at", type: "timestamp" },
                ],
            });
            await executor.executeCommand({
                option: "DELETE",
                table: "accounts",
            });
            const store = new DbLocalAccountStore(executor);
            await store.ensureSchema();
            const identity = {
                accountId: "provider:alice",
                provider: "oidc",
                externalUserId: "subject-one",
            };
            let first = "";
            await context.test(
                "opaque ID, neutral name and stable subject mapping",
                async () => {
                    first = await store.ensureExternalAccount(identity);
                    assert.match(first, /^u_[a-f0-9]{32}$/);
                    assert.equal(await store.getUsername(first), "alice");
                    assert.equal(
                        await store.ensureExternalAccount(identity),
                        first,
                    );
                },
            );
            await context.test(
                "same provider duplicate is rejected and rolled back",
                async () => {
                    await assert.rejects(
                        store.ensureExternalAccount({
                            ...identity,
                            externalUserId: "subject-two",
                        }),
                        /provider_username_taken/,
                    );
                    assert.equal(
                        await store.resolveExternalAccountId(
                            "oidc",
                            "subject-two",
                        ),
                        null,
                    );
                    assert.equal(
                        (
                            await executor.executeCommand({
                                option: "SELECT",
                                table: "accounts",
                            })
                        ).rows?.length,
                        1,
                    );
                },
            );
            await context.test(
                "different provider receives one compact suffix before profile creation",
                async () => {
                    const second = await store.ensureExternalAccount({
                        ...identity,
                        provider: "saml",
                        externalUserId: "other-subject",
                    });
                    assert.notEqual(first, second);
                    assert.match(
                        (await store.getUsername(second))!,
                        /^alice-[a-z0-9]{4}$/,
                    );
                },
            );
            await context.test(
                "concurrent cross-provider claims remain globally unique",
                async () => {
                    const ids = await Promise.all(
                        Array.from({ length: 6 }, (_, index) =>
                            store.ensureExternalAccount({
                                accountId: "person",
                                provider: `issuer-${index}`,
                                externalUserId: "subject",
                            }),
                        ),
                    );
                    const names = await Promise.all(
                        ids.map((id) => store.getUsername(id)),
                    );
                    assert.equal(new Set(names).size, names.length);
                },
            );
        } finally {
            await shutdown?.();
        }
    },
);
