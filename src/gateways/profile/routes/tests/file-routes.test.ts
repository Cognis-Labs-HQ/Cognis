import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { DbProfileStore } from "../../../../adapters/db/shared/profile-store.js";
import {
    DbLocalAccountStore,
    SqliteExecutor,
} from "../../../../adapters/db/shared/account-store.js";
import { createFileRoutes } from "../files.js";
import { issueAccessToken } from "../../../../api/auth/access-tokens.js";
import { makeTempDb } from "./helpers.js";

function fakeFileGateway() {
    const store = new Map<string, { data: Buffer; mime?: string }>();
    return {
        async put(key: string, content: Uint8Array, contentType?: string) {
            store.set(key, { data: Buffer.from(content), mime: contentType });
            return {
                key,
                size: content.length,
                contentType,
                lastModified: new Date(),
            };
        },
        async store(userId: string, content: Uint8Array, contentType?: string) {
            const uuid = `test-uuid-${store.size}`;
            const key = `${userId}/${uuid}`;
            store.set(key, { data: Buffer.from(content), mime: contentType });
            return {
                key,
                size: content.length,
                contentType,
                lastModified: new Date(),
            };
        },
        async get(key: string) {
            return store.get(key)?.data ?? null;
        },
        async delete(key: string) {
            store.delete(key);
            return true;
        },
        async list() {
            return [];
        },
        _has(key: string) {
            return store.has(key);
        },
    };
}

function makeReq(
    method: string,
    token: string | null,
    body?: Buffer,
    contentType?: string,
) {
    const chunks = body ? [body] : [];
    return {
        method,
        headers: {
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(contentType ? { "content-type": contentType } : {}),
        },
        [Symbol.asyncIterator]: async function* () {
            for (const c of chunks) yield c;
        },
    } as any;
}

test("file routes - upload and download a file", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";
        const content = Buffer.from("fake image data");

        await route(
            makeReq("PUT", token, content, "image/png"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/files/documents/test.png"),
        );
        assert.equal(status, 201);
        const uploaded = JSON.parse(body);
        assert.equal(uploaded.data.key, "documents/test.png");

        await route(
            makeReq("GET", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: Buffer) {
                    body = p.toString();
                },
            } as any,
            new URL("http://localhost/api/v1/files/documents/test.png"),
        );
        assert.equal(status, 200);
        assert.equal(body, "fake image data");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - GET non-existent file returns 404", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq("GET", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/files/avatars/no-such-file.png"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - upload blocked when exceeding size limit", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.setFileSizeLimit("image", 10);
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        const oversized = Buffer.alloc(20, "x");

        await route(
            makeReq("PUT", token, oversized, "image/png"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/files/avatars/test.png"),
        );
        assert.equal(status, 413);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - non-admin DELETE is rejected", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq("DELETE", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/files/avatars/alice.png"),
        );
        assert.equal(status, 403);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - admin can DELETE a file", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        await gateway.put(
            "avatars/alice.png",
            Buffer.from("data"),
            "image/png",
        );
        const route = createFileRoutes(profileStore, gateway);
        const adminToken = issueAccessToken("admin", "admin", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq("DELETE", adminToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/files/avatars/alice.png"),
        );
        assert.equal(status, 200);
        const result = JSON.parse(body);
        assert.equal(result.data.deleted, true);
        assert.ok(!gateway._has("avatars/alice.png"));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - get file size limits (admin only)", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const adminToken = issueAccessToken("admin", "admin", 60);
        const userToken = issueAccessToken("user", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq("GET", userToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/admin/file-limits"),
        );
        assert.equal(status, 403);

        await route(
            makeReq("GET", adminToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/admin/file-limits"),
        );
        assert.equal(status, 200);
        const limits = JSON.parse(body).data;
        assert.ok(Array.isArray(limits));
        assert.ok(limits.some((l: any) => l.category === "image"));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - admin can update file size limit", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const adminToken = issueAccessToken("admin", "admin", 60);
        let status = 0;
        let body = "";

        const payload = Buffer.from(JSON.stringify({ maxBytes: 1048576 }));
        await route(
            makeReq("PUT", adminToken, payload, "application/json"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/admin/file-limits/video"),
        );
        assert.equal(status, 200);
        const result = JSON.parse(body);
        assert.equal(result.data.category, "video");
        assert.equal(result.data.maxBytes, 1048576);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("file routes - invalid maxBytes returns 400", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const gateway = fakeFileGateway();
        const route = createFileRoutes(profileStore, gateway);
        const adminToken = issueAccessToken("admin", "admin", 60);
        let status = 0;

        const badPayload = Buffer.from(JSON.stringify({ maxBytes: -5 }));
        await route(
            makeReq("PUT", adminToken, badPayload, "application/json"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/admin/file-limits/image"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
