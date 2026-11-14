import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { CoreNotificationGateway } from "../gateway.js";

function fixture() {
    let persisted: Record<string, unknown> = {
        codeLength: 8,
        enabled: true,
        password: "synthetic-secret",
        host: "synthetic.invalid",
    };
    let runtime = { ...persisted };
    let normalizeFailure = false;
    let saveFailure = false;
    let applyFailure = false;
    let writes = 0;
    const lifecycle: boolean[] = [];
    const events: unknown[] = [];
    const logs: unknown[] = [];
    const gateway = new CoreNotificationGateway(
        { getSenderIds: async () => [] },
        {
            getConfig: async () => ({ ...persisted }),
            saveConfig: async (_senderId, config) => {
                if (saveFailure) throw new Error("synthetic_store_failure");
                writes++;
                persisted = { ...config };
            },
        },
        undefined,
        (...args) => {
            logs.push(args);
        },
    );
    gateway.registerSender({
        senderId: "example",
        send: async () => {},
        getConfig: () => ({ ...runtime, password: "" }),
        getConfigSchema: () => [
            { key: "password", type: "password", label: "synthetic.password" },
            {
                key: "transportCredential",
                type: "password",
                label: "synthetic.credential",
            },
        ],
        getConfiguredSecretFields: () => ["signatureMaterial"],
        normalizeConfig: (config) => {
            if (normalizeFailure)
                throw new Error("synthetic_normalization_failure");
            return {
                ...config,
                codeLength:
                    typeof config.codeLength === "number"
                        ? Math.max(4, Math.min(10, config.codeLength))
                        : runtime.codeLength,
            };
        },
        setConfig: (config) => {
            if (applyFailure) throw new Error("synthetic_apply_failure");
            runtime = { ...runtime, ...config };
        },
        setDeliveryEnabled: (enabled) => {
            lifecycle.push(enabled);
        },
    });
    gateway.onSenderConfigChange("test", (_senderId, config) => {
        events.push(config);
    });
    return {
        gateway,
        lifecycle,
        events,
        logs,
        persisted: () => persisted,
        runtime: () => runtime,
        writes: () => writes,
        failNormalize: () => {
            normalizeFailure = true;
        },
        failSave: () => {
            saveFailure = true;
        },
        failApply: () => {
            applyFailure = true;
        },
    };
}

test("normalized provider saves preserve omitted fields, hidden secrets and activation", async () => {
    const host = fixture();
    await host.gateway.saveProviderConfig("example", {
        codeLength: 12,
        password: "",
    });
    assert.deepEqual(host.persisted(), {
        codeLength: 10,
        enabled: true,
        password: "synthetic-secret",
        host: "synthetic.invalid",
    });
    assert.equal(host.runtime().codeLength, 10);
    await host.gateway.saveProviderConfig("example", {});
    assert.equal(host.persisted().codeLength, 10);
    assert.equal(host.gateway.isSenderEnabled("example"), true);
    assert.equal(host.events.length, 2);
    assert.equal(
        JSON.stringify(host.events).includes("synthetic-secret"),
        false,
    );
});

for (const failure of ["normalization", "persistence"] as const) {
    test(`${failure} failure leaves provider state and activation unchanged`, async () => {
        const host = fixture();
        if (failure === "normalization") host.failNormalize();
        else host.failSave();
        await assert.rejects(
            host.gateway.saveProviderConfig("example", {
                codeLength: 4,
                enabled: false,
            }),
        );
        assert.equal(host.runtime().codeLength, 8);
        assert.equal(host.persisted().codeLength, 8);
        assert.equal(host.gateway.isSenderEnabled("example"), true);
        assert.deepEqual(host.lifecycle, []);
        assert.equal(host.writes(), 0);
        assert.equal(host.events.length, 0);
    });
}

test("provider apply failure reports failure, disables delivery and restores persisted settings", async () => {
    const host = fixture();
    host.failApply();
    await assert.rejects(
        host.gateway.saveProviderConfig("example", { codeLength: 4 }),
        /notification_configuration_failed/,
    );
    assert.equal(host.persisted().codeLength, 8);
    assert.equal(host.runtime().codeLength, 8);
    assert.equal(host.persisted().enabled, false);
    assert.equal(host.gateway.isSenderEnabled("example"), false);
    assert.deepEqual(host.lifecycle, [false]);
    assert.equal(host.events.length, 0);
    await assert.rejects(
        host.gateway.enableSender("example"),
        /notification_configuration_failed/,
    );
});

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

