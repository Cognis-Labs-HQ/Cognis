import test from "node:test";
import assert from "node:assert/strict";
import {
    createCtx,
    registerCanonicalFlow,
    getCanonicalFlowContract,
} from "@cognis/core";
import { registerLdapFlowHooks } from "../flow-hooks.js";

test("ldap flow hooks annotate canonical auth flows with availability", async () => {
    const ctx = createCtx();

    for (const flowId of ["construct-login-ui", "login", "ldap-auth"]) {
        const flow = getCanonicalFlowContract(flowId);
        assert.ok(flow, `missing canonical flow contract for ${flowId}`);
        registerCanonicalFlow(ctx, flow);
    }

    registerLdapFlowHooks(ctx.flow, {
        getAvailability: () => ({
            id: "ldap",
            name: "LDAP",
            enabled: false,
        }),
    });

    const loginUiResult = await ctx.runFlow("construct-login-ui");
    const loginResult = await ctx.runFlow("login");
    const ldapResult = await ctx.runFlow("ldap-auth");

    assert.deepEqual(loginUiResult.stageResults["augment-methods"], [
        { id: "ldap", name: "LDAP", enabled: false },
    ]);
    assert.deepEqual(loginResult.stageResults["authenticate"], [
        { id: "ldap", name: "LDAP", enabled: false },
    ]);
    assert.deepEqual(ldapResult.stageResults["resolve-adapter"], [
        { id: "ldap", name: "LDAP", enabled: false },
    ]);
});
