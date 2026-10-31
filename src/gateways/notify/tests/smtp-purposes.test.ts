import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore, createCtx, runBootstrapScope } from "@cognis/core";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../gateway.js";
import { registerSmtpPurposeCapability } from "../bootstrap/smtp-purposes.js";

function fixture() {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const gateway = new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
    );
    const active = new Set<string>();
    gateway.registerSender({
        senderId: "smtp",
        send: async () => {},
        registerPurpose(purpose) {
            if (active.has(purpose)) throw new Error("smtp_purpose_conflict");
            active.add(purpose);
            return () => {
                active.delete(purpose);
            };
        },
    });
    const register = registerSmtpPurposeCapability(
        { capabilities } as never,
        gateway,
    )!;
    return { root, register, active, capabilities };
}

test("ctx registration creates owner-namespaced purposes through the real staged flow only during bootstrap", async () => {
    const host = fixture();
    const stages: string[] = [];
    for (const stage of ["validate", "create"])
        host.root.flow.extend(
            "notify:registerSmtpPurpose",
            stage,
            { id: `test:${stage}`, order: 100 },
            () => {
                stages.push(stage);
            },
        );
    await assert.rejects(
        host.register("digest"),
        /bootstrap_registration_closed/,
    );
    const cleanup: Array<() => void | Promise<void>> = [];
    const purpose = await runBootstrapScope(
        host.root,
        "module:example",
        () => host.register("digest"),
        (dispose) => cleanup.push(dispose),
    );
    assert.equal(purpose, "module:example:digest");
    assert.deepEqual(stages, ["validate", "create"]);
    assert.equal(
        host.root.getCapability("notify:registerSmtpPurpose"),
        host.capabilities.get("notify:registerSmtpPurpose"),
    );
    assert.equal(
        host.root.isPublicCapability("notify:registerSmtpPurpose"),
        true,
    );
    assert.deepEqual([...host.active], [purpose]);
    await assert.rejects(
        host.register("another"),
        /bootstrap_registration_closed/,
    );
    await assert.rejects(
        runBootstrapScope({}, "module:other", () =>
            host.register("crossInstance"),
        ),
        /bootstrap_registration_closed/,
    );
    await cleanup[0]();
    assert.equal(host.active.size, 0);
});

test("duplicate or invalid registration cannot replace a queue and a failed bootstrap removes only its own registrations", async () => {
    const host = fixture();
    await runBootstrapScope(host.root, "module:stable", () =>
        host.register("digest"),
    );
    await assert.rejects(
        runBootstrapScope(host.root, "module:failed", async () => {
            await host.register("digest");
            await host.register("digest");
        }),
        /smtp_purpose_conflict/,
    );
    await assert.rejects(
        runBootstrapScope(host.root, "module:invalid", () =>
            host.register("bad\nname"),
        ),
        /smtp_purpose_invalid/,
    );
    assert.deepEqual([...host.active], ["module:stable:digest"]);
});
