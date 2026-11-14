import assert from "node:assert/strict";
import test from "node:test";
import { createLoginFixture } from "./fixture.js";
import type { PendingTfaLoginAttempt } from "../../bootstrap/index.js";
import {
    revokeAccessTokensForSubject,
    issueAccessToken,
    verifyAccessToken,
} from "../../access-tokens.js";

const methods = [
    {
        id: "synthetic-email",
        name: "Synthetic Email",
        loginUi: { supportsResend: true },
        challenge: {
            sent: true,
            maxLength: 8,
            resendAvailableAt: "2030-01-01T00:00:00.000Z",
            retryAfterSeconds: 60,
        },
    },
];
const path = "/api/v1/auth/login-attempt";

async function fixture(issuedMethods = methods) {
    const host = await createLoginFixture();
    const attempts: PendingTfaLoginAttempt[] = [];
    let deliveries = 0;
    host.requireTfa();
    host.capabilities.contribute(
        "tfa:assessSession",
        async (candidate: Record<string, unknown>) => {
            deliveries++;
            const create = host.capabilities.require<
                (
                    input: Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
                ) => PendingTfaLoginAttempt
            >("tfa:createPendingLoginAttempt");
            const attempt = create(
                candidate as Omit<PendingTfaLoginAttempt, "id" | "expiresAt">,
            );
            attempts.push(attempt);
            return {
                ...candidate,
                outcome: "tfa_required",
                loginAttemptId: attempt.id,
                methods: issuedMethods,
            };
        },
    );
    return { ...host, attempts, deliveries: () => deliveries };
}
function cookie(
    response: Awaited<
        ReturnType<Awaited<ReturnType<typeof fixture>>["request"]>
    >,
): string {
    return String(response.headers["set-cookie"]).split(";")[0];
}

test("registered TFA login retains its issued metadata while no-TFA login commits normally", async () => {
    const host = await fixture();
    const pending = await host.request();
    assert.equal(pending.status, 200);
    const data = JSON.parse(pending.payload).data;
    assert.equal(data.tfaRequired, true);
    assert.equal(data.loginUrl, "/login");
    assert.deepEqual(data.methods, methods);
    assert.equal(data.token, undefined);
    assert.equal(host.state.activations, 0);
    assert.equal(host.state.logins, 0);
    assert.equal(revokeAccessTokensForSubject("assurance-user"), 0);
    const retained = await host.request(
        {},
        { path, method: "GET", headers: { cookie: cookie(pending) } },
    );
    assert.deepEqual(JSON.parse(retained.payload).data, data);
    assert.equal(retained.headers["cache-control"], "no-store");
    assert.equal(retained.headers["set-cookie"], undefined);
    assert.equal(host.deliveries(), 1);
    await host.gatewayRegistry.disable("tfa");
    const success = await host.request(
        {},
        { headers: { cookie: cookie(pending) } },
    );
    const session = JSON.parse(success.payload).data;
    assert.ok(verifyAccessToken(session.token));
    assert.equal(host.state.activations, 1);
    assert.equal(
        host.runtime.getPendingTfaLoginAttempt(data.loginAttemptId),
        null,
    );
    revokeAccessTokensForSubject("assurance-user");
});

test("continuation preserves issued input metadata across provider policy changes without redelivery", async () => {
    const providerMethods = structuredClone(methods);
    const host = await fixture(providerMethods);
    const pending = await host.request();
    const issued = JSON.parse(pending.payload).data;
    const originalExpiry = host.attempts[0].expiresAt;
    const headers = { cookie: cookie(pending) };
    assert.equal(issued.methods[0].challenge.maxLength, 8);
    providerMethods[0].challenge.maxLength = 4;
    for (let i = 0; i < 2; i++) {
        const resumed = await host.request(
            {},
            { path, method: "GET", headers },
        );
        const presentation = JSON.parse(resumed.payload).data;
        assert.deepEqual(presentation.methods, issued.methods);
        assert.equal(presentation.loginAttemptId, issued.loginAttemptId);
        assert.equal(host.deliveries(), 1);
        assert.equal(host.attempts[0].expiresAt, originalExpiry);
        assert.equal(host.state.activations, 0);
        presentation.methods[0].challenge.maxLength = 10;
    }
    const next = await host.request({}, { headers });
    const replacement = JSON.parse(next.payload).data;
    assert.equal(replacement.methods[0].challenge.maxLength, 4);
    assert.notEqual(replacement.loginAttemptId, issued.loginAttemptId);
    assert.equal(host.deliveries(), 2);
});

