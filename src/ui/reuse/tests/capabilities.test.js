import test from "node:test";
import assert from "node:assert/strict";
import { createCapabilityRegistry, uiCapabilities } from "../capabilities.js";
import { uiCtx } from "../ui-ctx.js";

test("the shell and early browser clients share the same capability registry", async () => {
    assert.equal(uiCtx.capabilities, uiCapabilities);
    const direct = await import(
        `../capabilities.js?instance=${crypto.randomUUID()}`
    );
    assert.equal(direct.uiCapabilities, uiCapabilities);
});

test("deferred capability bindings are bounded, isolated by owner and reusable after removal", async () => {
    const registry = createCapabilityRegistry();
    const write = registry.bind("example:write");
    const other = registry.bind("another:write");
    for (let index = 0; index < 140; index++) await write(index);
    await other("other");
    const entries = [];
    const handler = (entry) => {
        entries.push(entry);
        return true;
    };
    assert.equal(registry.contribute("example:write", handler), true);
    assert.equal(entries.length, 127);
    assert.equal(entries[0], 13);
    assert.equal(
        registry.contribute("example:write", () => false),
        false,
    );
    assert.equal(await write("ready"), true);
    assert.equal(
        registry.remove("example:write", () => true),
        false,
    );
    assert.equal(registry.remove("example:write", handler), true);
    await write("remount");
    assert.equal(registry.contribute("example:write", handler), true);
    assert.equal(entries.at(-1), "remount");
    const others = [];
    registry.contribute("another:write", (value) => others.push(value));
    assert.deepEqual(others, ["other"]);
    registry.contribute("example:value", 3);
    assert.throws(
        () => registry.bind("example:value")(),
        /capability_not_callable/,
    );
    assert.throws(() => registry.bind(""), /capability_id_required/);
});
