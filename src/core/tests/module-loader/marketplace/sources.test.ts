import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    createCtx,
    DEFAULT_TRUSTED_MODULE_SOURCE,
    type ModuleSource,
} from "../../../index.js";
import { ModuleSourceRegistry } from "../../../services/module-loader/marketplace/sources.js";
import { createSecretContext } from "./fixtures/encryption.js";

const source: ModuleSource = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Source",
    provider: "github",
    namespace: "example",
    baseUrl: "https://api.github.com",
};

async function fixture(context: TestContext) {
    const directory = await mkdtemp(
        path.join(tmpdir(), "cognis-source-secrets-"),
    );
    context.after(() => rm(directory, { recursive: true, force: true }));
    const encryption = createSecretContext();
    const validations: Array<{ source: ModuleSource; token: string }> = [];
    const validate = async (input: ModuleSource, token: string) => {
        validations.push({ source: input, token });
        return { valid: token !== "invalid", warnings: [], scopes: [] };
    };
    const file = path.join(directory, "sources.json");
    const registry = new ModuleSourceRegistry(
        file,
        encryption.ctx,
        DEFAULT_TRUSTED_MODULE_SOURCE,
        validate,
    );
    return { ...encryption, file, registry, validations, validate };
}

test("source credentials persist as concealed instance state and survive another administrator and restart", async (context) => {
    const host = await fixture(context);
    const stages: string[] = [];
    for (const stage of ["validate", "persist", "after"])
        host.ctx.flow.extend(
            "modules:sources:write",
            stage,
            { id: `test:${stage}` },
            () => {
                stages.push(stage);
            },
        );
    const saved = await host.registry.mutate({
        action: "save",
        source: { ...source, scanPrivateRepos: true },
        credential: { token: "private-PAT" },
    });
    assert.equal(saved?.credentialConfigured, true);
    assert.deepEqual(stages, ["validate", "persist", "after"]);
    assert.equal((await stat(host.file)).mode & 0o777, 0o600);
    const persisted = await readFile(host.file, "utf8");
    assert.equal(persisted.includes("private-PAT"), false);
    assert.equal(
        JSON.stringify(await host.registry.list()).includes("private-PAT"),
        false,
    );
    const restarted = new ModuleSourceRegistry(
        host.file,
        createSecretContext(host.records).ctx,
        DEFAULT_TRUSTED_MODULE_SOURCE,
        host.validate,
    );
    assert.equal(
        (await restarted.list()).find((entry) => entry.uuid === source.uuid)
            ?.credentialConfigured,
        true,
    );
    assert.equal(await restarted.token(source.uuid), "private-PAT");
    const retained = await restarted.mutate({
        action: "save",
        source: {
            ...source,
            name: "Another administrator",
            scanPrivateRepos: true,
        },
        credential: { token: "" },
    });
    assert.equal(retained?.credentialConfigured, true);
    assert.equal(host.validations.length, 1);
    assert.equal(await restarted.token(source.uuid), "private-PAT");
});

test("rotation and concurrent source saves preserve unrelated encrypted credentials", async (context) => {
    const host = await fixture(context);
    const other = {
        ...source,
        uuid: "303ba248-4ac9-4d44-98b5-b99bd4c6d722",
        namespace: "other",
    };
    await Promise.all([
        host.registry.mutate({
            action: "save",
            source,
            credential: { token: "first" },
        }),
        host.registry.mutate({
            action: "save",
            source: other,
            credential: { token: "second" },
        }),
    ]);
    await Promise.all([
        host.registry.mutate({
            action: "save",
            source,
            credential: { token: "rotated" },
        }),
        host.registry.mutate({ action: "save", source: other, credential: {} }),
    ]);
    assert.equal(await host.registry.token(source.uuid), "rotated");
    assert.equal(await host.registry.token(other.uuid), "second");
    await host.registry.mutate({
        action: "save",
        source,
        credential: { clearCredential: true },
    });
    assert.equal(
        (await host.registry.list()).find((entry) => entry.uuid === source.uuid)
            ?.credentialConfigured,
        false,
    );
    assert.equal(await host.registry.token(other.uuid), "second");
});

