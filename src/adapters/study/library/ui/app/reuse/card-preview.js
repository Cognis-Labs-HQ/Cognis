import { definitionText, layerForEntry } from "../presentation.js";
import { derivedPronunciation } from "../composer-contract.js";

/** Primary reading and meaning shared by all composer card carousels. */
export function cardPreview(entry, entries, schema, language) {
    const definition = (entry.references ?? [])
        .toSorted((left, right) => (left.position ?? 0) - (right.position ?? 0))
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .find((candidate) =>
            ["definition", "meaning"].includes(
                candidate
                    ? layerForEntry([schema], candidate)?.semanticRole
                    : "",
            ),
        );
    return [
        derivedPronunciation(entry, entries, schema),
        definition
            ? definitionText(
                  definition,
                  layerForEntry([schema], definition),
                  language,
              )
            : "",
    ]
        .filter(Boolean)
        .join("\n");
}
