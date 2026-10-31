import test from "node:test";
import assert from "node:assert/strict";
import { createSetupDismissalGuard } from "../ui/setup-dismissal.js";

function fixture() {
    const target = new EventTarget();
    const owner = new AbortController();
    let resolveClose;
    let requests = 0;
    let dirty = 0;
    let resumed = 0;
    const errors = [];
    const guard = createSetupDismissalGuard({
        target,
        signal: owner.signal,
        onError: (error) => errors.push(error),
    });
    guard.onOpen(
        null,
        () => {
            requests++;
            return new Promise((resolve) => {
                resolveClose = resolve;
            });
        },
        { markDirty: () => dirty++ },
    );
    const navigate = () => {
        const event = new CustomEvent("cognis:route-before-navigate", {
            cancelable: true,
            detail: {
                resume: () => {
                    resumed++;
                },
            },
        });
        target.dispatchEvent(event);
        return event;
    };
    return {
        target,
        owner,
        guard,
        navigate,
        errors,
        state: () => ({ requests, dirty, resumed }),
        resolve: (didClose) => resolveClose(didClose),
    };
}

test("unfinished TFA enrollment protects refresh and coalesces navigation discard decisions", async () => {
    const host = fixture();
    assert.equal(host.state().dirty, 1);
    const refresh = new Event("beforeunload", { cancelable: true });
    host.target.dispatchEvent(refresh);
    assert.equal(refresh.defaultPrevented, true);
    assert.equal(host.navigate().defaultPrevented, true);
    assert.equal(host.navigate().defaultPrevented, true);
    assert.equal(host.state().requests, 1);
    const resume = host.guard.close();
    assert.equal(host.state().resumed, 0);
    host.resolve();
    await Promise.resolve();
    await resume();
    assert.equal(host.state().resumed, 1);
    assert.equal(host.navigate().defaultPrevented, false);
    const after = new Event("beforeunload", { cancelable: true });
    host.target.dispatchEvent(after);
    assert.equal(after.defaultPrevented, false);
});

test("keeping enrollment discards the proposed navigation and permits a new decision", async () => {
    const host = fixture();
    host.navigate();
    host.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(host.guard.close(), undefined);
    assert.equal(host.state().resumed, 0);
    assert.deepEqual(host.errors, []);
});

test("owner disposal removes TFA enrollment navigation and refresh listeners", () => {
    const host = fixture();
    host.owner.abort();
    assert.equal(host.navigate().defaultPrevented, false);
    const refresh = new Event("beforeunload", { cancelable: true });
    host.target.dispatchEvent(refresh);
    assert.equal(refresh.defaultPrevented, false);
    assert.equal(host.state().requests, 0);
});

test("successful popup dismissal retains navigation through asynchronous popup resolution", async () => {
    const host = fixture();
    host.navigate();
    host.resolve(true);
    await new Promise((resolve) => setImmediate(resolve));
    const resume = host.guard.close();
    assert.equal(typeof resume, "function");
    await resume();
    assert.equal(host.state().resumed, 1);
});

for (const decision of ["stay", "discard"])
    test(`cancelling enrollment preserves the remaining Settings guard (${decision})`, async (t) => {
        const { createUnsavedChangesBar } =
            await import("../../../ui/reuse/unsaved-changes.js");
        const host = fixture();
        const previousWindow = globalThis.window;
        globalThis.window = host.target;
        let decisions = 0;
        const changes = createUnsavedChangesBar(null, {
            quiet: true,
            openConfirmation: async () => {
                decisions++;
                return decision;
            },
        });
        t.after(() => {
            changes.destroy();
            host.owner.abort();
            globalThis.window = previousWindow;
        });
        changes.markDirty("preferredTfaMethodOrder", true);
        host.navigate();
        assert.equal(decisions, 0);
        const resume = host.guard.close();
        host.resolve(true);
        await resume();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(decisions, 1);
        assert.equal(host.state().resumed, decision === "discard" ? 1 : 0);
        assert.equal(changes.isAnyDirty(), decision === "stay");
    });

test("a retained enrollment navigation cannot resume after its Settings page unmounts", async () => {
    const host = fixture();
    host.navigate();
    const resume = host.guard.close();
    host.resolve(true);
    host.owner.abort();
    assert.equal(resume(), false);
    assert.equal(host.state().resumed, 0);
});
