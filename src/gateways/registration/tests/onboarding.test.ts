import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore } from "@cognis/core";
import { CoreRegistrationGateway } from "../gateway.js";
import { createRegistrationRoutes } from "../bootstrap/registration-routes.js";
import { createAccountStore } from "./reuse/accounts.js";
import { createEmptyExecutor } from "./reuse/bootstrap.js";
import {
    createRequest,
    createResponse,
    createRouteContext,
} from "./reuse/http.js";

function fixture(issue?: (accountId: string) => Promise<string>) {
    const capabilities = new CapabilityStore();
    if (issue)
        capabilities.contribute("auth:onboarding", {
            issue,
            listOperations: () => ["notify:email:add", "notify:email:verify"],
        });
    const gateway = new CoreRegistrationGateway(createEmptyExecutor());
    gateway.isInviteEnabled = () => true;
    const redeemed: unknown[] = [];
    gateway.redeemInvite = async (input) => {
        redeemed.push(input);
        return { createdAccountId: "u_created", inviterAccountId: "u_inviter" };
    };
    const context = createRouteContext();
    context.getCapability = capabilities.get.bind(capabilities);
    const route = createRegistrationRoutes(
        gateway,
        createAccountStore(),
        undefined,
        undefined,
        undefined,
        context,
    );
    return {
        redeemed,
        async redeem() {
            const result = createResponse();
            await route(
                createRequest({
                    method: "POST",
                    body: JSON.stringify({
                        token: "synthetic-invite",
                        username: "submitted-handle",
                        password: "synthetic-password",
                        accountId: "u_attacker",
                    }),
                }),
                result.response,
                new URL("http://localhost/api/v1/registration/redeem"),
            );
            return {
                status: result.statusCode,
                body: JSON.parse(result.payload),
            };
        },
    };
}

test("invite redemption issues only the Auth-owned onboarding credential for the created account", async () => {
    const issued: string[] = [];
    const host = fixture(async (accountId) => {
        issued.push(accountId);
        return "synthetic-onboarding";
    });
    const result = await host.redeem();
    assert.equal(result.status, 201);
    assert.deepEqual(issued, ["u_created"]);
    assert.equal(result.body.data.verifyToken, "synthetic-onboarding");
    assert.deepEqual(result.body.data.onboardingOperations, [
        "notify:email:add",
        "notify:email:verify",
    ]);
    assert.equal(host.redeemed.length, 1);
});

test("invite redemption fails before consuming the invitation when onboarding is unavailable", async () => {
    const host = fixture();
    const result = await host.redeem();
    assert.equal(result.status, 503);
    assert.equal(result.body.error.code, "onboarding_unavailable");
    assert.equal(host.redeemed.length, 0);
});

test("onboarding persistence failure truthfully reports the already-created invite account", async () => {
    const host = fixture(async () => {
        throw new Error("private_persistence_detail");
    });
    const result = await host.redeem();
    assert.equal(result.status, 503);
    assert.equal(result.body.error.code, "onboarding_unavailable");
    assert.deepEqual(result.body.data, { accountCreated: true });
    assert.equal(host.redeemed.length, 1);
});
