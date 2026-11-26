import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { transformationPathways } from "../../ui/reuse/transformations.js";
import {
    compositionTokenEntryId,
    transformationCompositionToken,
} from "../../ui/app/composition-tokens.js";

test("new dictionary verbs enter the transformation selector before placement", async () => {
    const entry = {
        id: "created-verb",
        label: "食べる",
        tags: ["verb", "ichidan"],
        fields: { pronunciation: ["たべる"] },
    };
    const schema = {
        language: "ja",
        transformSets: [
            {
                id: "ichidan",
                flag: "verb",
                matchTags: ["verb", "ichidan"],
                baseState: "base",
                rules: [
                    {
                        id: "polite",
                        fromState: "base",
                        toState: "polite",
                        removeSuffix: "る",
                        append: "ます",
                    },
                ],
            },
        ],
    };
    let finish, selected;
    const context = {
        transformationPathways,
        compositionTokenEntryId,
        transformationCompositionToken,
        entryDefinitions: () => ["eat"],
        openTransformationPopup: (value) => {
            selected = value;
            return new Promise((resolve) => {
                finish = resolve;
            });
        },
    };
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/app/composition-activation.js", import.meta.url),
            {
                "./composition-tokens.js": context,
                "../reuse/transformations.js": context,
                "./transformation-popup.js": context,
                "./create-entry/definitions.js": context,
            },
            context,
        ),
    );
    const item = { dataset: { carouselValue: entry.id } };
    const pending = context.activateCompositionEntry(
        { item, selected: false },
        [entry],
        schema,
        {},
    );
    assert.equal(selected, entry);
    assert.equal(item.dataset.carouselValue, entry.id);
    const pathway = transformationPathways(entry, schema)[0];
    finish({ set: pathway.set, node: pathway.nodes[1] });
    const placement = await pending;
    assert.equal(placement.label, "食べます");
    assert.equal(compositionTokenEntryId(placement.value), entry.id);
});
