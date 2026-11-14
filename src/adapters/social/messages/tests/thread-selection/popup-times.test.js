import assert from "node:assert/strict";
import test from "node:test";
import { createRenderer } from "./fixture.js";

test("read receipt and reaction details retain shared timestamp formatting", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    const reader = {
        accountId: "reader",
        displayName: "Reader",
        readAt: "2026-01-15T14:30:00.000Z",
    };
    state.showReadReceiptHoverPopup(state.container, [reader], {
        t: (key) => key,
    });
    assert.match(state.popups[0][1], /2026-01-15 14:30/);
    await state.openReactionDetailsPopup(
        [
            {
                emoji: "♥",
                count: 1,
                reactedBy: [{ ...reader, reactedAt: reader.readAt }],
            },
        ],
        { t: (key) => key },
    );
    assert.match(state.popups[1].body, /2026-01-15 14:30/);
});
