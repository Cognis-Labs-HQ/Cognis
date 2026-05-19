import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../profile-store.js";
import { createProfileRoutes } from "../index.js";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";

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
    profileStore: VolatileProfileStore,
    username: string,
    visibility = "hidden",
) {
    await profileStore.createProfile(username, username);
    if (visibility !== "hidden") {
        await profileStore.updateProfile(username, {
            visibility: visibility as any,
        });
    }
}

test("profile routes - get own profile auto-creates profile when none exists", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - unauthenticated GET /api/v1/profile returns 401", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - get own profile returns data after creation", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - PATCH updates bio and visibility", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes log profile updates", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("bob", "bob");
    const token = issueAccessToken("bob", "user", 60);
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const route = createProfileRoutes(
        profileStore,
        fakeFileGateway(),
        undefined,
        (level, message, meta) => {
            entries.push({ level, message, meta });
        },
    );

    await route(
        makeReq(
            "PATCH",
            token,
            JSON.stringify({ bio: "Hello world", visibility: "community" }),
        ),
        {
            writeHead() {},
            end() {},
        } as any,
        new URL("http://localhost/api/v1/profile"),
    );

    assert.deepEqual(entries, [
        {
            level: "info",
            message: "Updated profile.",
            meta: {
                component: "api-profile",
                method: "PATCH",
                path: "/api/v1/profile",
                accountId: "bob",
                changedFields: ["bio", "visibility"],
            },
        },
    ]);
});

test("profile routes - PATCH updates displayName", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - PATCH rejects invalid visibility", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - hidden profile not visible to other users", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - admin always sees hidden profile", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "hidden-user", "hidden");
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
});

test("profile routes - private profile returns full details only for mutual follows", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice");
    await profileStore.createProfile("bob", "bob");
    await profileStore.createProfile("carol", "carol");
    await profileStore.updateProfile("alice", {
        visibility: "private",
        bio: "private details",
    });
    await profileStore.follow("bob", "alice");
    await profileStore.follow("alice", "bob");

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
    const bobPayload = JSON.parse(body);
    assert.equal(bobPayload.data.handle, "alice");
    assert.equal(bobPayload.data.bio, "private details");

    const carolToken = issueAccessToken("carol", "user", 60);
    await route(
        makeReq("GET", carolToken),
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
    const carolPayload = JSON.parse(body);
    assert.equal(carolPayload.data.handle, "alice");
    assert.equal(carolPayload.data.bio, null);
    assert.equal(carolPayload.data.followerCount, null);
});

test("profile routes - friends visibility: profile visible but counts hidden for non-follower", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - community profile visible to other users", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - blocked caller gets 404 on public profile", async () => {
    const profileStore = new VolatileProfileStore();
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
});

test("profile routes - avatar upload succeeds and sets avatarKey", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("profile routes - avatar upload rejects disallowed MIME type", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("profile routes - avatar upload rejects oversized image", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    profileStore.setFileSizeLimit("image", 10);
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
});

test("profile routes - banner upload allows gif", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("profile routes - banner upload rejects unsupported type", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("profile routes - avatar DELETE clears avatarKey", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("profile routes - banner DELETE clears bannerKey", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("GET /api/v1/profile/ping returns 200 when authenticated", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("GET /api/v1/profile/ping returns 401 when unauthenticated", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const route = createProfileRoutes(profileStore);
    let status = 0;
    await route(
        makeReq("GET", null),
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/profile/ping"),
    );
    assert.equal(status, 401);
});

test("avatar PUT returns 503 when fileGateway is absent", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
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
});

test("avatar DELETE returns 503 when fileGateway is absent", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const route = createProfileRoutes(profileStore);
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
    assert.equal(status, 503);
    assert.equal(JSON.parse(body).error.code, "file_storage_unavailable");
});

test("banner PUT returns 503 when fileGateway is absent", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const route = createProfileRoutes(profileStore);
    const token = issueAccessToken("alice", "user", 60);
    let status = 0;
    let body = "";
    await route(
        {
            method: "PUT",
            headers: {
                authorization: `Bearer ${token}`,
                "content-type": "image/jpeg",
                "content-length": "0",
            },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
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
    assert.equal(status, 503);
    assert.equal(JSON.parse(body).error.code, "file_storage_unavailable");
});

test("banner DELETE returns 503 when fileGateway is absent", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const route = createProfileRoutes(profileStore);
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
    assert.equal(status, 503);
    assert.equal(JSON.parse(body).error.code, "file_storage_unavailable");
});
