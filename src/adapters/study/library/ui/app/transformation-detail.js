import { openTransformationTreePopup } from "./transformation-popup.js";

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
        context.definition,
    ).then((transformation) => {
        if (transformation) context.onSelected(transformation);
    });
    return true;
}
