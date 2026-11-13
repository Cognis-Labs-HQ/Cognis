import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../store-contract.js";
import { createProfileRoutes } from "../index.js";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";
import { createDefaultRouteContext } from "../../../../../api/reuse/route-context.js";
import { fakeFileGateway, makeReq, setupUser } from "./route-fixtures.js";

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
        new URL("http://localhost/api/v1/social/profile"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.handle, "alice");
});

test("profile routes - unauthenticated GET /api/v1/social/profile returns 401", async () => {
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
        new URL("http://localhost/api/v1/social/profile"),
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
        new URL("http://localhost/api/v1/social/profile"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.handle, "alice");
    assert.equal(parsed.data.visibility, "friends");
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
        new URL("http://localhost/api/v1/social/profile"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.equal(parsed.data.bio, "Hello world");
    assert.equal(parsed.data.visibility, "community");
});

for (const visibility of ["hidden", "private"] as const) {
    test(`profile routes - admin cannot set profile visibility to ${visibility}`, async () => {
        const profileStore = new VolatileProfileStore();
        await profileStore.createProfile("admin", "admin", "admin");
        await profileStore.updateProfile("admin", { visibility: "community" });
        const token = issueAccessToken("admin", "admin", 60);
        const route = createProfileRoutes(profileStore, fakeFileGateway());
        let status = 0;
        let body = "";

        await route(
            makeReq("PATCH", token, JSON.stringify({ visibility })),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/social/profile"),
        );

        assert.equal(status, 409);
        assert.deepEqual(JSON.parse(body), {
            error: {
                code: "admin_visibility_incompatible",
                message:
                    "Admin accounts must use friends or community visibility",
            },
        });
        assert.equal(
            (await profileStore.getProfile("admin"))?.visibility,
            "community",
        );
    });
}

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
        new URL("http://localhost/api/v1/social/profile"),
    );

    assert.deepEqual(entries, [
        {
            level: "info",
            message: "Updated profile.",
            meta: {
                component: "api-profile",
                method: "PATCH",
                path: "/api/v1/social/profile",
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
        new URL("http://localhost/api/v1/social/profile"),
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
        new URL("http://localhost/api/v1/social/profile"),
    );
    assert.equal(status, 400);
});

test("profile routes - hidden profile not visible to other users", async () => {
    const profileStore = new VolatileProfileStore();
    await setupUser(profileStore, "dave", "hidden");
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
        new URL("http://localhost/api/v1/social/users/dave/profile"),
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
        new URL("http://localhost/api/v1/social/users/hidden-user/profile"),
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
        new URL("http://localhost/api/v1/social/users/alice/profile"),
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
        new URL("http://localhost/api/v1/social/users/alice/profile"),
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
        new URL("http://localhost/api/v1/social/users/alice/profile"),
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
        new URL("http://localhost/api/v1/social/users/frank/profile"),
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
        new URL("http://localhost/api/v1/social/users/alice/profile"),
    );
    assert.equal(status, 404);
});
