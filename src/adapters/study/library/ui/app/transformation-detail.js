import { headingCompositionReferences } from "./presentation.js";
import { resolveLabelComposition } from "./composition-links.js";
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

export function transformedRootActions(entry, transformation, i18n) {
    return transformation
        ? [
              {
                  id: "return-root",
                  label: i18n
                      .t("gateway.study.library_return_to_root")
                      .replace("{{ verb }}", entry.label),
                  variant: "neutral",
              },
          ]
        : [];
}
