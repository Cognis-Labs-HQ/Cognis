import test from "node:test";
import assert from "node:assert/strict";
import {
    runBootstrapScope,
    requireBootstrapScope,
} from "../ctx/bootstrap-scope.js";

function gate() {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

test("bootstrap authority is root-scoped and revoked for retained asynchronous work after completion", async () => {
    const root = {};
    const pending = gate();
    let detached!: Promise<void>;
    assert.throws(
        () => requireBootstrapScope(root),
        /bootstrap_registration_closed/,
    );
    await runBootstrapScope(root, "module:example", async () => {
        assert.equal(requireBootstrapScope(root).owner, "module:example");
        assert.equal(Object.isFrozen(requireBootstrapScope(root)), true);
        assert.throws(
            () => requireBootstrapScope({}),
            /bootstrap_registration_closed/,
        );
        detached = pending.promise.then(() => {
            assert.throws(
                () => requireBootstrapScope(root),
                /bootstrap_registration_closed/,
            );
        });
        await Promise.resolve();
        assert.equal(requireBootstrapScope(root).active, true);
    });
    pending.resolve();
    await detached;
    assert.throws(
        () => requireBootstrapScope(root),
        /bootstrap_registration_closed/,
    );
});

test("failed bootstrap rolls back registrations and module lifetimes receive cleanup on success", async () => {
    const events: string[] = [];
    await assert.rejects(
        runBootstrapScope({}, "module:failed", async () => {
            requireBootstrapScope().registerDisposer(() => {
                assert.throws(
                    () => requireBootstrapScope(),
                    /bootstrap_registration_closed/,
                );
                events.push("rollback");
            });
            throw new Error("bootstrap_failed");
        }),
        /bootstrap_failed/,
    );
    const cleanup: Array<() => void | Promise<void>> = [];
    await runBootstrapScope(
        {},
        "module:enabled",
        async () => {
            requireBootstrapScope().registerDisposer(() => {
                events.push("disabled");
            });
        },
        (dispose) => cleanup.push(dispose),
    );
    assert.deepEqual(events, ["rollback"]);
    await cleanup[0]();
    assert.deepEqual(events, ["rollback", "disabled"]);
});

test("failed bootstrap attempts every cleanup even when one disposer fails", async () => {
    const events: string[] = [];
    const failure = new Error("bootstrap_failed");
    await assert.rejects(
        runBootstrapScope({}, "gateway:failed", async () => {
            const scope = requireBootstrapScope();
            scope.registerDisposer(() => {
                events.push("first");
            });
            scope.registerDisposer(() => {
                events.push("second");
                throw new Error("cleanup_failed");
            });
            throw failure;
        }),
        (error) => {
            assert.ok(error instanceof AggregateError);
            assert.equal(error.cause, failure);
            assert.equal(error.errors.length, 2);
            return true;
        },
    );
    assert.deepEqual(events, ["second", "first"]);
});
