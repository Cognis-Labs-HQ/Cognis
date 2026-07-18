import assert from "node:assert/strict";
import test from "node:test";

import { getInitialsText } from "../avatar-utils.js";

test("getInitialsText uses profile names and supports single-word initials", () => {
    assert.equal(getInitialsText("Alice Smith"), "AS");
    assert.equal(getInitialsText("Prince"), "P");
    assert.equal(getInitialsText("@alice_smith"), "AS");
    assert.equal(getInitialsText(""), "?");
});
