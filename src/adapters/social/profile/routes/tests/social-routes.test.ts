import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { DbProfileStore } from "../../store.js";
import { DbLocalAccountStore } from "../../../../../adapters/auth/local/store.js";
import { createSocialRoutes } from "../social.js";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";
import { makeTempDb } from "./helpers.js";

function makeReq(method: string, token: string | null) {
    return {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        [Symbol.asyncIterator]: async function* () {},
    } as any;
}

async function setupUsers(executor: any, ...usernames: string[]) {
    const accountStore = new DbLocalAccountStore(executor);
    await accountStore.ensureSchema();
    const profileStore = new DbProfileStore(executor);
    await profileStore.ensureSchema();
    for (const username of usernames) {
        await accountStore.register(username, "pw");
        await profileStore.createProfile(username, username);
    }
    return profileStore;
}

test("social routes - follow and unfollow", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.updateProfile("bob", { visibility: "community" });
        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq("POST", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/bob/follow"),
        );
        assert.equal(status, 200);
        assert.match(body, /true/);
        assert.ok(await profileStore.isFollowing("alice", "bob"));

        await route(
            makeReq("DELETE", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/bob/follow"),
        );
        assert.equal(status, 200);
        assert.ok(!(await profileStore.isFollowing("alice", "bob")));
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - cannot follow hidden user", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice", "hidden");
        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq("POST", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/hidden/follow"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - cannot follow yourself", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice");
        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq("POST", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/follow"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - unauthenticated follow request returns 401", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice", "bob");
        await profileStore.updateProfile("bob", { visibility: "community" });
        const route = createSocialRoutes(profileStore);
        let status = 0;

        await route(
            makeReq("POST", null),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/bob/follow"),
        );
        assert.equal(status, 401);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - block removes follow and returns 404 for blocked user", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.updateProfile("bob", { visibility: "community" });
        await profileStore.follow("bob", "alice");

        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;

        await route(
            makeReq("POST", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/bob/block"),
        );
        assert.equal(status, 200);
        assert.ok(!(await profileStore.isFollowing("bob", "alice")));

        await route(
            makeReq("POST", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/follow"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - cannot block yourself", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice");
        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq("POST", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/block"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - unblock removes block", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.updateProfile("bob", { visibility: "community" });
        await profileStore.block("alice", "bob");

        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq("DELETE", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/bob/block"),
        );
        assert.equal(status, 200);
        assert.match(body, /false/);

        await route(
            makeReq("POST", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/follow"),
        );
        assert.equal(status, 200);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - get followers and following", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(
            executor,
            "alice",
            "bob",
            "carol",
        );
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.updateProfile("bob", { visibility: "community" });
        await profileStore.updateProfile("carol", { visibility: "community" });
        await profileStore.follow("bob", "alice");
        await profileStore.follow("carol", "alice");

        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq("GET", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/alice/followers"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.length, 2);

        await route(
            makeReq("GET", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/bob/following"),
        );
        assert.equal(status, 200);
        const following = JSON.parse(body);
        assert.equal(following.data.length, 1);
        assert.equal(following.data[0].handle, "alice");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - followers list is empty for friends-visibility account when requester is not a follower", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(
            executor,
            "alice",
            "bob",
            "carol",
        );
        await profileStore.updateProfile("alice", { visibility: "friends" });
        await profileStore.updateProfile("bob", { visibility: "community" });
        await profileStore.follow("bob", "alice");

        const route = createSocialRoutes(profileStore);
        const carolToken = issueAccessToken("carol", "user", 60);
        let status = 0;
        let body = "";

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
            new URL("http://localhost/api/v1/users/alice/followers"),
        );
        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.length, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - admin search includes hidden users", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "admin", "hidden-user");
        await profileStore.updateProfile("hidden-user", {
            visibility: "hidden",
        });
        const route = createSocialRoutes(profileStore);
        const adminToken = issueAccessToken("admin", "admin", 60);
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
            new URL("http://localhost/api/v1/users/search?q=hidden"),
        );

        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.length, 1);
        assert.equal(parsed.data[0].handle, "hidden-user");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - regular search excludes hidden users", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "alice", "hidden-user");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.updateProfile("hidden-user", {
            visibility: "hidden",
        });
        const route = createSocialRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq("GET", aliceToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/users/search?q=hidden"),
        );

        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.deepEqual(parsed.data, []);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("social routes - admin relationship can message hidden users", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUsers(executor, "admin", "hidden-user");
        await profileStore.updateProfile("admin", { visibility: "hidden" });
        await profileStore.updateProfile("hidden-user", {
            visibility: "hidden",
        });
        const route = createSocialRoutes(profileStore);
        const adminToken = issueAccessToken("admin", "admin", 60);
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
            new URL("http://localhost/api/v1/users/hidden-user/relationship"),
        );

        assert.equal(status, 200);
        const parsed = JSON.parse(body);
        assert.equal(parsed.data.canMessage, true);
        assert.equal(parsed.data.canSendMessageRequest, true);
        assert.equal(parsed.data.requiresMessageRequest, false);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
