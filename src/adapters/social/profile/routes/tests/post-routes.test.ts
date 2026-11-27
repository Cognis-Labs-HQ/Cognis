import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { DbProfileStore as DatabaseProfileStore } from "../../store.js";
import { DbLocalAccountStore as DatabaseLocalAccountStore } from "../../../../../adapters/auth/local/store.js";
import { createPostRoutes } from "../posts.js";
import { issueAccessToken } from "../../../../../gateways/auth/access-tokens.js";
import { makeTempDb as makeTemporaryDatabase } from "./helpers.js";

function makeRequest(method: string, token: string | null, body?: string) {
    const chunks = body ? [Buffer.from(body)] : [];
    return {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as any;
}

async function setupUser(
    executor: any,
    username: string,
    visibility = "community",
) {
    const accountStore = new DatabaseLocalAccountStore(executor);
    await accountStore.ensureSchema();
    const profileStore = new DatabaseProfileStore(executor);
    await profileStore.ensureSchema();
    await accountStore.register(username, "pw");
    await profileStore.createProfile(username, username);
    if (visibility !== "hidden")
        await profileStore.updateProfile(username, {
            visibility: visibility as any,
        });
    return profileStore;
}

test("post routes - hidden user cannot post with community visibility", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice", "hidden");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeRequest(
                "POST",
                token,
                JSON.stringify({ content: "hello", visibility: "community" }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - hidden user can post with only_me visibility", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice", "hidden");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeRequest(
                "POST",
                token,
                JSON.stringify({
                    content: "private note",
                    visibility: "only_me",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 201);
        const created = JSON.parse(body).data;
        assert.equal(created.content, "private note");
        assert.equal(created.visibility, "only_me");
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - unauthenticated POST /api/v1/social/posts returns 401", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        let status = 0;

        await route(
            makeRequest(
                "POST",
                null,
                JSON.stringify({ content: "hello", visibility: "community" }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 401);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - missing content returns 400", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeRequest(
                "POST",
                token,
                JSON.stringify({ visibility: "community" }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - invalid visibility returns 400", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;

        await route(
            makeRequest(
                "POST",
                token,
                JSON.stringify({ content: "hello", visibility: "public" }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 400);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - create and list own posts", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeRequest(
                "POST",
                token,
                JSON.stringify({
                    title: "My Post",
                    content: "Hello world",
                    visibility: "community",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 201);
        const created = JSON.parse(body).data;
        assert.equal(created.content, "Hello world");
        assert.equal(created.title, "My Post");

        await route(
            makeRequest("GET", token),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 1);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - list visible posts across authors for search", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const accountStore = new DatabaseLocalAccountStore(executor);
        await accountStore.ensureSchema();
        const profileStore = new DatabaseProfileStore(executor);
        await profileStore.ensureSchema();
        await accountStore.register("alice", "pw");
        await accountStore.register("bob", "pw");
        await profileStore.createProfile("alice", "alice");
        await profileStore.createProfile("bob", "bob");
        await profileStore.updateProfile("alice", { visibility: "community" });
        await profileStore.updateProfile("bob", { visibility: "community" });
        await profileStore.block("bob", "alice");
        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const bobToken = issueAccessToken("bob", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeRequest(
                "POST",
                bobToken,
                JSON.stringify({
                    title: "Visible Bob Post",
                    content: "shared searchable post",
                    visibility: "community",
                }),
            ),
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload: string) {
                    body = payload;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 201);

        await route(
            makeRequest(
                "POST",
                aliceToken,
                JSON.stringify({
                    title: "Private Alice Note",
                    content: "shared searchable private note",
                    visibility: "only_me",
                }),
            ),
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload: string) {
                    body = payload;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        assert.equal(status, 201);

        await route(
            makeRequest("GET", aliceToken),
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload: string) {
                    body = payload;
                },
            } as any,
            new URL(
                "http://localhost/api/v1/social/posts?scope=visible&q=shared",
            ),
        );
        assert.equal(status, 200);
        const visiblePosts = JSON.parse(body).data;
        assert.equal(visiblePosts.length, 1);
        assert.deepEqual(
            visiblePosts.map((post: any) => post.author.handle).sort(),
            ["alice"],
        );
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - delete own post", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const token = issueAccessToken("alice", "user", 60);
        let status = 0;
        let body = "";

        await route(
            makeRequest(
                "POST",
                token,
                JSON.stringify({
                    content: "deletable",
                    visibility: "community",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        const postId = JSON.parse(body).data.id;

        await route(
            makeRequest("DELETE", token),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL(`http://localhost/api/v1/social/posts/${postId}`),
        );
        assert.equal(status, 200);
        assert.match(body, /deleted/);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - cannot delete another user post without elevated role", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const accountStore = new DatabaseLocalAccountStore(executor);
        await accountStore.ensureSchema();
        const profileStore = new DatabaseProfileStore(executor);
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
            makeRequest(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "alice post",
                    visibility: "community",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        const postId = JSON.parse(body).data.id;

        await route(
            makeRequest("DELETE", bobToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end() {},
            } as any,
            new URL(`http://localhost/api/v1/social/posts/${postId}`),
        );
        assert.equal(status, 403);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - moderator can delete another user post", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const moduleToken = issueAccessToken("mod", "moderator", 60);
        let status = 0;
        let body = "";

        await route(
            makeRequest(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "removable post",
                    visibility: "community",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        const postId = JSON.parse(body).data.id;

        await route(
            makeRequest("DELETE", moduleToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL(`http://localhost/api/v1/social/posts/${postId}`),
        );
        assert.equal(status, 200);
        assert.match(body, /deleted/);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - admin can delete another user post", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const profileStore = await setupUser(executor, "alice");
        const route = createPostRoutes(profileStore);
        const aliceToken = issueAccessToken("alice", "user", 60);
        const adminToken = issueAccessToken("admin", "admin", 60);
        let status = 0;
        let body = "";

        await route(
            makeRequest(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "post to remove",
                    visibility: "community",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );
        const postId = JSON.parse(body).data.id;

        await route(
            makeRequest("DELETE", adminToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL(`http://localhost/api/v1/social/posts/${postId}`),
        );
        assert.equal(status, 200);
        assert.match(body, /deleted/);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - only_me posts not visible to others", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const accountStore = new DatabaseLocalAccountStore(executor);
        await accountStore.ensureSchema();
        const profileStore = new DatabaseProfileStore(executor);
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
            makeRequest(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "private thought",
                    visibility: "only_me",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );

        await route(
            makeRequest("GET", bobToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/users/alice/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 0);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - blocked caller gets 404 on user posts", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const accountStore = new DatabaseLocalAccountStore(executor);
        await accountStore.ensureSchema();
        const profileStore = new DatabaseProfileStore(executor);
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
            makeRequest("GET", bobToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end() {},
            } as any,
            new URL("http://localhost/api/v1/social/users/alice/posts"),
        );
        assert.equal(status, 404);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post routes - private account posts only visible to followers", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const accountStore = new DatabaseLocalAccountStore(executor);
        await accountStore.ensureSchema();
        const profileStore = new DatabaseProfileStore(executor);
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
            makeRequest(
                "POST",
                aliceToken,
                JSON.stringify({
                    content: "private post",
                    visibility: "private",
                }),
            ),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/posts"),
        );

        await route(
            makeRequest("GET", bobToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/users/alice/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 1);

        await route(
            makeRequest("GET", carolToken),
            {
                writeHead(statusCode: number) {
                    status = statusCode;
                },
                end(responseBody: string) {
                    body = responseBody;
                },
            } as any,
            new URL("http://localhost/api/v1/social/users/alice/posts"),
        );
        assert.equal(status, 200);
        assert.equal(JSON.parse(body).data.length, 0);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("post retries preserve identity and reject changed or cross-account payloads", async () => {
    const { dir: directory, executor } = makeTemporaryDatabase();
    try {
        const store = await setupUser(executor, "alice", "community");
        await setupUser(executor, "bob", "community");
        const route = createPostRoutes(store);
        const input = {
            operationId: "a41d92c4-34a0-4603-9c6b-a12345678901",
            content: "Offline post",
            visibility: "community",
        };
        async function send(body = input, account = "alice") {
            let status = 0;
            let payload = "";
            await route(
                makeRequest(
                    "POST",
                    issueAccessToken(account, "user", 60),
                    JSON.stringify(body),
                ),
                {
                    writeHead(value: number) {
                        status = value;
                    },
                    end(value: string) {
                        payload = value;
                    },
                } as any,
                new URL("http://localhost/api/v1/social/posts"),
            );
            return { status, body: JSON.parse(payload) };
        }
        const first = await send();
        assert.equal(first.status, 201);
        assert.equal((await send()).body.data.id, first.body.data.id);
        assert.equal((await store.getPostsByAccount("alice")).length, 1);
        assert.equal(
            (await send({ ...input, content: "conflict" })).status,
            409,
        );
        assert.equal((await send(input, "bob")).status, 409);
        assert.equal(
            (await send({ ...input, operationId: "invalid" })).status,
            400,
        );
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});
