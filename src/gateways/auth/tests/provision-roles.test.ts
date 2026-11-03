import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore, CTX_CAPABILITY, createCtx } from "@cognis/core";
import { registerAuthBootstrapHook } from "../bootstrap/flow-registrations.js";
import type { AuthBootstrapHookContext } from "../bootstrap/index.js";
import { VolatileLocalAccountStore } from "../reuse/account-store.js";

for (const role of ["user", "teacher", "moderator", "admin"] as const) {
    test(`administrator provisioning persists the declared ${role} role and authenticates with it`, async () => {
        const system = createCtx();
        const capabilities = new CapabilityStore();
        capabilities.contribute(CTX_CAPABILITY, system);
        const accountStore = new VolatileLocalAccountStore();
        const context = {
            accountStore,
            authGateway: {
                getEnabledAdapter: () => null,
                getAdapter: () => null,
            },
            ctx: { capabilities, flow: system.flow },
        } as unknown as AuthBootstrapHookContext;
        await registerAuthBootstrapHook(context);
        const created = await system.flow.run("provision-user", {
            username: "person",
            password: "disposable-provision-password",
            role,
        });
        assert.equal(
            (created.stageResults["persist-account"][0] as { role: string })
                .role,
            role,
        );
        assert.equal((await accountStore.getInfo("person"))?.role, role);
        assert.equal(
            (
                await accountStore.verify(
                    "person",
                    "disposable-provision-password",
                )
            )?.role,
            role,
        );
    });
}
