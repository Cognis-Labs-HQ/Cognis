import assert from "node:assert/strict";
import test from "node:test";
import { createCtx, runBootstrapScope } from "@cognis/core";
import { createShareMaintenance } from "../bootstrap/maintenance.js";

test("share maintenance coalesces passes, stops after failures and resumes on the next pass", async () => {
    const root = createCtx();
    const calls: string[] = [];
    const logs: unknown[] = [];
    let release!: () => void;
    let fail = false;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const maintenance = await runBootstrapScope(
        root,
        "gateway:share",
        async () =>
            createShareMaintenance(
                root,
                [
                    {
                        operation: "scan",
                        run: async () => {
                            calls.push("scan");
                            await gate;
                            if (fail)
                                throw Object.assign(
                                    new Error("private connection details"),
                                    { code: "ETIMEDOUT" },
                                );
                        },
                    },
                    {
                        operation: "purge",
                        run: async () => {
                            calls.push("purge");
                        },
                    },
                ],
                (...args) => logs.push(args),
                900_000,
            ),
    );
    try {
        const first = maintenance.run();
        assert.equal(maintenance.run(), first);
        release();
        await first;
        assert.deepEqual(calls, ["scan", "purge"]);
        fail = true;
        await maintenance.run();
        assert.deepEqual(calls, ["scan", "purge", "scan"]);
        assert.equal(logs.length, 1);
        assert.equal(
            JSON.stringify(logs).includes("private connection details"),
            false,
        );
        fail = false;
        await maintenance.run();
        assert.deepEqual(calls.slice(-2), ["scan", "purge"]);
    } finally {
        await maintenance();
    }
});

test("disabled share maintenance skips remaining work and supports reactivation", async () => {
    const root = createCtx();
    let release!: () => void;
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => {
        entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    let purged = 0;
    const maintenance = await runBootstrapScope(
        root,
        "gateway:share",
        async () =>
            createShareMaintenance(
                root,
                [
                    {
                        operation: "scan",
                        run: async () => {
                            entered();
                            await gate;
                        },
                    },
                    {
                        operation: "purge",
                        run: async () => {
                            purged++;
                        },
                    },
                ],
                undefined,
                900_000,
            ),
    );
    const running = maintenance.run();
    await ready;
    await maintenance();
    release();
    await running;
    assert.equal(purged, 0);
    await maintenance.run();
    assert.equal(purged, 0);
    await maintenance.reactivate?.();
    try {
        await maintenance.run();
        assert.equal(purged, 1);
    } finally {
        await maintenance();
    }
});
