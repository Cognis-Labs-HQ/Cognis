import { openTransformationTreePopup } from "./transformation-popup.js";
import { sourceTransformation } from "./transformation-popup.js";
import { withParentAttribution } from "./popup-title.js";
import { referencedTransformation } from "./transformations.js";

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
    return (
        referencedTransformation(entry, schema, descriptor) ??
        sourceTransformation(entry, schema, sourceLabel)
    );
}

export function transformedDetailEntry(entry, transformation) {
    if (!transformation) return entry;
    return {
        ...entry,
        label: transformation.node.value,
        fields: {
            ...entry.fields,
            pronunciation: transformation.node.pronunciation,
        },
    };
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
