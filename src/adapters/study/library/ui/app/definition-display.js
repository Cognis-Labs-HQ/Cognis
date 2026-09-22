import {
    definitionText,
    isMeaningLayer,
    layerForEntry,
} from "./presentation.js";
import { orderedDefinitionDisplay } from "./title-definition.js";

export function definitionDisplay(detail, schemas, languageCode, stageResults) {
    const definitions = (detail.references ?? [])
        .filter((candidate) =>
            isMeaningLayer(layerForEntry(schemas, candidate)),
        )
        .map((definition) =>
            definitionText(
                definition,
                layerForEntry(schemas, definition),
                languageCode,
            ),
        )
        .filter(Boolean);
    const flowDefinition = Object.values(stageResults)
        .flat()
        .find(
            (contribution) =>
                typeof contribution?.displayDefinition === "string",
        )?.displayDefinition;
    return orderedDefinitionDisplay(definitions, flowDefinition ?? "");
}