test("continuation requires the HttpOnly owner cookie and rejects malformed duplicate cookies", async () => {
    const host = await fixture();
    const pending = await host.request();
    const owner = cookie(pending);
    assert.match(
        String(pending.headers["set-cookie"]),
        /Path=\/api\/v1\/auth; HttpOnly; SameSite=Lax; Max-Age=29[0-9]|Max-Age=300/,
    );
    for (const supplied of [
        "",
        "cognis_login_attempt=%FF",
        `${owner}; ${owner}`,
        "cognis_login_attempt=tfa_login_aaaaaaaaaaaaaaaaaaaaaaaa",
    ]) {
        const response = await host.request(
            {},
            { path, method: "GET", headers: { cookie: supplied } },
        );
        assert.equal(JSON.parse(response.payload).data, null);
    }
    assert.equal(
        host.runtime.getPendingTfaLoginAttempt(host.attempts[0].id)?.id,
        host.attempts[0].id,
    );
});

for (const ending of ["expiry", "consume", "cancel", "cleanup"]) {
    test(`continuation cannot recreate or extend an attempt after ${ending}`, async (context) => {
        const host = await fixture();
        const pending = await host.request();
        const attempt = host.attempts[0];
        const originalExpiry = attempt.expiresAt;
        const lifetime = host.runtime.getPendingLoginLifetime(attempt.id)!;
        const headers = { cookie: cookie(pending) };
        await host.request({}, { path, method: "GET", headers });
        assert.equal(attempt.expiresAt, originalExpiry);
        if (ending === "expiry") {
            context.mock.timers.enable({ apis: ["Date"], now: originalExpiry });
        }
        if (ending === "consume") {
            const consume = host.capabilities.require<(id: string) => boolean>(
                "auth:consumePendingLoginAttempt",
            );
            assert.equal(consume(attempt.id), true);
            assert.equal(consume(attempt.id), false);
        }
        if (ending === "cancel") {
            const response = await host.request(
                { loginAttemptId: attempt.id },
                { path, method: "DELETE", headers },
            );
            assert.equal(response.status, 204);
            assert.equal(response.headers["set-cookie"], undefined);
        }
        if (ending === "cleanup")
            for (const dispose of host.disposers) await dispose();
        if (ending !== "cleanup") {
            const response = await host.request(
                {},
                { path, method: "GET", headers },
            );
            assert.equal(JSON.parse(response.payload).data, null);
        }
        assert.equal(
            host.runtime.consumePendingTfaLoginAttempt(attempt.id),
            false,
        );
        assert.equal(host.deliveries(), 1);
        assert.equal(lifetime.signal.aborted, true);
    });
}

test("two tabs share continuation and stale cancellation cannot consume a newer account attempt", async () => {
    const host = await fixture();
    const first = await host.request();
    const headers = { cookie: cookie(first) };
    const tabs = await Promise.all([
        host.request({}, { path, method: "GET", headers }),
        host.request({}, { path, method: "GET", headers }),
    ]);
    assert.equal(tabs[0].payload, tabs[1].payload);
    host.state.accountId = "second-account";
    const second = await host.request({}, { headers });
    const currentHeaders = { cookie: cookie(second) };
    const staleBody = { loginAttemptId: host.attempts[0].id };
    await Promise.all([
        host.request(staleBody, { path, method: "DELETE", headers }),
        host.request(staleBody, {
            path,
            method: "DELETE",
            headers: currentHeaders,
        }),
    ]);
    assert.equal(
        host.runtime.getPendingTfaLoginAttempt(host.attempts[0].id),
        null,
    );
    assert.equal(
        host.runtime.getPendingTfaLoginAttempt(host.attempts[1].id)?.id,
        host.attempts[1].id,
    );
    assert.equal(
        JSON.parse(
            (
                await host.request(
                    {},
                    { path, method: "GET", headers: currentHeaders },
                )
            ).payload,
        ).data.loginAttemptId,
        host.attempts[1].id,
    );
});

