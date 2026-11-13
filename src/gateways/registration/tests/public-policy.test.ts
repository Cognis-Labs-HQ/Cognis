import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { createCtx } from "@cognis/core";
import { CoreRegistrationGateway } from "../gateway.js";
import { authorizeAccountCreation } from "../bootstrap/account-creation-gate.js";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";

test("native signup policy persists independently of the adapter and SSO creation flow", async () => {
    const db = new InMemoryTestExecutor();
    const registered: string[] = [];
    const deps = {
        dbExecutor: db,
        accountStore: {
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
        (stage) => authorizeAccountCreation(gateway, true, stage.input),
    );
    const result = await ctx.flow.run("gateAccountCreation", {
        accountId: "x:person",
        email: "person@example.com",
    });
    assert.equal(result.stageResults.authorizeCreation[0].authorized, true);
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
    assert.equal(closed.stageResults.authorizeCreation[0].authorized, false);
});