function concurrentFixture() {
    let persisted: Record<string, unknown> = {
        codeLength: 8,
        enabled: true,
        host: "old.synthetic.invalid",
    };
    let runtime = { ...persisted };
    let deliveryEnabled = true;
    let beforeSave: (
        config: Record<string, unknown>,
    ) => Promise<void> = async () => {};
    const gateway = new CoreNotificationGateway(
        { getSenderIds: async () => [] },
        {
            getConfig: async () => ({ ...persisted }),
            saveConfig: async (_senderId, config) => {
                await beforeSave(config);
                persisted = { ...config };
            },
        },
    );
    const sender = {
        senderId: "synthetic",
        send: async () => {},
        getConfig: () => ({ ...runtime }),
        normalizeConfig: (config: Record<string, unknown>) => ({
            ...config,
            codeLength: config.codeLength ?? runtime.codeLength,
        }),
        setConfig: (config: Record<string, unknown>) => {
            if (config.codeLength === 4)
                throw new Error("synthetic_apply_failure");
            runtime = { ...runtime, ...config };
        },
        setDeliveryEnabled: (enabled: boolean) => {
            deliveryEnabled = enabled;
        },
    };
    gateway.registerSender(sender);
    return {
        gateway,
        sender,
        persisted: () => persisted,
        runtime: () => runtime,
        deliveryEnabled: () => deliveryEnabled,
        pauseNextSave(predicate: (config: Record<string, unknown>) => boolean) {
            const started = deferred();
            const release = deferred();
            beforeSave = async (config) => {
                if (!predicate(config)) return;
                beforeSave = async () => {};
                started.resolve();
                await release.promise;
            };
            return { started: started.promise, release: release.resolve };
        },
    };
}

test("failed configuration rollback completes before a queued successful save", async () => {
    const host = concurrentFixture();
    const pause = host.pauseNextSave((config) => config.enabled === false);
    const first = host.gateway
        .saveProviderConfig("synthetic", { codeLength: 4 })
        .catch((error: Error) => error.message);
    await pause.started;
    let secondCompleted = false;
    const second = host.gateway
        .saveProviderConfig("synthetic", {
            codeLength: 10,
            enabled: true,
        })
        .then(() => {
            secondCompleted = true;
        });
    try {
        await setImmediate();
        assert.equal(secondCompleted, false);
    } finally {
        pause.release();
        await first;
        await second;
    }
    assert.equal(await first, "notification_configuration_failed");
    await second;
    assert.equal(host.persisted().codeLength, 10);
    assert.equal(host.runtime().codeLength, 10);
    assert.equal(host.persisted().enabled, true);
    assert.equal(host.deliveryEnabled(), true);
    assert.equal(host.gateway.isSenderEnabled("synthetic"), true);
});

for (const operation of ["save", "update"] as const) {
    test(`concurrent disjoint ${operation} patches preserve the complete committed state`, async () => {
        const host = concurrentFixture();
        const pause = host.pauseNextSave((config) => config.codeLength === 10);
        const first = host.gateway.saveProviderConfig("synthetic", {
            codeLength: 10,
        });
        await pause.started;
        const second =
            operation === "save"
                ? host.gateway.saveProviderConfig("synthetic", {
                      host: "new.synthetic.invalid",
                  })
                : host.gateway.updateProviderConfig("synthetic", {
                      host: "new.synthetic.invalid",
                  });
        pause.release();
        await Promise.all([first, second]);
        assert.equal(host.persisted().host, "new.synthetic.invalid");
        assert.equal(host.runtime().host, "new.synthetic.invalid");
        assert.equal(host.persisted().codeLength, 10);
        assert.equal(host.runtime().codeLength, 10);
    });
}

for (const enabled of [false, true]) {
    test(`queued activation ${enabled} preserves a concurrent code-length save`, async () => {
        const host = concurrentFixture();
        if (enabled) await host.gateway.disableSender("synthetic");
        const pause = host.pauseNextSave((config) => config.codeLength === 10);
        const save = host.gateway.saveProviderConfig("synthetic", {
            codeLength: 10,
        });
        await pause.started;
        const toggle = enabled
            ? host.gateway.enableSender("synthetic")
            : host.gateway.disableSender("synthetic");
        pause.release();
        await Promise.all([save, toggle]);
        assert.equal(host.persisted().codeLength, 10);
        assert.equal(host.runtime().codeLength, 10);
        assert.equal(host.persisted().enabled, enabled);
        assert.equal(host.deliveryEnabled(), enabled);
        assert.equal(host.gateway.isSenderEnabled("synthetic"), enabled);
    });
}