for (const mutation of ["account", "provider", "missing", "token"]) {
    test(`a ${mutation} mismatch fails closed before advertising continuation`, async () => {
        const host = await fixture();
        host.root.flow.extend(
            "auth:prepareLogin",
            "authorizeSession",
            { id: `test:${mutation}` },
            ({ data }) => {
                const result = data.sessionResult as Record<string, unknown>;
                if (mutation === "account")
                    result.accountId = "different-account";
                if (mutation === "provider")
                    result.providerId = "different-provider";
                if (mutation === "missing") result.loginAttemptId = "missing";
                if (mutation === "token") result.token = "not-a-session";
            },
        );
        const response = await host.request();
        assert.equal(response.status, 503);
        assert.deepEqual(JSON.parse(response.payload), {
            error: { code: "login_attempt_unavailable" },
        });
        assert.equal(response.headers["set-cookie"], undefined);
        assert.equal(host.state.activations, 0);
        assert.equal(
            JSON.stringify(host.state.logs).includes("not-a-session"),
            false,
        );
    });
}

test("pending deletion validates object shape and preserves live attempts after malformed input", async () => {
    const host = await fixture();
    const pending = await host.request();
    for (const body of [
        {},
        { loginAttemptId: "bad" },
        { loginAttemptId: host.attempts[0].id, extra: true },
    ]) {
        const response = await host.request(body, {
            path,
            method: "DELETE",
            headers: { cookie: cookie(pending) },
        });
        assert.equal(response.status, 400);
        assert.deepEqual(JSON.parse(response.payload), {
            error: { code: "invalid_login_attempt_request" },
        });
    }
    assert.ok(host.runtime.getPendingTfaLoginAttempt(host.attempts[0].id));
});

test("explicit logout abandons the matching factor attempt without erasing a newer cookie", async () => {
    const host = await fixture();
    const pending = await host.request();
    const headers = { cookie: cookie(pending) };
    const logout = await host.request(
        {},
        { path: "/api/v1/auth/logout", headers },
    );
    assert.equal(logout.status, 200);
    assert.equal(
        host.runtime.getPendingLoginLifetime(host.attempts[0].id),
        null,
    );
    assert.match(String(logout.headers["set-cookie"]), /^cognis_access_token=/);
    const response = await host.request({}, { path, method: "GET", headers });
    assert.equal(JSON.parse(response.payload).data, null);
    assert.equal(
        host.runtime.consumePendingTfaLoginAttempt(host.attempts[0].id),
        false,
    );
});

test("an existing account session grants no assurance to a different pending account", async () => {
    const host = await fixture();
    const oldToken = issueAccessToken("signed-in-account", "user", 300);
    const pending = await host.request(
        {},
        { headers: { cookie: `cognis_access_token=${oldToken}` } },
    );
    const data = JSON.parse(pending.payload).data;
    assert.equal(data.accountId, "assurance-user");
    assert.equal(data.token, undefined);
    assert.equal(host.state.activations, 0);
    assert.equal(verifyAccessToken(oldToken)?.sub, "signed-in-account");
    const resumed = await host.request(
        {},
        {
            path,
            method: "GET",
            headers: {
                cookie: `${cookie(pending)}; cognis_access_token=${oldToken}`,
            },
        },
    );
    assert.equal(JSON.parse(resumed.payload).data.accountId, "assurance-user");
    revokeAccessTokensForSubject("signed-in-account");
});

test("independent first-time tabs keep distinct account attempts bound to their own response cookie", async () => {
    const host = await fixture();
    const first = await host.request();
    host.state.accountId = "other-account";
    const second = await host.request();
    const views = await Promise.all(
        [first, second].map((response) =>
            host.request(
                {},
                { path, method: "GET", headers: { cookie: cookie(response) } },
            ),
        ),
    );
    assert.equal(JSON.parse(views[0].payload).data.accountId, "assurance-user");
    assert.equal(JSON.parse(views[1].payload).data.accountId, "other-account");
    await host.request(
        { loginAttemptId: host.attempts[0].id },
        { path, method: "DELETE", headers: { cookie: cookie(second) } },
    );
    assert.ok(host.runtime.getPendingTfaLoginAttempt(host.attempts[1].id));
    assert.equal(host.state.activations, 0);
});
