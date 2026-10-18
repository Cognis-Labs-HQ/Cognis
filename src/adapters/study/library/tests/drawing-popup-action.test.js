import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

function drawingAction(openDrawing) {
    const source = readFileSync(
        new URL("../ui/app/entry-popup.js", import.meta.url),
        "utf8",
    );
    const handler =
        source.match(
            /onAction: (async \(actionId, overlay, popupApi\) => \{[\s\S]*?)\n            \},\n        \}\);/,
        )[1] + "\n}";
    return vm.runInNewContext(`(${handler})`, {
        canDraw: () => true,
        openDrawing,
        displayedEntry: { id: "card" },
        strokePattern: { strokes: [1] },
        displayedDefinition: "meaning",
        composed: { actions: [] },
    });
}

test("card details request dismissal only after the drawing pad opens", async () => {
    let opened = false;
    const action = drawingAction(async (entry, pattern, definition) => {
        assert.equal(entry.id, "card");
        assert.equal(pattern.strokes.length, 1);
        assert.equal(definition, "meaning");
        await Promise.resolve();
        opened = true;
    });
    const dismiss = await action("draw");
    assert.equal(opened, true);
    assert.equal(dismiss, true);
});

test("a failed pad opening propagates to the popup and keeps the details available", async () => {
    const action = drawingAction(async () => {
        throw new Error("drawing_unavailable");
    });
    await assert.rejects(action("draw"), /drawing_unavailable/);
});
