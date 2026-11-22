import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { createCtx } from "@cognis/core";
import { CoreRegistrationGateway } from "../gateway.js";
import { authorizeAccountCreation } from "../bootstrap/account-creation-gate.js";
import { createAccountStore } from "./reuse/accounts.js";
import { PolicyExecutor } from "./reuse/policy-executor.js";

test("native signup policy persists independently of the adapter and SSO creation flow", async () => {
    const db = new PolicyExecutor();
    const registered: string[] = [];
    const deps = {
        dbExecutor: db,
        accountStore: {
            ...createAccountStore(),
            register: async (username: string) => {
                registered.push(username);
                return { username, role: "user", enabled: true };
            },
        },
    };
    const makeGateway = async () => {
        const gateway = new CoreRegistrationGateway(db);
        await gateway.ensureSchema();
        await gateway.discoverAdapters(
            path.resolve("src/adapters/registration"),
            deps,
        );
        await gateway.loadPersistedConfigs();
        return gateway;
    };
    let gateway = await makeGateway();
    await gateway.enableAdapter("public");
    await gateway.setInvitationPolicy({
        publicRegistrationEnabled: false,
        founderInvitesEnabled: true,
        adminInvitesEnabled: true,
    });
    gateway = await makeGateway();
    assert.equal(gateway.isAdapterEnabled("public"), true);
    assert.equal(gateway.isPublicEnabled(), false);
    const ctx = createCtx();
    ctx.registerFlow({
        id: "gateAccountCreation",
        stages: ["inspectIdentity", "authorizeCreation"],
    });
    ctx.flow.extend(
        "gateAccountCreation",
        "authorizeCreation",
        { id: "registration:test-policy" },
        (stage) => {
            assert.ok(stage.input && typeof stage.input === "object");
            assert.ok(
                "accountId" in stage.input &&
                    typeof stage.input.accountId === "string",
            );
            assert.ok(
                "email" in stage.input && typeof stage.input.email === "string",
            );
            return authorizeAccountCreation(gateway, true, {
                accountId: stage.input.accountId,
                email: stage.input.email,
            });
        },
    );
    const result = await ctx.flow.run("gateAccountCreation", {
        accountId: "x:person",
        email: "person@example.com",
    });
    const authorized = result.stageResults.authorizeCreation[0];
    assert.ok(
        authorized &&
            typeof authorized === "object" &&
            "authorized" in authorized,
    );
    assert.equal(authorized.authorized, true);
    await assert.rejects(
        gateway.registerPublic({ username: "native", password: "password" }),
        /public_disabled/,
    );
    assert.equal(registered.length, 0);
    await gateway.setInvitationPolicy({
        publicRegistrationEnabled: true,
        founderInvitesEnabled: true,
        adminInvitesEnabled: true,
    });
    assert.equal(gateway.isPublicEnabled(), true);
    await gateway.registerPublic({ username: "native", password: "password" });
    assert.deepEqual(registered, ["native"]);
    await gateway.disableAdapter("public");
    assert.equal(gateway.isPublicEnabled(), false);
    const closed = await ctx.flow.run("gateAccountCreation", {
        accountId: "x:other",
        email: "other@example.com",
    });
    const denied = closed.stageResults.authorizeCreation[0];
    assert.ok(denied && typeof denied === "object" && "authorized" in denied);
    assert.equal(denied.authorized, false);
});
