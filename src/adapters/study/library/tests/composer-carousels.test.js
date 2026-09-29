import assert from "node:assert/strict";
import test from "node:test";
import { atomicWritingUnitCarouselLayers } from "../ui/app/composer-carousels.js";

test("alternate-character pronunciation uses characters instead of vocabulary", () => {
    const schema = {
        layers: [
            { id: "characters", semanticRole: "atomicWritingUnit" },
            { id: "vocabulary", semanticRole: "lexicalUnit" },
        ],
    };
    const layer = {
        relationships: [
            { id: "characters", targetLayer: "characters" },
            { id: "words", targetLayer: "vocabulary" },
        ],
    };

    assert.deepEqual(
        [...atomicWritingUnitCarouselLayers(schema, layer)],
        ["characters"],
    );
});
