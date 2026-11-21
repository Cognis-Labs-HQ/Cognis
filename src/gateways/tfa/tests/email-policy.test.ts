import { createLoginLifetime } from "./reuse/gateway-fixture.js";
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type BootstrapDisposer,
    type CapabilityContracts,
} from "@cognis/core";
import { CoreTfaGateway } from "../gateway.js";
import { createStoreMock } from "./reuse/gateway-fixture.js";

async function fixture(
    context: import("node:test").TestContext,
    boundedDelivery = true,
) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const store = createStoreMock();
    await store.saveAdapterConfig("smtp", true, { codeLength: 9 });
    const delivered: string[] = [];
    let length = 6;
    let available = true;
    const activation: boolean[] = [];
    capabilities.contribute("system:ctx", root);
    capabilities.contribute(
        "notify:registerEmailPurpose",
        async (id: string) => `adapter:tfa:smtp:${id}`,
    );
    capabilities.contribute("notify:emailAvailable", () => available);
    capabilities.contribute("notify:emailDeliveryPolicy", () => ({
        codeLength: length,
        minimumIntervalMs: 0,
    }));
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    capabilities.contribute("system:contracts", contracts);
    let legacyCalls = 0;
    capabilities.contribute("notify:sendEmail", async () => {
        legacyCalls++;
    });
    if (boundedDelivery)
        await runBootstrapScope(root, "adapter:notify:synthetic", async () => {
            contracts.define("notify:deliverEmail", {
                version: 1,
                kind: "function",
                description:
                    "Synthetic public owner contract for isolated lifetime testing.",
            });
            root.contributePublicCapability(
                "notify:deliverEmail",
                async (input: { variables: { code: string } }) => {
                    delivered.push(input.variables.code);
                    const receipt = {
                        notificationId: String(delivered.length),
                        status: "sent",
                        createdAt: "",
                        updatedAt: "",
                    };
                    return { receipt, completion: Promise.resolve(receipt) };
                },
            );
        });
    capabilities.contribute(
        "notify:getPrimaryEmail",
        async () => "alice@example.test",
    );
    capabilities.contribute(
        "notify:setSenderEnabled",
        async (_id: string, enabled: boolean) => {
            activation.push(enabled);
        },
    );
    const disposers: BootstrapDisposer[] = [];
    const dispose = async () => {
        for (const cleanup of disposers.splice(0).reverse()) await cleanup();
    };
    context.after(dispose);
    const start = async () => {
        const gateway = new CoreTfaGateway(store);
        await gateway.discoverAdapters(path.resolve("src/adapters/tfa"));
        await gateway.loadPersistedConfigs();
        await runBootstrapScope(
            root,
            "gateway:tfa",
            () => gateway.bootstrapAdapters(capabilities),
            (cleanup) => disposers.push(cleanup),
        );
        return gateway;
    };
    return {
        start,
        dispose,
        delivered,
        activation,
        capabilities,
        legacyCalls: () => legacyCalls,
        setLength: (value: number) => {
            length = value;
        },
        disableOwner: () => {
            available = false;
        },
    };
}

test("TFA registered adapters consume owner policy across changes and conflicting persisted restarts", async (context) => {
    const host = await fixture(context);
    let gateway = await host.start();
    for (const length of [6, 4, 10, 8]) {
        host.setLength(length);
        const setup = await gateway.beginMethodSetup({
            accountId: "alice",
            displayName: "Alice",
            methodId: "smtp",
        });
        const code = host.delivered.at(-1)!;
        assert.equal(code.length, length);
        assert.equal(setup.view.fields?.[0].maxLength, length);
        host.setLength(4);
        assert.equal(
            (
                await gateway.verifyMethodSetup({
                    accountId: "alice",
                    setupId: setup.setupId,
                    verification: { code },
                })
            ).verified,
            true,
        );
    }
    await host.dispose();
    host.setLength(8);
    gateway = await host.start();
    const methods = await gateway.getLoginMethods(
        "alice",
        createLoginLifetime(),
    );
    assert.equal(methods[0].challenge?.maxLength, 8);
    assert.equal(host.delivered.at(-1)!.length, 8);
    assert.deepEqual(host.activation, [true, true]);
});

test("TFA disable and scope cleanup discard pending codes while policy changes preserve them", async (context) => {
    const host = await fixture(context);
    const gateway = await host.start();
    const begin = () =>
        gateway.beginMethodSetup({
            accountId: "alice",
            displayName: "Alice",
            methodId: "smtp",
        });
    const setup = await begin();
    const code = host.delivered.at(-1)!;
    await gateway.disableAdapter("smtp");
    await gateway.enableAdapter("smtp");
    assert.equal(
        (
            await gateway.verifyMethodSetup({
                accountId: "alice",
                setupId: setup.setupId,
                verification: { code },
            })
        ).verified,
        false,
    );
    host.capabilities.remove("notify:emailDeliveryPolicy");
    await assert.rejects(begin(), /not available/);
    host.disableOwner();
    await assert.rejects(begin(), /email_delivery_unavailable/);
    await host.dispose();
    await assert.rejects(begin(), /email_delivery_unavailable/);
});

test("an alternative provider with only sendEmail cannot silently bypass bounded delivery", async (context) => {
    const host = await fixture(context, false);
    const gateway = await host.start();
    await assert.rejects(
        gateway.beginMethodSetup({
            accountId: "alice",
            displayName: "Alice",
            methodId: "smtp",
        }),
    );
    assert.equal(host.legacyCalls(), 0);
    assert.equal(host.delivered.length, 0);
});