test("configured credentials cannot be redirected by mutable source fields or forged validation metadata", async (context) => {
    const host = await fixture(context);
    await host.registry.mutate({
        action: "save",
        source,
        credential: { token: "concealed" },
    });
    for (const change of [
        { baseUrl: "https://elsewhere.test" },
        { namespace: "another" },
        { provider: "gitlab" as const },
    ]) {
        await assert.rejects(
            host.registry.mutate({
                action: "save",
                source: { ...source, ...change },
                credential: {},
            }),
            /module_source_credential_scope_changed/,
        );
        await assert.rejects(
            host.registry.token(source.uuid, { ...source, ...change }),
            /module_source_credential_scope_changed/,
        );
    }
    const trusted = await host.registry.mutate({
        action: "save",
        source: {
            ...DEFAULT_TRUSTED_MODULE_SOURCE,
            baseUrl: "https://attacker.test",
            namespace: "attacker",
        },
        credential: { token: "newly-supplied" },
    });
    assert.equal(trusted?.baseUrl, DEFAULT_TRUSTED_MODULE_SOURCE.baseUrl);
    assert.equal(
        host.validations.at(-1)?.source.namespace,
        DEFAULT_TRUSTED_MODULE_SOURCE.namespace,
    );
    const records = JSON.parse(await readFile(host.file, "utf8"));
    records.find(
        (entry: ModuleSource) => entry.uuid === source.uuid,
    ).sealedCredential = records.find(
        (entry: ModuleSource) => entry.uuid === trusted?.uuid,
    ).sealedCredential;
    await writeFile(host.file, JSON.stringify(records));
    await assert.rejects(
        host.registry.token(source.uuid),
        /module_source_credential_scope_changed/,
    );
});

test("validation, persistence and missing cipher failures leave prior source state intact", async (context) => {
    const host = await fixture(context);
    await host.registry.mutate({
        action: "save",
        source,
        credential: { token: "known" },
    });
    const previous = await readFile(host.file, "utf8");
    await assert.rejects(
        host.registry.mutate({
            action: "save",
            source,
            credential: { token: "invalid" },
        }),
        /module_source_credential_invalid/,
    );
    assert.equal(await readFile(host.file, "utf8"), previous);
    host.ctx.flow.extend(
        "modules:sources:write",
        "persist",
        { id: "test:persistenceFailure", order: -10 },
        () => {
            throw new Error("disk_unavailable");
        },
    );
    await assert.rejects(
        host.registry.mutate({
            action: "save",
            source,
            credential: { token: "replacement" },
        }),
        /disk_unavailable/,
    );
    assert.equal(await readFile(host.file, "utf8"), previous);
    const unconfigured = new ModuleSourceRegistry(
        host.file,
        createCtx(),
        DEFAULT_TRUSTED_MODULE_SOURCE,
        host.validate,
    );
    await assert.rejects(
        unconfigured.mutate({
            action: "save",
            source,
            credential: { token: "replacement" },
        }),
        /secrets:encryption/,
    );
    assert.equal(await readFile(host.file, "utf8"), previous);
});

test("private scanning needs a configured credential and explicit removal requires disabling it", async (context) => {
    const host = await fixture(context);
    await assert.rejects(
        host.registry.mutate({
            action: "save",
            source: { ...source, scanPrivateRepos: true },
            credential: {},
        }),
        /module_source_credential_required/,
    );
    await host.registry.mutate({
        action: "save",
        source: { ...source, scanPrivateRepos: true },
        credential: { token: "private" },
    });
    await assert.rejects(
        host.registry.mutate({
            action: "save",
            source: { ...source, scanPrivateRepos: true },
            credential: { clearCredential: true },
        }),
        /module_source_credential_required/,
    );
    await host.registry.mutate({ action: "remove", uuid: source.uuid });
    assert.equal(await host.registry.token(source.uuid), undefined);
});
