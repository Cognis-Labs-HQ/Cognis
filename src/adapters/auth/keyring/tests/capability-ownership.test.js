import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { registerKeyringCapabilities } from "../ui/capabilities.js";

test("bundled and directly loaded Keyring consumers retain one provider and execute the owned state flow", async () => {
    const calls = [];
    const owner = {
        readState: async () => {
            calls.push("owner");
            return {
                exists: true,
                unlocked: false,
                privateData: "not presentation",
            };
        },
    };
    assert.equal(registerKeyringCapabilities(uiCtx, owner), true);
    assert.equal(
        registerKeyringCapabilities(uiCtx, {
            readState: () => assert.fail("duplicate provider used"),
        }),
        false,
    );
    uiCtx.extendFlow(
        "keyring:readState",
        "present",
        { id: "test:statePresentation", order: 100 },
        () => calls.push("present"),
    );
    assert.deepEqual(await uiCtx.capabilities.get("keyring:readState")(), {
        exists: true,
        unlocked: false,
    });
    assert.deepEqual(calls, ["owner", "present"]);
});
