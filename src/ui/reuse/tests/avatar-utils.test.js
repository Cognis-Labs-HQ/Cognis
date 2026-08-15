import assert from "node:assert/strict";
import test from "node:test";

import { getInitialsText, pickInitialsColor } from "../avatar-utils.js";
import { uiCtx } from "../ui-ctx.js";

const calls = [];
uiCtx.capabilities.contribute("ui:profileAvatarRenderer", {
    getInitials(label) {
        calls.push(["initials", label]);
        return "CTX";
    },
    getInitialsColor(seed) {
        calls.push(["color", seed]);
        return "profile-color";
    },
});

test("avatar utilities delegate initials and colours to the profile capability", () => {
    assert.equal(getInitialsText("Alice Smith"), "CTX");
    assert.equal(pickInitialsColor("alice"), "profile-color");
    assert.deepEqual(calls, [
        ["initials", "Alice Smith"],
        ["color", "alice"],
    ]);
});
