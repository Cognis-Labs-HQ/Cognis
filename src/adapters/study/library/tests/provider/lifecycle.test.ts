import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore, createCtx } from "@cognis/core";
import { registerLibraryCapabilities } from "../../provider.js";
import type {
    LibraryService,
    LibraryProviderCapability,
} from "../../service/index.js";
import type { StudyAdapterBootstrapCtx } from "../../../../../gateways/study/gateway.js";

test("Library contracts withdraw on disable, reject retained handles and return on enable", async () => {
    const system = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", system);
    let enabled = true;
    let transition: (enabled: boolean) => void = () =>
        assert.fail("Listener missing");
    let calls = 0;
    const operation = () => {
        calls++;
        return Promise.resolve({});
    };
    const service = {
        registerFormContribution: operation,
        inspectContentPack: operation,
        ingestContentPack: operation,
        deleteContentPack: operation,
        registerLookupProvider: operation,
    } as unknown as LibraryService;
    registerLibraryCapabilities(
        {
            capabilities,
            isAdapterEnabled: () => enabled,
            onAvailabilityChange: (listener) => {
                transition = listener;
                listener(enabled);
                return () => {};
            },
        } as StudyAdapterBootstrapCtx,
        service,
    );
    const provider = system.getCapability<LibraryProviderCapability>(
        "study:library:provider",
    )!;
    await provider.deleteContentPack("/pack-root");
    assert.equal(calls, 1);
    enabled = false;
    transition(false);
    assert.equal(system.getCapability("study:library:provider"), undefined);
    assert.equal(system.isPublicCapability("study:library:provider"), false);
    assert.equal(
        system.getCapability("study:library:registerConstructor"),
        undefined,
    );
    assert.equal(capabilities.get("study:library"), undefined);
    for (const operation of [
        provider.deleteContentPack,
        provider.ingestContentPack,
        provider.inspectContentPack,
        provider.registerConstructor,
        provider.registerLookupProvider,
    ])
        assert.throws(
            () => (operation as (...args: unknown[]) => unknown)(),
            /study_library_unavailable/,
        );
    assert.equal(calls, 1);
    enabled = true;
    transition(true);
    assert.equal(system.getCapability("study:library:provider"), provider);
    assert.equal(capabilities.get("study:library"), service);
    await provider.deleteContentPack("/pack-root");
    assert.equal(calls, 2);
});
