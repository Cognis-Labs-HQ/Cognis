import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DbProfileStore } from "../adapters/db/profile-store.js";
import {
    DbLocalAccountStore,
    SqliteExecutor,
} from "../adapters/db/account-store.js";
import { createProfileRoutes } from "../routes/profile/index.js";
import { issueAccessToken } from "../auth/access-tokens.js";

function makeTempDb() {
    const dir = mkdtempSync(path.join(tmpdir(), "cognis-profile-test-"));
    return { dir, executor: new SqliteExecutor(path.join(dir, "test.sqlite")) };
}

function fakeFileGateway() {
    const store = new Map<string, Buffer>();
    return {
        async put(key: string, content: Uint8Array) {
            store.set(key, Buffer.from(content));
            return { key, size: content.length, lastModified: new Date() };
        },
        async store(userId: string, content: Uint8Array, contentType?: string) {
            const ext =
                (
                    {
                        "image/jpeg": "jpg",
                        "image/jpg": "jpg",
                        "image/png": "png",
                        "image/webp": "webp",
                        "image/gif": "gif",
                    } as Record<string, string>
                )[contentType ?? ""] ?? "";
            const uuid = `test-uuid-${store.size}`;
            const key = ext ? `${userId}/${uuid}.${ext}` : `${userId}/${uuid}`;
            store.set(key, Buffer.from(content));
            return { key, size: content.length, lastModified: new Date() };
        },
        async get(key: string) {
            return store.get(key) ?? null;
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
    body?: string | Buffer,
    contentType?: string,
) {
    const chunks = body
        ? [Buffer.isBuffer(body) ? body : Buffer.from(body)]
        : [];
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

async function setupUser(
    executor: any,
    username: string,
    visibility = "hidden",
) {
    const accountStore = new DbLocalAccountStore(executor, "sqlite");
    await accountStore.ensureSchema();
    const profileStore = new DbProfileStore(executor, "sqlite");
    await profileStore.ensureSchema();
    await accountStore.register(username, "pw");
    await profileStore.createProfile(username, username);
    if (visibility !== "hidden") {
        await profileStore.updateProfile(username, {
            visibility: visibility as any,
        });
    }
    return profileStore;
}

test("profile routes - get own profile auto-creates profile when none exists", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const token = issueAccessToken("alice", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
        await route(
            makeReq("GET", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.handle, "alice");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - unauthenticated GET /api/v1/profile returns 401", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        await route(
            makeReq("GET", null),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile"),
        );
        assert.equal(status, 401);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - get own profile returns data after creation", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("alice", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("alice", "alice");
        const token = issueAccessToken("alice", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
        await route(
            makeReq("GET", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.handle, "alice");
        assert.equal(parsed.data.visibility, "hidden");
        assert.equal(parsed.data.role, "user");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - PATCH updates bio and visibility", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("bob", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("bob", "bob");
        const token = issueAccessToken("bob", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
        await route(
            makeReq(
                "PATCH",
                token,
                JSON.stringify({ bio: "Hello world", visibility: "community" }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.bio, "Hello world");
        assert.equal(parsed.data.visibility, "community");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - PATCH updates displayName", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("diana", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("diana", "diana");
        const token = issueAccessToken("diana", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
        await route(
            makeReq(
                "PATCH",
                token,
                JSON.stringify({ displayName: "Diana Prince" }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.displayName, "Diana Prince");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - PATCH rejects invalid visibility", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("carol", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("carol", "carol");
        const token = issueAccessToken("carol", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        await route(
            makeReq("PATCH", token, JSON.stringify({ visibility: "public" })),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - hidden profile not visible to other users", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("dave", "pw");
        await accountStore.register("eve", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("dave", "dave");
        const eveToken = issueAccessToken("eve", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        await route(
            makeReq("GET", eveToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/dave/profile"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - admin always sees hidden profile", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "hidden-user", "hidden");
        const adminToken = issueAccessToken("admin", "admin", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
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
            new URL("http://localhost/api/v1/users/hidden-user/profile"),
        );
        assert.equal(status, 200);
        assert.match(body, /hidden-user/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - private profile: follower can see, non-follower cannot", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        await accountStore.register("carol", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.createProfile("carol", "carol");
        await profileStore.updateProfile("alice", { visibility: "private" });
        await profileStore.follow("bob", "alice");

        const route = createProfileRoutes(profileStore, fakeFileGateway());

        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;
        let body = "";
        await route(
            makeReq("GET", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/alice/profile"),
        );
        assert.equal(status, 200);
        assert.match(body, /alice/);

        const carolToken = issueAccessToken("carol", "user", 60);
        await route(
            makeReq("GET", carolToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/profile"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - friends visibility: profile visible but counts hidden for non-follower", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.updateProfile("alice", { visibility: "friends" });

        const bobToken = issueAccessToken("bob", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
        await route(
            makeReq("GET", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/alice/profile"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.handle, "alice");
        assert.equal(parsed.data.followerCount, null);
        assert.equal(parsed.data.followingCount, null);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - community profile visible to other users", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("frank", "pw");
        await accountStore.register("grace", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("frank", "frank");
        await profileStore.updateProfile("frank", { visibility: "community" });
        const graceToken = issueAccessToken("grace", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";
        await route(
            makeReq("GET", graceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/frank/profile"),
        );
        assert.equal(status, 200);
        assert.match(body, /frank/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - blocked caller gets 404 on public profile", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.block("alice", "bob");

        const bobToken = issueAccessToken("bob", "user", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        await route(
            makeReq("GET", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/profile"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - avatar upload succeeds and sets avatarKey", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const gateway = fakeFileGateway();
        const route = createProfileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        const imageData = Buffer.from("fake png data");
        let status = 0;
        let body = "";
        await route(
            makeReq("PUT", token, imageData, "image/png"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile/avatar"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.match(parsed.data.avatarKey, /^alice\//);
        assert.ok(gateway._has(parsed.data.avatarKey));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - avatar upload rejects disallowed MIME type", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        await route(
            makeReq("PUT", token, Buffer.from("fake gif data"), "image/gif"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile/avatar"),
        );
        assert.equal(status, 415);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - avatar upload rejects oversized image", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        await profileStore.setFileSizeLimit("image", 10);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        await route(
            makeReq("PUT", token, Buffer.alloc(20, "x"), "image/png"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile/avatar"),
        );
        assert.equal(status, 413);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - banner upload allows gif", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const gateway = fakeFileGateway();
        const route = createProfileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";
        await route(
            makeReq("PUT", token, Buffer.from("fake gif data"), "image/gif"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile/banner"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.match(parsed.data.bannerKey, /\.gif$/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - banner upload rejects unsupported type", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        await route(
            makeReq("PUT", token, Buffer.from("bmp data"), "image/bmp"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile/banner"),
        );
        assert.equal(status, 415);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - avatar DELETE clears avatarKey", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const gateway = fakeFileGateway();
        await profileStore.updateProfile("alice", {
            avatarKey: "profile/avatars/alice.png",
        });
        const route = createProfileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";
        await route(
            makeReq("DELETE", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile/avatar"),
        );
        assert.equal(status, 200);
        assert.match(body, /removed/);
        const profile = await profileStore.getProfile("alice");
        assert.equal(profile?.avatarKey, null);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile routes - banner DELETE clears bannerKey", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        await profileStore.updateProfile("alice", {
            bannerKey: "profile/banners/alice.gif",
        });
        const gateway = fakeFileGateway();
        const route = createProfileRoutes(profileStore, gateway);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";
        await route(
            makeReq("DELETE", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile/banner"),
        );
        assert.equal(status, 200);
        assert.match(body, /removed/);
        const profile = await profileStore.getProfile("alice");
        assert.equal(profile?.bannerKey, null);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("GET /api/v1/profile/ping returns 200 when authenticated", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createProfileRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";
        await route(
            makeReq("GET", token),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/profile/ping"),
        );
        assert.equal(status, 200);
        assert.deepEqual(JSON.parse(body).data, { available: true });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("GET /api/v1/profile/ping returns 401 when unauthenticated", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createProfileRoutes(profileStore);
        let status = 0;
        await route(
            makeReq("GET"),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile/ping"),
        );
        assert.equal(status, 401);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("avatar routes return 503 when fileGateway is absent", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createProfileRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        await route(
            {
                method: "PUT",
                headers: {
                    authorization: `Bearer ${token}`,
                    "content-type": "image/png",
                    "content-length": "0",
                },
                [Symbol.asyncIterator]: async function* () {},
            } as any,
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/profile/avatar"),
        );
        assert.equal(status, 503);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
