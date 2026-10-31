import { emailVerificationKey } from "../bootstrap/email-verification-key.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createUserEmailRoutes } from "../bootstrap.js";
import { DbNotificationStore } from "../notification-store.js";
import { InMemoryTestExecutor } from "../../../gateways/db/tests/in-memory-test-executor.js";
import {
    TfaCodeService,
    InMemoryTfaStore,
} from "../../../api/reuse/tfa-code.js";
import {
    VerifyTokenService,
    InMemoryVerifyTokenStore,
} from "../../../api/reuse/verify-token.js";
import { CoreNotificationGateway } from "../gateway.js";
import { VolatileNotificationPreferenceStore } from "../gateway.js";
import { issueAccessToken } from "../../auth/access-tokens.js";

const EMAIL_PURPOSE = "test:verification";

async function makeNotifStore(): Promise<DbNotificationStore> {
    const db = new InMemoryTestExecutor();
    const store = new DbNotificationStore(db);
    await store.ensureSchema();
    return store;
}

function makeGateway() {
    return new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
    );
}

function makeEmailDelivery(gateway: {
    canSendVerificationEmail(): boolean;
    sendVerificationEmail?(
        purpose: string,
        recipientEmail: string,
        code: string,
        verifyUrl?: string,
    ): Promise<void>;
}) {
    return {
        purpose: EMAIL_PURPOSE,
        canSendVerificationEmail: () => gateway.canSendVerificationEmail(),
        sendEmail: async (input: {
            purpose: string;
            recipientEmail: string;
            variables: Record<string, string>;
        }) =>
            gateway.sendVerificationEmail?.(
                input.purpose,
                input.recipientEmail,
                input.variables.code,
                input.variables.verifyUrl || undefined,
            ),
    };
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
    const sentEmails: Array<Record<string, unknown>> = [];
    const token = issueAccessToken("alice", "user", 60);

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        {
            purpose: EMAIL_PURPOSE,
            canSendVerificationEmail: () => true,
            sendEmail: async (input) => {
                sentEmails.push(input);
            },
        },
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { email: "alice@example.com" }, token),
        res,
        new URL("http://localhost/api/v1/notify/users/alice/emails"),
    );
    assert.equal(res.status, 201);
    assert.equal(sentEmails[0]?.purpose, EMAIL_PURPOSE);
    assert.equal(sentEmails[0]?.recipientEmail, "alice@example.com");

    const emails = await notifStore.getUserEmails("alice");
    assert.equal(emails.length, 1);
    assert.equal(emails[0].primary, true);
});

test("returns 503 when SMTP is not available and does not add the email", async () => {
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
        {
            purpose: EMAIL_PURPOSE,
            canSendVerificationEmail: () => false,
            sendEmail: async () => {
                throw new Error("email_delivery_unavailable");
            },
        },
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { email: "alice@example.com" }, token),
        res,
        new URL("http://localhost/api/v1/notify/users/alice/emails"),
    );
    assert.equal(res.status, 503);
    const data = JSON.parse(res.payload);
    assert.equal(data.error.code, "email_delivery_unavailable");

    const emails = await notifStore.getUserEmails("alice");
    assert.equal(
        emails.length,
        0,
        "email must not be stored when SMTP is unavailable",
    );
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
        makeEmailDelivery(gateway),
    );
    const res = makeResponse();

    await route(
        {
            method: "DELETE",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/emails/alice%40example.com",
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
        purpose: EMAIL_PURPOSE,
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (
            _purpose: string,
            to: string,
            code: string,
        ) => {
            sentEmails.push({ to, code });
        },
    } as any;

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(mockGateway),
    );

    const addRes = makeResponse();
    await route(
        makeRequest("POST", { email: "alice@example.com" }, token),
        addRes,
        new URL("http://localhost/api/v1/notify/users/alice/emails"),
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
            "http://localhost/api/v1/notify/users/alice/emails/alice%40example.com/verify",
        ),
    );
    assert.equal(verRes.status, 200);

    const emailsAfter = await notifStore.getUserEmails("alice");
    assert.equal(emailsAfter[0].verified, true);
});

test("email verification codes use configured TFA SMTP code length", async () => {
    const notifStore = await makeNotifStore();
    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const token = issueAccessToken("alice", "user", 60);

    const sentEmails: Array<{ to: string; code: string }> = [];
    const mockGateway = {
        purpose: EMAIL_PURPOSE,
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (
            _purpose: string,
            to: string,
            code: string,
        ) => {
            sentEmails.push({ to, code });
        },
    } as any;

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(mockGateway),
        undefined,
        undefined,
        () => 8,
    );

    const addRes = makeResponse();
    await route(
        makeRequest("POST", { email: "alice@example.com" }, token),
        addRes,
        new URL("http://localhost/api/v1/notify/users/alice/emails"),
    );

    assert.equal(addRes.status, 201);
    assert.equal(sentEmails.length, 1);
    assert.match(sentEmails[0].code, /^\d{8}$/);
});

test("email verification rejects wrong code with 422", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    tfaService.issue(emailVerificationKey("alice", "alice@example.com"));
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const gateway = makeGateway();
    const token = issueAccessToken("alice", "user", 60);

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { code: "000000" }, token),
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/emails/alice%40example.com/verify",
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
    const linkToken = verifyTokenService.issue(
        emailVerificationKey("alice", "alice@example.com"),
    );
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
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
            `http://localhost/api/v1/notify/users/alice/emails/alice%40example.com/verify?token=${linkToken}`,
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

