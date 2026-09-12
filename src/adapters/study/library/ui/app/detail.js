import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    compositionReferenceGroups,
    definitionText,
    headingCompositionReferences,
    isMeaningLayer,
    isWritingUnitLayer,
    layerForEntry,
    localizedLabel,
    localizedTextValue,
    metadataFields,
    relationSection,
    renderAudio,
    renderCompositionGroups,
    renderMetadataPills,
    renderPronunciation,
    renderScope,
    pronunciationValues,
    section,
} from "./presentation.js";
import { resolveLabelComposition } from "./composition-links.js";

const DETAIL_FLOW = "study:library:composeEntryDetail";

function coreSections(detail, schemas, entries, i18n, variantPlacement) {
    const { entry, references = [], usedBy = [] } = detail;
    const layer = layerForEntry(schemas, entry);
    const headingReferences = headingCompositionReferences(detail, schemas);
    const compositions = compositionReferenceGroups(detail, schemas).filter(
        (group) =>
            !headingReferences.length ||
            !group.entries.every((entry) => headingReferences.includes(entry)),
    );
    const compositionLabels = new Set(
        compositions.map((group) =>
            group.entries.map(({ label }) => label).join(""),
        ),
    );
    pronunciationValues(entry).forEach((label, index) => {
        if (compositionLabels.has(label)) return;
        const components = resolveLabelComposition(
            label,
            entry,
            schemas,
            entries,
        );
        if (components.length) {
            compositions.push({
                id: `inferred-pronunciation-${index}`,
                presentationRole: "composition",
                entries: components,
            });
        }
    });
    const relatedWords = isWritingUnitLayer(layer)
        ? usedBy.filter(
              (candidate) =>
                  layerForEntry(schemas, candidate)?.semanticRole ===
                  "lexicalUnit",
          )
        : [];
    const variantChildren = usedBy.filter((candidate) => {
        const placement = variantPlacement(candidate, schemas);
        return placement?.parentId === entry.id;
    });
    const otherUsedBy = usedBy.filter(
        (candidate) =>
            !relatedWords.includes(candidate) &&
            !variantChildren.includes(candidate) &&
            layerForEntry(schemas, candidate)?.semanticRole !== "definition",
    );
    const wordLayer = relatedWords.length
        ? layerForEntry(schemas, relatedWords[0])
        : null;
    const fields = entry.fields ?? {};
    const metadataIds = new Set(metadataFields(layer).map(({ id }) => id));
    const reserved = new Set(["pronunciation", "audio", ...metadataIds]);
    const genericFields = Object.fromEntries(
        (layer?.fields ?? [])
            .filter(
                (field) =>
                    !reserved.has(field.id) &&
                    !field.detail?.hidden &&
                    field.detail?.renderer !== "badge" &&
                    fields[field.id] !== undefined &&
                    fields[field.id] !== null &&
                    fields[field.id] !== "",
            )
            .flatMap((field) => {
                const value =
                    field.type === "localizedText"
                        ? localizedTextValue(fields[field.id])
                        : fields[field.id];
                return value === ""
                    ? []
                    : [
                          [
                              localizedLabel(field.metadata, entry.language) ||
                                  field.id,
                              value,
                          ],
                      ];
            }),
    );
    return [
        `<header class="library-detail-summary">${renderPronunciation(entry, layer)}${renderAudio(entry, layer)}${renderCompositionGroups(compositions, i18n)}<div class="library-entry-indicators">${renderMetadataPills(entry, layer)}</div></header>`,
        section(i18n.t("gateway.study.library_fields"), genericFields),
        relatedWords.length
            ? relationSection(
                  i18n
                      .t("gateway.study.library_used_in_layer")
                      .replace(
                          "{{ layer }}",
                          localizedLabel(wordLayer.metadata, entry.language) ||
                              wordLayer.id,
                      ),
                  relatedWords,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
        variantChildren.length
            ? relationSection(
                  i18n.t(
                      "gateway.study.library_relationship_alternateSpelling",
                  ),
                  variantChildren,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
        otherUsedBy.length
            ? relationSection(
                  i18n.t("gateway.study.library_used_by"),
                  otherUsedBy,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
    ].filter(Boolean);
}

export async function composeDetail(
    detail,
    schemas,
    entries,
    i18n,
    languageCode,
    variantPlacement,
) {
    const flow = await uiCtx.runFlow(DETAIL_FLOW, {
        detail,
        i18n,
        languageCode,
    });
    const sectionsFor = (stageId) =>
        (flow.stageResults[stageId] ?? []).flatMap((contribution) =>
            Array.isArray(contribution?.sections)
                ? contribution.sections.filter(Boolean)
                : [],
        );
    const layer = layerForEntry(schemas, detail.entry);
    const definitions = (detail.references ?? []).filter((candidate) =>
        isMeaningLayer(layerForEntry(schemas, candidate)),
    );
    const flowDefinition = Object.values(flow.stageResults)
        .flat()
        .find(
            (contribution) =>
                typeof contribution?.displayDefinition === "string",
        )?.displayDefinition;
    const titleDefinition =
        flowDefinition ??
        definitions
            .map((definition) =>
                definitionText(
                    definition,
                    layerForEntry(schemas, definition),
                    languageCode,
                ),
            )
            .filter(Boolean)
            .join(" · ");
    const actions =
        layer?.semanticRole === "particle"
            ? []
            : (flow.stageResults.actions ?? []).flatMap((contribution) =>
                  Array.isArray(contribution?.actions)
                      ? contribution.actions
                      : [],
              );
    const sections = [
        ...sectionsFor("beforeCore"),
        ...coreSections(detail, schemas, entries, i18n, variantPlacement),
        ...sectionsFor("core"),
        ...sectionsFor("afterCore"),
    ];
    return {
        body: `<div class="library-detail">${sections.join("")}</div>`,
        titleDefinition,
        titleLeading: renderScope(detail.entry, i18n),
        actions,
    };
}
