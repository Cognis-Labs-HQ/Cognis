import test from "node:test";
import assert from "node:assert/strict";
import { createUserEmailRoutes } from "../bootstrap.js";
import { DbNotificationStore } from "../../../adapters/db/notification-store.js";
import { SqliteExecutor } from "../../../adapters/db/account-store.js";
import { TfaCodeService, InMemoryTfaStore } from "../../../utils/tfa-code.js";
import {
    VerifyTokenService,
    InMemoryVerifyTokenStore,
} from "../../../utils/verify-token.js";
import { CoreNotificationGateway } from "../gateway.js";
import { VolatileNotificationPreferenceStore } from "../gateway.js";
import { issueAccessToken } from "../../../auth/access-tokens.js";

async function makeNotifStore(): Promise<DbNotificationStore> {
    const db = new SqliteExecutor(":memory:");
    const store = new DbNotificationStore(db, "sqlite");
    await store.ensureSchema();
    return store;
}

function makeGateway() {
    return new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
    );
}

function makeRequest(
    method: string,
    body: Record<string, unknown>,
    token: string,
) {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as any;
}

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(data: string) {
            payload = data;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

test("adding the first email auto-sets it as primary", async () => {
    const notifStore = await makeNotifStore();
    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const gateway = makeGateway();
    const token = issueAccessToken("alice", "user", 60);

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { email: "alice@example.com" }, token),
        res,
        new URL("http://localhost/api/v1/users/alice/emails"),
    );
    assert.equal(res.status, 201);

    const emails = await notifStore.getUserEmails("alice");
    assert.equal(emails.length, 1);
    assert.equal(emails[0].primary, true);
});

test("cannot delete primary email", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");
    await notifStore.addUserEmail("alice", "alt@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const gateway = makeGateway();
    const token = issueAccessToken("alice", "user", 60);

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );
    const res = makeResponse();

    await route(
        {
            method: "DELETE",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        res,
        new URL(
            "http://localhost/api/v1/users/alice/emails/alice%40example.com",
        ),
    );
    assert.equal(res.status, 409);
    const data = JSON.parse(res.payload);
    assert.equal(data.error.code, "cannot_remove_primary_email");
});

test("email verification flow: issue code, verify, email becomes verified", async () => {
    const notifStore = await makeNotifStore();
    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const token = issueAccessToken("alice", "user", 60);

    const sentEmails: Array<{ to: string; code: string }> = [];
    const mockGateway = {
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (to: string, code: string) => {
            sentEmails.push({ to, code });
        },
    } as any;

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        mockGateway,
    );

    const addRes = makeResponse();
    await route(
        makeRequest("POST", { email: "alice@example.com" }, token),
        addRes,
        new URL("http://localhost/api/v1/users/alice/emails"),
    );
    assert.equal(addRes.status, 201);
    const addData = JSON.parse(addRes.payload);
    assert.equal(addData.data.pendingVerification, true);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0].to, "alice@example.com");

    const emailsBefore = await notifStore.getUserEmails("alice");
    assert.equal(emailsBefore[0].verified, false);

    const code = sentEmails[0].code;

    const verRes = makeResponse();
    await route(
        makeRequest("POST", { code }, token),
        verRes,
        new URL(
            "http://localhost/api/v1/users/alice/emails/alice%40example.com/verify",
        ),
    );
    assert.equal(verRes.status, 200);

    const emailsAfter = await notifStore.getUserEmails("alice");
    assert.equal(emailsAfter[0].verified, true);
});

test("email verification rejects wrong code with 422", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    tfaService.issue("alice:alice@example.com");
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const gateway = makeGateway();
    const token = issueAccessToken("alice", "user", 60);

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { code: "000000" }, token),
        res,
        new URL(
            "http://localhost/api/v1/users/alice/emails/alice%40example.com/verify",
        ),
    );
    assert.equal(res.status, 422);
});

