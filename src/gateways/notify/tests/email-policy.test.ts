import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    GatewayRegistry,
    runBootstrapScope,
    type BootstrapDisposer,
} from "@cognis/core";
import { bootstrap } from "../bootstrap/index.js";
import { NotificationTestDatabase } from "./reuse/database.js";
import { createAuthContext } from "./reuse/auth.js";

type Operation = {
    id: string;
    execute(
        context: { accountId: string; assertCurrent(): Promise<void> },
        input: unknown,
    ): Promise<unknown>;
};
async function fixture(context: import("node:test").TestContext) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const operations = new Map<string, Operation>();
    const sent: Array<{
        recipientEmail: string;
        variables: Record<string, string>;
    }> = [];
    let length = 6;
    let available = true;
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", new NotificationTestDatabase());
    capabilities.contribute("auth:routeContext", createAuthContext());
    capabilities.contribute("auth:onboarding", {
        registerOperation: (operation: Operation) =>
            operations.set(operation.id, operation),
    });
    capabilities.contribute(
        "notify:registerEmailPurpose",
        async (id: string) => `gateway:notify:${id}`,
    );
    capabilities.contribute("notify:emailAvailable", () => available);
    capabilities.contribute("notify:emailDeliveryPolicy", () => {
        if (!available) throw new Error("email_delivery_unavailable");
        return { codeLength: length, minimumIntervalMs: 0 };
    });
    capabilities.contribute(
        "notify:sendEmail",
        async (input: (typeof sent)[number]) => {
            sent.push(input);
        },
    );
    const disposers: BootstrapDisposer[] = [];
    context.after(async () => {
        for (const dispose of disposers.reverse()) await dispose();
    });
    await runBootstrapScope(
        root,
        "gateway:notify",
        () =>
            bootstrap({
                capabilities,
                gatewayRegistry: new GatewayRegistry(),
                routeRegistry: { register() {}, registerPrefix() {} } as never,
                flow: root.flow,
                adaptersRoot: "/no-optional-adapters",
            }),
        (dispose) => disposers.push(dispose),
    );
    const call = (id: string, input: unknown) =>
        operations
            .get(`notify:email:${id}`)!
            .execute(
                { accountId: "alice", assertCurrent: async () => {} },
                input,
            );
    return {
        call,
        sent,
        capabilities,
        setLength: (value: number) => {
            length = value;
        },
        disable: () => {
            available = false;
        },
    };
}

test("Notify bootstrap reads current provider policy and retains pending verification code lengths", async (context) => {
    const host = await fixture(context);
    for (const length of [6, 4, 10, 8]) {
        host.setLength(length);
        const email = `verify-${length}@example.test`;
        await host.call("add", { email });
        const code = host.sent.at(-1)!.variables.code;
        assert.match(code, new RegExp(`^\\d{${length}}$`));
        host.setLength(4);
        await host.call("add", { email });
        assert.equal(host.sent.at(-1)!.variables.code, code);
        assert.deepEqual(await host.call("verify", { email, code }), {
            verified: true,
        });
    }
});

test("Notify bootstrap fails explicitly without an available valid owner policy", async (context) => {
    const host = await fixture(context);
    host.capabilities.remove("notify:emailDeliveryPolicy");
    await assert.rejects(host.call("add", { email: "absent@example.test" }), {
        code: "email_delivery_unavailable",
    });
    host.capabilities.contribute("notify:emailDeliveryPolicy", () => ({
        codeLength: 0,
    }));
    await assert.rejects(host.call("add", { email: "invalid@example.test" }), {
        code: "email_delivery_unavailable",
    });
    host.disable();
    await assert.rejects(host.call("add", { email: "disabled@example.test" }), {
        code: "email_delivery_unavailable",
    });
    assert.equal(host.sent.length, 0);
});