test("POST /api/v1/notify/verify-email with valid token verifies email", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const linkToken = verifyTokenService.issue(
        emailVerificationKey("alice", "alice@example.com"),
    );
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { token: linkToken }, ""),
        res,
        new URL("http://localhost/api/v1/notify/verify-email"),
    );
    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.data.verified, true);

    const emails = await notifStore.getUserEmails("alice");
    assert.equal(emails[0].verified, true);
});

test("POST /api/v1/notify/verify-email token cannot be reused", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const linkToken = verifyTokenService.issue(
        emailVerificationKey("alice", "alice@example.com"),
    );
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
    );

    const first = makeResponse();
    await route(
        makeRequest("POST", { token: linkToken }, ""),
        first,
        new URL("http://localhost/api/v1/notify/verify-email"),
    );
    assert.equal(first.status, 200);

    const second = makeResponse();
    await route(
        makeRequest("POST", { token: linkToken }, ""),
        second,
        new URL("http://localhost/api/v1/notify/verify-email"),
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
        purpose: EMAIL_PURPOSE,
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (
            _purpose: string,
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
        makeEmailDelivery(mockGateway),
        "http://localhost",
    );
    const res = makeResponse();

    await route(
        makeRequest("POST", { email: "alice@example.com" }, authToken),
        res,
        new URL("http://localhost/api/v1/notify/users/alice/emails"),
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
    const liveToken = verifyTokenService.issue(
        emailVerificationKey("alice", "alice@example.com"),
    );
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
    );
    const res = makeResponse();

    await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL(
            `http://localhost/api/v1/notify/verify-tokens/status?token=${liveToken}`,
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
    const liveToken = verifyTokenService.issue(
        emailVerificationKey("alice", "alice@example.com"),
    );
    const gateway = makeGateway();

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
        "http://localhost",
    );

    const verifyRes = makeResponse();
    await route(
        makeRequest("POST", { token: liveToken }, ""),
        verifyRes,
        new URL("http://localhost/api/v1/notify/verify-email"),
    );
    assert.equal(verifyRes.status, 200);

    const statusRes = makeResponse();
    await route(
        { method: "GET", headers: {} } as any,
        statusRes,
        new URL(
            `http://localhost/api/v1/notify/verify-tokens/status?token=${liveToken}`,
        ),
    );
    assert.equal(statusRes.status, 200);
    const data = JSON.parse(statusRes.payload);
    assert.equal(data.data.pending, false);
});

test("owner can list another user's emails", async () => {
    const notifStore = await makeNotifStore();
    await notifStore.addUserEmail("alice", "alice@example.com");

    const tfaService = new TfaCodeService(new InMemoryTfaStore());
    const verifyTokenService = new VerifyTokenService(
        new InMemoryVerifyTokenStore(),
    );
    const gateway = makeGateway();
    const ownerToken = issueAccessToken("owner-account", "owner", 60);

    const route = createUserEmailRoutes(
        notifStore,
        tfaService,
        verifyTokenService,
        makeEmailDelivery(gateway),
    );
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${ownerToken}` },
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/users/alice/emails"),
    );
    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.data.length, 1);
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
        makeEmailDelivery(gateway),
    );
    const res = makeResponse();

    await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL(
            "http://localhost/api/v1/notify/verify-tokens/status?token=bogus",
        ),
    );
    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.equal(data.data.pending, false);
});

test("SSO email resends support code and link verification with namespaced account IDs", async () => {
    const store = await makeNotifStore();
    const account = "x:firehawksystems";
    const email = "firehawk@opayq.net";
    await store.addUserEmail(account, email);
    const codes = new TfaCodeService(new InMemoryTfaStore());
    const tokens = new VerifyTokenService(new InMemoryVerifyTokenStore());
    const sent: Array<Record<string, string>> = [];
    let available = true;
    const route = createUserEmailRoutes(
        store,
        codes,
        tokens,
        {
            purpose: EMAIL_PURPOSE,
            canSendVerificationEmail: () => available,
            sendEmail: async ({ purpose, variables }) => {
                assert.equal(purpose, EMAIL_PURPOSE);
                sent.push(variables);
            },
        },
        "https://cognis.example",
    );
    const auth = issueAccessToken(account, "user", 60);
    const address = `http://localhost/api/v1/notify/users/${encodeURIComponent(account)}/emails/${encodeURIComponent(email)}`;
    const resend = makeResponse();
    await route(
        makeRequest("POST", {}, auth),
        resend,
        new URL(`${address}/resend`),
    );
    assert.equal(resend.status, 200);
    assert.equal(sent.length, 1);
    const verify = makeResponse();
    await route(
        makeRequest("POST", { code: sent[0].code }, auth),
        verify,
        new URL(`${address}/verify`),
    );
    assert.equal(verify.status, 200);
    assert.equal((await store.getUserEmails(account))[0].verified, true);
    const link = new URL(sent[0].verifyUrl);
    const linked = makeResponse();
    await route(
        makeRequest("POST", { token: link.searchParams.get("token") }, auth),
        linked,
        new URL("http://localhost/api/v1/notify/verify-email"),
    );
    assert.equal(linked.status, 200);
    assert.equal((await store.getUserEmails("x")).length, 0);
    const duplicate = makeResponse();
    await route(
        makeRequest("POST", {}, auth),
        duplicate,
        new URL(`${address}/resend`),
    );
    assert.equal(duplicate.status, 409);
    available = false;
    const unavailable = makeResponse();
    await route(
        makeRequest("POST", {}, auth),
        unavailable,
        new URL(`${address}/resend`),
    );
    assert.equal(unavailable.status, 503);
    assert.equal(
        JSON.parse(unavailable.payload).error.code,
        "email_delivery_unavailable",
    );
});
