import assert from "node:assert/strict";
import test from "node:test";
import {
    disposeModuleResources,
    removeModuleRoutes,
} from "../../reuse/module-resource-disposal.js";

test("resource cleanup attempts every disposer in reverse order after a failure", async () => {
    const events: string[] = [];
    await disposeModuleResources(
        [
            () => {
                events.push("first");
            },
            () => {
                events.push("failed");
                throw new Error("cleanup_failed");
            },
            () => {
                events.push("last");
            },
        ],
        "example",
        (level, _message, metadata) => {
            assert.equal(level, "error");
            assert.equal(metadata?.moduleId, "example");
            events.push("logged");
        },
    );
    assert.deepEqual(events, ["last", "failed", "logged", "first"]);
});

test("route cleanup preserves other modules' handlers", () => {
    const handlers = [
        { moduleId: "first", path: "one" },
        { moduleId: "second", path: "two" },
        { moduleId: "first", path: "three" },
    ];
    removeModuleRoutes(handlers, "first");
    assert.deepEqual(handlers, [{ moduleId: "second", path: "two" }]);
});
