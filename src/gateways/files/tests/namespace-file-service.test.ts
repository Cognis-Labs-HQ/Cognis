import test from "node:test";
import assert from "node:assert/strict";
import type {
    FileStorageGateway,
    NamespaceDefinition,
    StoredObject,
} from "@cognis/core";
import { NamespaceRegistry } from "../reuse/namespace-registry.js";
import { DbFileObjectStore } from "../reuse/file-object-store.js";
import {
    AccessDeniedError,
    NamespaceFileService,
    QuotaExceededError,
} from "../reuse/namespace-file-service.js";
import { AclCeilingViolationError } from "../reuse/acl.js";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";
import type { FileQuotaStore } from "../reuse/quota-store-contract.js";

function fakeRawGateway(): FileStorageGateway {
    const store = new Map<string, Buffer>();
    return {
        async put(
            namespaceId: string,
            key: string,
            content: Uint8Array,
        ): Promise<StoredObject> {
            store.set(`${namespaceId}/${key}`, Buffer.from(content));
            return { key, size: content.byteLength, lastModified: new Date() };
        },
        async store(
            namespaceId: string,
            actorId: string,
            content: Uint8Array,
        ): Promise<StoredObject> {
            const key = `${actorId}/${store.size}`;
            store.set(`${namespaceId}/${key}`, Buffer.from(content));
            return { key, size: content.byteLength, lastModified: new Date() };
        },
        async get(
            namespaceId: string,
            key: string,
        ): Promise<Uint8Array | null> {
            return store.get(`${namespaceId}/${key}`) ?? null;
        },
        async delete(namespaceId: string, key: string): Promise<boolean> {
            return store.delete(`${namespaceId}/${key}`);
        },
        async list(): Promise<StoredObject[]> {
            return [];
        },
    };
}

function fakeQuotaStore(overrides: {
    namespaceQuota?: number;
    globalQuota?: number;
}): FileQuotaStore {
    return {
        async ensureNamespaceDefault() {},
        async listNamespaceDefaults() {
            return [];
        },
        async setNamespaceDefault() {},
        async getGlobalDefault() {
            return 0;
        },
        async setGlobalDefault() {},
        async provisionUser() {},
        async getUserNamespaceQuota() {
            return overrides.namespaceQuota;
        },
        async setUserNamespaceQuota() {},
        async listUserQuotas() {
            return [];
        },
        async getUserGlobalQuota() {
            return overrides.globalQuota;
        },
        async setUserGlobalQuota() {},
    };
}

function buildService(
    definitions: NamespaceDefinition[],
    quotaStore?: FileQuotaStore,
): NamespaceFileService {
    const registry = new NamespaceRegistry();
    for (const definition of definitions) registry.register(definition);
    const executor = new InMemoryTestExecutor();
    const objects = new DbFileObjectStore(() => executor);
    return new NamespaceFileService(
        registry,
        fakeRawGateway(),
        objects,
        () => quotaStore,
    );
}

test("put rejects an ACL that exceeds the namespace ceiling", async () => {
    const service = buildService([
        {
            id: "user",
            ownerComponent: "core",
            acl: { visibility: "private-owner" },
        },
    ]);
    await assert.rejects(
        service.put(
            "user",
            { actorId: "alice", callerComponent: "core" },
            "doc.txt",
            Buffer.from("hi"),
            { publicRead: true },
        ),
        AclCeilingViolationError,
    );
});

test("put/get round-trips content for the owner", async () => {
    const service = buildService([
        {
            id: "user",
            ownerComponent: "core",
            acl: { visibility: "private-owner" },
        },
    ]);
    const access = { actorId: "alice", callerComponent: "core" };
    await service.put("user", access, "doc.txt", Buffer.from("hello"));
    const content = await service.get("user", access, "doc.txt");
    assert.equal(Buffer.from(content ?? []).toString("utf8"), "hello");
});

test("get denies non-owners in a private-owner namespace", async () => {
    const service = buildService([
        {
            id: "user",
            ownerComponent: "core",
            acl: { visibility: "private-owner" },
        },
    ]);
    await service.put(
        "user",
        { actorId: "alice", callerComponent: "core" },
        "doc.txt",
        Buffer.from("hello"),
    );
    await assert.rejects(
        service.get(
            "user",
            { actorId: "bob", callerComponent: "core" },
            "doc.txt",
        ),
        AccessDeniedError,
    );
});

test("cross-component access is denied unless allow-listed or core", async () => {
    const service = buildService([
        {
            id: "chats",
            ownerComponent: "social-messages",
            acl: { visibility: "private-group" },
        },
    ]);
    await assert.rejects(
        service.put(
            "chats",
            { actorId: "alice", callerComponent: "study-classes" },
            "avatar.png",
            Buffer.from("data"),
        ),
        AccessDeniedError,
    );
});

test("cross-component access is permitted when allow-listed", async () => {
    const service = buildService([
        {
            id: "chats",
            ownerComponent: "social-messages",
            acl: { visibility: "private-group" },
            allowComponents: ["study-classes"],
        },
    ]);
    const stored = await service.put(
        "chats",
        { actorId: "alice", callerComponent: "study-classes" },
        "avatar.png",
        Buffer.from("data"),
    );
    assert.equal(stored.key, "avatar.png");
});

test("put rejects writes that would exceed the per-namespace quota", async () => {
    const service = buildService(
        [
            {
                id: "user",
                ownerComponent: "core",
                acl: { visibility: "private-owner" },
            },
        ],
        fakeQuotaStore({ namespaceQuota: 5 }),
    );
    await assert.rejects(
        service.put(
            "user",
            { actorId: "alice", callerComponent: "core" },
            "doc.txt",
            Buffer.from("this is more than five bytes"),
        ),
        QuotaExceededError,
    );
});

test("put rejects writes that would exceed the global quota", async () => {
    const service = buildService(
        [
            {
                id: "user",
                ownerComponent: "core",
                acl: { visibility: "private-owner" },
            },
        ],
        fakeQuotaStore({ globalQuota: 5 }),
    );
    await assert.rejects(
        service.put(
            "user",
            { actorId: "alice", callerComponent: "core" },
            "doc.txt",
            Buffer.from("this is more than five bytes"),
        ),
        QuotaExceededError,
    );
});

test("put allows writes within quota", async () => {
    const service = buildService(
        [
            {
                id: "user",
                ownerComponent: "core",
                acl: { visibility: "private-owner" },
            },
        ],
        fakeQuotaStore({ namespaceQuota: 1024, globalQuota: 1024 }),
    );
    const stored = await service.put(
        "user",
        { actorId: "alice", callerComponent: "core" },
        "doc.txt",
        Buffer.from("small"),
    );
    assert.equal(stored.key, "doc.txt");
});
