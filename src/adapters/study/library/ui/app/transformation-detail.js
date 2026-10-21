import { headingCompositionReferences } from "./presentation.js";
import { resolveLabelComposition } from "./composition-links.js";
import { openTransformationTreePopup } from "./transformation-popup.js";
import { sourceTransformation } from "./transformation-popup.js";
import { withParentAttribution } from "./popup-title.js";
import {
    referencedTransformation,
    generatedTransformationCard,
} from "../reuse/transformations.js";

export function transformedParentAttribution(
    items,
    entry,
    transformation,
    label,
) {
    return transformation ? withParentAttribution(items, entry, label) : items;
}

export function resolveDetailTransformation(
    entry,
    schema,
    descriptor,
    sourceLabel,
) {
    if (descriptor === undefined)
        return sourceTransformation(entry, schema, sourceLabel);
    const selected = referencedTransformation(entry, schema, descriptor);
    if (!selected) throw new Error("invalid_reference_transformation");
    return selected;
}

export function transformedDetailEntry(entry, transformation, schema) {
    if (!transformation) return entry;
    return generatedTransformationCard(entry, schema, {
        setId: transformation.set.id,
        path: transformation.node.path,
    });
}

export function selectDetailTransformation(event, context) {
    if (!event.target.closest("[data-library-transform-variants]"))
        return false;
    void openTransformationTreePopup(
        context.entry,
        context.schema,
        context.i18n,
        context.definitions,
    ).then((transformation) => {
        if (transformation) context.onSelected(transformation);
    });
    return true;
}

export function detailTitleReferences(
    detail,
    schemas,
    entries,
    transformation,
) {
    const explicitTitleReferences = headingCompositionReferences(
        detail,
        schemas,
    );
    return !transformation && explicitTitleReferences.length
        ? explicitTitleReferences
        : resolveLabelComposition(
              transformation?.node.value ?? detail.entry.label,
              detail.entry,
              schemas,
              entries,
          );
}