test("link verification GET redirects to /verify-email", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const linkToken = verifyTokenService.issue("alice:alice@example.com");
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
        "http://localhost",
    );
    let capturedLocation = "";
    const res = {
        writeHead(_code: number, headers?: Record<string, string>) {
            if (headers?.location) capturedLocation = headers.location;
        },
        end() {},
    } as any;

    await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL(
            `http://localhost/api/v1/users/alice/emails/alice%40example.com/verify?token=${linkToken}`,
        ),
    );
    assert.ok(
        capturedLocation.startsWith("/verify-email?token="),
        `expected redirect to /verify-email, got: ${capturedLocation}`,
    );

    const emails = await notifStore.getUserEmails("alice");
    assert.equal(
        emails[0].verified,
        false,
        "redirect should not consume token or verify email",
    );
});

test("POST /api/v1/verify-email with valid token verifies email", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const linkToken = verifyTokenService.issue("alice:alice@example.com");
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { token: linkToken }, ""),
        res,
        new URL("http://localhost/api/v1/verify-email"),
    );
    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.data.verified, true);

    const emails = await notifStore.getUserEmails("alice");
    assert.equal(emails[0].verified, true);
});

test("POST /api/v1/verify-email token cannot be reused", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const linkToken = verifyTokenService.issue("alice:alice@example.com");
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );

    const first = makeResponse();
    await route(
        makeRequest("POST", { token: linkToken }, ""),
        first,
        new URL("http://localhost/api/v1/verify-email"),
    );
    assert.equal(first.status, 200);

    const second = makeResponse();
    await route(
        makeRequest("POST", { token: linkToken }, ""),
        second,
        new URL("http://localhost/api/v1/verify-email"),
    );
    assert.equal(second.status, 400);
    const errData = JSON.parse(second.payload);
    assert.equal(errData.error.code, "invalid_token");
});

test("add email issues both TFA code and verify token and includes link in email", async () => {
    const notifStore = await makeNotifStore();
    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const authToken = issueAccessToken("alice", "user", 60);

    const sentEmails: Array<{ to: string; code: string; verifyUrl?: string }> =
        [];
    const mockGateway = {
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (
            to: string,
            code: string,
            verifyUrl?: string,
        ) => {
            sentEmails.push({ to, code, verifyUrl });
        },
    } as any;

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        mockGateway,
        "http://localhost",
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { email: "alice@example.com" }, authToken),
        res,
        new URL("http://localhost/api/v1/users/alice/emails"),
    );
    assert.equal(res.status, 201);
    assert.equal(sentEmails.length, 1);
    assert.ok(sentEmails[0].verifyUrl);
    assert.ok(sentEmails[0].verifyUrl!.includes("/verify-email?token="));
    const data = JSON.parse(res.payload);
    assert.ok(
        data.data.watchToken,
        "watchToken should be returned in response",
    );
});

test("verify-tokens/status returns pending:true for a live token", async () => {
    const notifStore = await makeNotifStore();
    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const liveToken = verifyTokenService.issue("alice:alice@example.com");
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );
    const res = makeResponse();

    await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL(
            `http://localhost/api/v1/verify-tokens/status?token=${liveToken}`,
        ),
    );
    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.data.pending, true);
});

test("verify-tokens/status returns pending:false after token is consumed", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const liveToken = verifyTokenService.issue("alice:alice@example.com");
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
        "http://localhost",
    );

    const verifyRes = makeResponse();
    await route(
        makeRequest("POST", { token: liveToken }, ""),
        verifyRes,
        new URL("http://localhost/api/v1/verify-email"),
    );
    assert.equal(verifyRes.status, 200);

    const statusRes = makeResponse();
    await route(
        { method: "GET", headers: {} } as any,
        statusRes,
        new URL(
            `http://localhost/api/v1/verify-tokens/status?token=${liveToken}`,
        ),
    );
    assert.equal(statusRes.status, 200);
    const data = JSON.parse(statusRes.payload);
    assert.equal(data.data.pending, false);
});

test("verify-tokens/status returns pending:false for an unknown token", async () => {
    const notifStore = await makeNotifStore();
    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        gateway,
    );
    const res = makeResponse();

    await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL("http://localhost/api/v1/verify-tokens/status?token=bogus"),
    );
    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.data.pending, false);
});
