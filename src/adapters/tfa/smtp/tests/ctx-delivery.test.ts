import test from "node:test";
import assert from "node:assert/strict";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type NotificationAction,
} from "@cognis/core";
import { createAdapter } from "../index.js";

for (const enabled of [false, true])
    test(`SMTP TFA owns action registration and reconciles enabled state (enabled=${enabled})`, async () => {
        const root = createCtx();
        const capabilities = new CapabilityStore();
        const registered: Array<{ id: string; action: NotificationAction }> =
            [];
        const updates: Array<{ id: string; enabled: boolean }> = [];
        capabilities.contribute(
            "notify:registerSmtpPurpose",
            async (id: string, action: NotificationAction) => {
                registered.push({ id, action });
                return `adapter:tfa:smtp:${id}`;
            },
        );
        capabilities.contribute(
            "notify:setSenderEnabled",
            async (id: string, enabled: boolean) => {
                updates.push({ id, enabled });
            },
        );
        let changed!: (enabled: boolean) => Promise<void>;
        const adapter = createAdapter();
        await runBootstrapScope(root, "adapter:tfa:smtp", () =>
            adapter.bootstrap!({
                capabilities,
                isEnabled: () => enabled,
                registerSyncTarget: (target) => {
                    assert.deepEqual(target, {
                        gatewayId: "notify",
                        adapterId: "smtp",
                    });
                },
                onEnabledChange: (_id, listener) => {
                    changed = listener;
                },
            }),
        );
        assert.equal(registered[0].id, "loginCode");
        assert.deepEqual(await registered[0].action({ code: "123456" }), {
            subject: "Your Cognis verification code",
            body: "Your verification code is 123456.",
        });
        assert.equal(updates.length, enabled ? 1 : 0);
        await changed(false);
        assert.equal(updates.length, enabled ? 1 : 0);
        await changed(true);
        assert.deepEqual(updates.at(-1), { id: "smtp", enabled: true });
        assert.equal(typeof capabilities.get("tfa:smtpCodeLength"), "function");
    });
