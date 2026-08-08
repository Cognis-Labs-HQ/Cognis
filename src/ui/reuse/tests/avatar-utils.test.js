import assert from "node:assert/strict";
import test from "node:test";

import { getInitialsText } from "../avatar-utils.js";
import { uiCtx } from "../ui-ctx.js";

uiCtx.capabilities.contribute("ui:profileAvatarRenderer", {
    getInitialsText(label) {
        return `profile:${label}`;
    },
});

test("getInitialsText delegates to the profile avatar CTX capability", () => {
    assert.equal(getInitialsText("Alice Smith"), "profile:Alice Smith");
});
