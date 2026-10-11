import {
    compositionTokenEntryId,
    transformationCompositionToken,
} from "./composition-tokens.js";
import { transformationPathways } from "./transformations.js";
import { openTransformationPopup } from "./transformation-popup.js";
import { entryDefinitions } from "./create-entry/definitions.js";

export function activateCompositionEntry(
    { item, selected },
    entries,
    schema,
    i18n,
) {
    if (selected) return;
    const suggested = item.dataset.carouselSuggestedTransformation;
    if (suggested) {
        delete item.dataset.carouselSuggestedTransformation;
        const suggestion = JSON.parse(suggested);
        item.dataset.carouselBaseValue = suggestion.entryId;
        return { value: suggestion.value, label: suggestion.label };
    }
    const entryId =
        item.dataset.carouselBaseValue ??
        compositionTokenEntryId(item.dataset.carouselValue);
    const entry = entries.find(({ id }) => id === entryId);
    if (!entry || !transformationPathways(entry, schema).length) return;
    return openTransformationPopup(
        entry,
        schema,
        i18n,
        entryDefinitions(entry, entries, schema),
    ).then((transformation) => {
        if (!transformation) return false;
        if (transformation.base) return { value: entry.id, label: entry.label };
        item.dataset.carouselBaseValue = entry.id;
        return {
            value: transformationCompositionToken(
                entry.id,
                transformation.set.id,
                transformation.node,
            ),
            label: transformation.node.value,
        };
    });
}
