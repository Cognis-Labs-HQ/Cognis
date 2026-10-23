import test from "node:test";
import assert from "node:assert/strict";
import { isCardDue } from "../ui/reuse/review.js";

test("gallery and session due status agrees for new, overdue, future and invalid dates", () => {
    const now = Date.parse("2026-10-11T00:00:00Z");
    const progress = {
        old: { due: "2026-10-10" },
        next: { due: "2026-10-12" },
        broken: { due: "invalid" },
    };
    assert.equal(isCardDue(progress, "new", now), true);
    assert.equal(isCardDue(progress, "old", now), true);
    assert.equal(isCardDue(progress, "next", now), false);
    assert.equal(isCardDue(progress, "broken", now), true);
});