test(
    "configuration listeners can await a subsequent patch without deadlock",
    { timeout: 2000 },
    async () => {
        const host = concurrentFixture();
        let notified = false;
        host.gateway.onSenderConfigChange("nested", async () => {
            if (notified) return;
            notified = true;
            await host.gateway.updateProviderConfig("synthetic", {
                host: "listener.synthetic.invalid",
            });
        });
        await host.gateway.saveProviderConfig("synthetic", { codeLength: 10 });
        assert.equal(host.persisted().codeLength, 10);
        assert.equal(host.persisted().host, "listener.synthetic.invalid");
    },
);

test("busy sender replacement is rejected and its transaction ownership is released", async () => {
    const host = concurrentFixture();
    const pause = host.pauseNextSave((config) => config.codeLength === 10);
    const save = host.gateway.saveProviderConfig("synthetic", {
        codeLength: 10,
    });
    await pause.started;
    const replacement = { ...host.sender };
    try {
        assert.throws(
            () => host.gateway.registerSender(replacement),
            /notification_configuration_in_progress/,
        );
    } finally {
        pause.release();
        await save;
    }
    host.gateway.registerSender(replacement);
    await host.gateway.saveProviderConfig("synthetic", { codeLength: 6 });
    assert.equal(host.persisted().codeLength, 6);
    assert.equal(host.runtime().codeLength, 6);
});

test("disabling after an application failure cannot bypass corrective configuration", async () => {
    const host = concurrentFixture();
    await assert.rejects(
        host.gateway.saveProviderConfig("synthetic", { codeLength: 4 }),
        /notification_configuration_failed/,
    );
    await host.gateway.disableSender("synthetic");
    await assert.rejects(
        host.gateway.enableSender("synthetic"),
        /notification_configuration_failed/,
    );
    await host.gateway.saveProviderConfig("synthetic", { codeLength: 10 });
    await host.gateway.enableSender("synthetic");
    assert.equal(host.persisted().enabled, true);
    assert.equal(host.persisted().codeLength, 10);
});

test("configuration events omit provider-declared secrets while retaining public normalized changes", async () => {
    const host = fixture();
    await host.gateway.saveProviderConfig("example", {
        codeLength: 12,
        host: "new.synthetic.invalid",
        password: "synthetic-new-password",
        transportCredential: "synthetic-new-transport",
        signatureMaterial: "synthetic-new-signature",
    });
    assert.deepEqual(host.events, [
        { codeLength: 10, host: "new.synthetic.invalid", enabled: true },
    ]);
    assert.equal(host.persisted().password, "synthetic-new-password");
    assert.equal(
        host.persisted().transportCredential,
        "synthetic-new-transport",
    );
    assert.equal(host.persisted().signatureMaterial, "synthetic-new-signature");
    for (const secret of [
        "synthetic-new-password",
        "synthetic-new-transport",
        "synthetic-new-signature",
    ]) {
        assert.equal(JSON.stringify(host.logs).includes(secret), false);
    }
});

test("queued reload observes a completed save rather than an earlier persisted snapshot", async () => {
    const host = concurrentFixture();
    const pause = host.pauseNextSave((config) => config.codeLength === 10);
    const save = host.gateway.saveProviderConfig("synthetic", {
        codeLength: 10,
    });
    await pause.started;
    const reload = host.gateway.loadPersistedConfigs();
    pause.release();
    await Promise.all([save, reload]);
    assert.equal(host.persisted().codeLength, 10);
    assert.equal(host.runtime().codeLength, 10);
});

test("one paused sender does not block another sender's configuration", async () => {
    const host = concurrentFixture();
    let otherRuntime: Record<string, unknown> = {};
    host.gateway.registerSender({
        senderId: "independent",
        send: async () => {},
        setConfig: (config) => {
            otherRuntime = config;
        },
    });
    const pause = host.pauseNextSave((config) => config.codeLength === 10);
    const save = host.gateway.saveProviderConfig("synthetic", {
        codeLength: 10,
    });
    await pause.started;
    try {
        await host.gateway.saveProviderConfig("independent", {
            host: "independent.synthetic.invalid",
        });
        assert.equal(otherRuntime.host, "independent.synthetic.invalid");
    } finally {
        pause.release();
        await save;
    }
});
