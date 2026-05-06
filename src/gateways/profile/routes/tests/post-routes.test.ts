import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { DbProfileStore } from "../../../../adapters/db/reuse/profile-store.js";
import { SqliteExecutor } from "../../../../gateways/db/executor.js";
import { DbLocalAccountStore } from "../../../../adapters/auth/local/store.js";
import { createPostRoutes } from "../posts.js";
import { issueAccessToken } from "../../../../api/auth/access-tokens.js";
import { makeTempDb } from "./helpers.js";

function makeReq(method: string, token: string | null, body?: string) {
    const chunks = body ? [Buffer.from(body)] : [];
    return {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        [Symbol.asyncIterator]: async function* () {
            for (const c of chunks) yield c;
        },
    } as any;
}

async function setupUser(
    executor: any,
    username: string,
    visibility = "community",
) {
    const accountStore = new DbLocalAccountStore(executor, "sqlite");
    await accountStore.ensureSchema();
    const profileStore = new DbProfileStore(executor, "sqlite");
    await profileStore.ensureSchema();
    await accountStore.register(username, "pw");
    await profileStore.createProfile(username, username);
    if (visibility !== "hidden")
        await profileStore.updateProfile(username, {
            visibility: visibility as any,
        });
    return profileStore;
}

test("post routes - hidden user cannot post", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice", "hidden");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq(
                "POST",
                token,
                JSON.stringify({ content: "hello", visibility: "community" }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        assert.equal(status, 403);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - unauthenticated POST /api/v1/posts returns 401", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        let status = 0;

        await route(
            makeReq(
                "POST",
                null,
                JSON.stringify({ content: "hello", visibility: "community" }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        assert.equal(status, 401);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - missing content returns 400", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq("POST", token, JSON.stringify({ visibility: "community" })),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - invalid visibility returns 400", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeReq(
                "POST",
                token,
                JSON.stringify({ content: "hello", visibility: "public" }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - create and list own posts", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                token,
                JSON.stringify({
                    title: "My Post",
                    content: "Hello world",
                    visibility: "community",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        assert.equal(status, 201);
        const created = JSON.parse(body).data;
        assert.equal(created.content, "Hello world");
        assert.equal(created.title, "My Post");

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
            new URL("http://localhost/api/v1/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 1);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - delete own post", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                token,
                JSON.stringify({
                    content: "deletable",
                    visibility: "community",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        const postId = JSON.parse(body).data.id;

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
            new URL(`http://localhost/api/v1/posts/${postId}`),
        );
        assert.equal(status, 200);
        assert.match(body, /deleted/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - cannot delete another user post without elevated role", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });

        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "alice post",
                    visibility: "community",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        const postId = JSON.parse(body).data.id;

        await route(
            makeReq("DELETE", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL(`http://localhost/api/v1/posts/${postId}`),
        );
        assert.equal(status, 403);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - moderator can delete another user post", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const modToken = issueAccessToken("mod", "moderator", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "removable post",
                    visibility: "community",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        const postId = JSON.parse(body).data.id;

        await route(
            makeReq("DELETE", modToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL(`http://localhost/api/v1/posts/${postId}`),
        );
        assert.equal(status, 200);
        assert.match(body, /deleted/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - admin can delete another user post", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const adminToken = issueAccessToken("admin", "admin", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "post to remove",
                    visibility: "community",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );
        const postId = JSON.parse(body).data.id;

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
            new URL(`http://localhost/api/v1/posts/${postId}`),
        );
        assert.equal(status, 200);
        assert.match(body, /deleted/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - only_me posts not visible to others", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });

        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "private thought",
                    visibility: "only_me",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );

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
            new URL("http://localhost/api/v1/users/alice/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - blocked caller gets 404 on user posts", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.block("alice", "bob");

        const route = createPostRoutes(profileStore);
        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;

        await route(
            makeReq("GET", bobToken),
            {
                writeHead(c: number) {
                    status = c;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/users/alice/posts"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("post routes - private account posts only visible to followers", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const accountStore = new DbLocalAccountStore(executor, "sqlite");
        await accountStore.ensureSchema();
        const profileStore = new DbProfileStore(executor, "sqlite");
        await profileStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        await accountStore.register("carol", "pw");
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.createProfile("carol", "carol");
        await profileStore.updateProfile("alice", { visibility: "private" });
        await profileStore.follow("bob", "alice");

        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const bobToken = issueAccessToken("bob", "user", 60);
        const carolToken = issueAccessToken("carol", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeReq(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "private post",
                    visibility: "private",
                }),
            ),
            {
                writeHead(c: number) {
                    status = c;
                },
                end(p: string) {
                    body = p;
                },
            } as any,
            new URL("http://localhost/api/v1/posts"),
        );

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
            new URL("http://localhost/api/v1/users/alice/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 1);

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
            new URL("http://localhost/api/v1/users/alice/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
