import assert from "node:assert/strict";
import test from "node:test";
import { createRegistrationRoutes } from "../bootstrap.js";
import { createAccountStore } from "./reuse/accounts.js";
import {
    createRequest,
    createResponse,
    createRouteContext,
} from "./reuse/http.js";
import {
    executeRegisteredCommand,
    formatCommandOutput,
} from "../../../tooling/cli/index.ts";

test("CLI invitation commands honor the current route contract without leaking returned links to logs", async () => {
    const issued: unknown[] = [];
    const logs: unknown[] = [];
    let trustedDomains: string[] = [];
    const inviteUrl = "https://example.invalid/register/fixture-secret-link";
    const gateway = {
        isInviteEnabled: () => true,
        getInvitationPolicy: async () => ({ adminInvitesEnabled: true }),
        issueInvite: async (input: unknown) => {
            issued.push(input);
            return {
                tokenId: "fixture-only",
                inviteUrl,
                expiresAt: "2099-01-01",
            };
        },
    };
    const route = createRegistrationRoutes(
        gateway as Parameters<typeof createRegistrationRoutes>[0],
        createAccountStore(),
        async () => trustedDomains,
        () => true,
        (...entry) => {
            logs.push(entry);
        },
        createRouteContext(),
    );
    const originalFetch = globalThis.fetch;
    const requests: Array<{ path: string; body: unknown }> = [];
    globalThis.fetch = async (url, options) => {
        const target = new URL(String(url));
        assert.equal(target.origin, "https://cli-audit.invalid");
        const body = String(options?.body ?? "");
        requests.push({
            path: target.pathname,
            body: body ? JSON.parse(body) : null,
        });
        const response = createResponse();
        const headers = new Headers(options?.headers);
        const handled = await route(
            createRequest({
                method: options?.method ?? "GET",
                bearerToken: headers
                    .get("authorization")
                    ?.replace(/^Bearer /, ""),
                body,
            }),
            response.response,
            target,
        );
        assert.equal(handled, true);
        return new Response(response.payload, {
            status: response.statusCode,
            headers: response.payload
                ? { "content-type": "application/json" }
                : undefined,
        });
    };
    const context = {
        apiBaseUrl: "https://cli-audit.invalid",
        getApiToken: async () => "admin-test-token",
    };
    try {
        const generated = await executeRegisteredCommand(
            "invite:token:generate",
            [],
            context,
        );
        assert.deepEqual(requests, [
            {
                path: "/api/v1/registration/tokens",
                body: { delivery: "manual" },
            },
        ]);
        assert.equal(issued.length, 1);
        assert.equal(
            (issued[0] as { deliverEmail: boolean }).deliverEmail,
            false,
        );
        assert.equal((issued[0] as { inviteeEmail: string }).inviteeEmail, "");
        assert.match(
            formatCommandOutput("invite:token:generate", generated),
            /fixture-secret-link/,
        );
        assert.equal(
            JSON.parse(
                formatCommandOutput("invite:token:generate", generated, {
                    verbose: true,
                }),
            ).data.inviteUrl,
            inviteUrl,
        );
        assert.doesNotMatch(JSON.stringify(logs), /fixture-secret-link/);
        await assert.rejects(
            executeRegisteredCommand(
                "invite:token:generate",
                ["fixture@example.invalid"],
                context,
            ),
            /Usage: cognisctl invite:token:generate/,
        );
        assert.equal(requests.length, 1);
        await executeRegisteredCommand(
            "invite:email:send",
            ["fixture@example.invalid"],
            context,
        );
        assert.equal(issued.length, 2);
        assert.equal(
            (issued[1] as { deliverEmail: boolean }).deliverEmail,
            true,
        );
        assert.equal(
            (issued[1] as { inviteeEmail: string }).inviteeEmail,
            "fixture@example.invalid",
        );
        assert.deepEqual(requests[1].body, {
            email: "fixture@example.invalid",
            delivery: "email",
        });
        await assert.rejects(
            executeRegisteredCommand("invite:email:send", [" "], context),
            /Email is required/,
        );
        assert.equal(requests.length, 2);
        await assert.rejects(
            executeRegisteredCommand("invite:token:generate", [], {
                ...context,
                getApiToken: async () => "denied-fixture",
            }),
            (error: { status?: number }) => error.status === 403,
        );
        assert.equal(issued.length, 2);
        trustedDomains = ["allowed.invalid"];
        await assert.rejects(
            executeRegisteredCommand(
                "invite:email:send",
                ["fixture@blocked.invalid"],
                context,
            ),
            (error: { status?: number }) => error.status === 422,
        );
        assert.equal(issued.length, 2);
        assert.equal(requests.length, 4);
        assert.doesNotMatch(JSON.stringify(logs), /fixture-secret-link/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
