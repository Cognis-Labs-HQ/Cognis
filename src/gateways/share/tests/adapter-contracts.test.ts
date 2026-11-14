import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { CapabilityContracts } from "@cognis/core";
import { createShareAdapterHost } from "./adapter-host.js";
import { CoreShareGateway } from "../gateway/index.js";

test("Share defines adapter contracts before initialization and rolls back invalid adapters", async (t) => {
    const logs: Array<Record<string, unknown> | undefined> = [];
    const host = createShareAdapterHost(t, (_level, _message, metadata) => {
        logs.push(metadata);
    });
    const { root, cleanup } = host;
    const gateway = new CoreShareGateway({} as never, {} as never, {} as never);
    await host.discover(
        gateway,
        fileURLToPath(new URL("./fixtures/contract-adapters", import.meta.url)),
    );
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    assert.equal(gateway.getAdapter("ready")?.id, "ready");
    const read = contracts.resolve<() => string>("share-fixture:ready", 1);
    assert.equal(read(), "ready");
    assert.equal(
        contracts.describe("share-fixture:ready")?.owner,
        "adapter:share:ready",
    );
    assert.equal(contracts.describe("share-fixture:broken"), undefined);
    assert.equal(logs[0]?.adapterId, "broken");
    assert.throws(
        () =>
            contracts.define("share-fixture:late", {
                version: 1,
                kind: "function",
                description: "Late fixture contract.",
            }),
        /bootstrap_registration_closed/,
    );
    for (const dispose of cleanup) await dispose();
    assert.equal(contracts.describe("share-fixture:ready"), undefined);
    assert.throws(read, /capability_contract_unavailable/);
    for (const dispose of cleanup) await dispose.reactivate?.();
    assert.equal(
        contracts.describe("share-fixture:ready")?.owner,
        "adapter:share:ready",
    );
});
