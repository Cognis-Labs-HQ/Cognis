import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../store-contract.js";
import { createProfileRoutes } from "../index.js";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";
import { createDefaultRouteContext } from "../../../../../api/reuse/route-context.js";
import { fakeFileGateway, makeReq, setupUser } from "./route-fixtures.js";

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
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.match(parsed.data.avatarKey, /^alice\//);
    assert.ok(gateway._has(parsed.data.avatarKey));
});

test("profile routes - avatar upload deletes replaced file", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const gateway = fakeFileGateway();
    const route = createProfileRoutes(profileStore, gateway);
    const token = issueAccessToken("alice", "user", 60);
    let firstResponseBody = "";
    await route(
        makeReq("PUT", token, Buffer.from("first image"), "image/png"),
        {
            writeHead() {},
            end(payload: string) {
                firstResponseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );
    const firstAvatarKey = JSON.parse(firstResponseBody).data.avatarKey;

    let secondResponseBody = "";
    await route(
        makeReq("PUT", token, Buffer.from("second image"), "image/png"),
        {
            writeHead() {},
            end(payload: string) {
                secondResponseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );

    const secondAvatarKey = JSON.parse(secondResponseBody).data.avatarKey;
    assert.notEqual(secondAvatarKey, firstAvatarKey);
    assert.equal(gateway._has(firstAvatarKey), false);
    assert.equal(gateway._has(secondAvatarKey), true);
});

test("profile routes - avatar upload cleans up stored file when update fails", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const gateway = fakeFileGateway();
    const originalUpdateProfile = profileStore.updateProfile.bind(profileStore);
    profileStore.updateProfile = async (accountId, updates) => {
        if ("avatarKey" in updates) throw new Error("update failed");
        return originalUpdateProfile(accountId, updates);
    };
    const route = createProfileRoutes(profileStore, gateway);
    const token = issueAccessToken("alice", "user", 60);

    await assert.rejects(
        route(
            makeReq("PUT", token, Buffer.from("image"), "image/png"),
            {
                writeHead() {},
                end() {},
            } as any,
            new URL("http://localhost/api/v1/social/profile/avatar"),
        ),
        /update failed/,
    );
    assert.deepEqual(gateway._keys(), []);
});

test("profile routes - avatar upload succeeds when previous delete fails", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const gateway = fakeFileGateway();
    const route = createProfileRoutes(profileStore, gateway);
    const token = issueAccessToken("alice", "user", 60);

    let firstResponseBody = "";
    await route(
        makeReq("PUT", token, Buffer.from("first image"), "image/png"),
        {
            writeHead() {},
            end(payload: string) {
                firstResponseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );
    const firstAvatarKey = JSON.parse(firstResponseBody).data.avatarKey;

    const originalDelete = gateway.delete.bind(gateway);
    let shouldFailDelete = true;
    gateway.delete = async (key: string) => {
        if (key === firstAvatarKey && shouldFailDelete) {
            shouldFailDelete = false;
            throw new Error("transient delete failure");
        }
        return originalDelete(key);
    };

    let status = 0;
    let secondResponseBody = "";
    await route(
        makeReq("PUT", token, Buffer.from("second image"), "image/png"),
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                secondResponseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );

    assert.equal(status, 200);
    const secondAvatarKey = JSON.parse(secondResponseBody).data.avatarKey;
    assert.notEqual(secondAvatarKey, firstAvatarKey);
    assert.equal(gateway._has(secondAvatarKey), true);
    const profile = await profileStore.getProfile("alice");
    assert.equal(profile?.avatarKey, secondAvatarKey);
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
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );
    assert.equal(status, 415);
});

test("profile routes - avatar upload delegates large images to quota-aware storage", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const gateway = fakeFileGateway();
    const route = createProfileRoutes(profileStore, gateway);
    const token = issueAccessToken("alice", "user", 60);
    let status = 0;
    let responseBody = "";
    await route(
        makeReq("PUT", token, Buffer.alloc(12_000_000, "x"), "image/png"),
        {
            writeHead(c: number) {
                status = c;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/profile/avatar"),
    );
    assert.equal(status, 200);
    assert.equal(gateway._has(JSON.parse(responseBody).data.avatarKey), true);
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
        new URL("http://localhost/api/v1/social/profile/banner"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.match(parsed.data.bannerKey, /\.gif$/);
});

test("profile routes - banner upload falls back to direct persistence when flow stage result is missing", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    const gateway = fakeFileGateway();
    const flow = {
        exists(flowId: string) {
            return flowId === "upload-profile-media";
        },
        async run() {
            return {
                flowId: "upload-profile-media",
                data: {},
                stageResults: {},
            };
        },
    } as any;
    const routeContext = createDefaultRouteContext({ flow });
    const route = createProfileRoutes(
        profileStore,
        gateway,
        undefined,
        undefined,
        undefined,
        routeContext,
    );
    const token = issueAccessToken("alice", "user", 60);
    let status = 0;
    let body = "";
    await route(
        makeReq("PUT", token, Buffer.from("fake png data"), "image/png"),
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/social/profile/banner"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.match(parsed.data.bannerKey, /\.png$/);
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
        new URL("http://localhost/api/v1/social/profile/banner"),
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
        new URL("http://localhost/api/v1/social/profile/avatar"),
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
        new URL("http://localhost/api/v1/social/profile/banner"),
    );
    assert.equal(status, 200);
    assert.match(body, /removed/);
    const profile = await profileStore.getProfile("alice");
    assert.equal(profile?.bannerKey, null);
});

test("profile routes - banner DELETE falls back when the removal flow has no persistence result", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "alice");
    await profileStore.updateProfile("alice", {
        bannerKey: "profile/banners/alice.png",
    });
    const gateway = fakeFileGateway();
    const flow = {
        exists(flowId: string) {
            return flowId === "remove-profile-media";
        },
        async run() {
            return {
                flowId: "remove-profile-media",
                data: {},
                stageResults: {},
            };
        },
    } as any;
    const route = createProfileRoutes(
        profileStore,
        gateway,
        undefined,
        undefined,
        undefined,
        createDefaultRouteContext({ flow }),
    );
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
        new URL("http://localhost/api/v1/social/profile/banner"),
    );

    assert.equal(status, 200);
    const profile = await profileStore.getProfile("alice");
    assert.equal(profile?.bannerKey, null);
});

test("GET /api/v1/social/profile/ping returns 200 when authenticated", async () => {
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
        new URL("http://localhost/api/v1/social/profile/ping"),
    );
    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body).data, { available: true });
});

test("GET /api/v1/social/profile/ping returns 401 when unauthenticated", async () => {
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
        new URL("http://localhost/api/v1/social/profile/ping"),
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
        new URL("http://localhost/api/v1/social/profile/avatar"),
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
        new URL("http://localhost/api/v1/social/profile/avatar"),
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
        new URL("http://localhost/api/v1/social/profile/banner"),
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
        new URL("http://localhost/api/v1/social/profile/banner"),
    );
    assert.equal(status, 503);
    assert.equal(JSON.parse(body).error.code, "file_storage_unavailable");
});
