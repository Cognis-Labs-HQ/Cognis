import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    isMeaningLayer,
    isWritingUnitLayer,
    layerForEntry,
    localizedLabel,
    localizedTextValue,
    metadataFields,
    pronunciationValues,
    relationSection,
    renderAudio,
    renderDetailFields,
    renderEntryLink,
    renderMetadataPills,
    renderScope,
    section,
} from "./presentation.js";
import { definitionDisplay } from "./definition-display.js";

const DETAIL_FLOW = "study:library:composeEntryDetail";

function relationTree(references, usedBy, i18n) {
    const branch = (label, related) =>
        `<div class="library-relation-group"><strong>${escapeHtml(label)}</strong>${related.length ? `<div class="library-related-entries">${related.map((candidate) => renderEntryLink(candidate, "library-related-entry btn-neutral")).join("")}</div>` : `<span>${escapeHtml(i18n.t("gateway.study.library_no_relationships"))}</span>`}</div>`;
    return `<section class="library-detail-section library-relation-tree"><h3>${escapeHtml(i18n.t("gateway.study.library_relation_tree"))}</h3><div class="library-relation-groups">${branch(i18n.t("gateway.study.library_relation_parents"), references)}${branch(i18n.t("gateway.study.library_relation_children"), usedBy)}</div></section>`;
}

function coreSections(detail, schemas, entries, i18n, options = {}) {
    const { entry, references = [], usedBy = [] } = detail;
    const layer = layerForEntry(schemas, entry);
    const relatedWords = isWritingUnitLayer(layer)
        ? usedBy.filter(
              (candidate) =>
                  layerForEntry(schemas, candidate)?.semanticRole ===
                  "lexicalUnit",
          )
        : [];
    const structuralDependants = usedBy.filter((candidate) => {
        const candidateLayer = layerForEntry(schemas, candidate);
        return (candidate.references ?? []).some((reference) => {
            if (reference.entryId !== entry.id) return false;
            const relationship = (candidateLayer?.relationships ?? []).find(
                ({ id }) => id === reference.relation,
            );
            return (
                relationship?.child === true ||
                relationship?.variant === true ||
                relationship?.presentationRole === "alternateSpelling"
            );
        });
    });
    const directExamples = usedBy.filter(
        (candidate) =>
            layerForEntry(schemas, candidate)?.semanticRole ===
            "orderedLexicalSequence",
    );
    const otherUsedBy = usedBy.filter(
        (candidate) =>
            !relatedWords.includes(candidate) &&
            !directExamples.includes(candidate) &&
            !structuralDependants.includes(candidate) &&
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
        `<header class="library-detail-summary">${renderAudio(entry, layer)}<div class="library-entry-indicators">${renderMetadataPills(entry, layer)}</div></header>`,
        options.showReferenceTree ? relationTree(references, usedBy, i18n) : "",
        renderDetailFields(genericFields),
        !options.showReferenceTree && relatedWords.length
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
                  (candidate) => {
                      const pronunciation = pronunciationValues(candidate)
                          .filter((value) => value !== candidate.label)
                          .join(" · ");
                      return pronunciation
                          ? `${candidate.label} ${pronunciation}`
                          : candidate.label;
                  },
              )
            : "",
        !options.showReferenceTree && directExamples.length
            ? relationSection(
                  i18n.t("gateway.study.library_usage_examples"),
                  directExamples,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
        !options.showReferenceTree && otherUsedBy.length
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
    options = {},
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
    const { titleDefinition, additionalDefinitions } = definitionDisplay(
        detail,
        schemas,
        languageCode,
        flow.stageResults,
    );
    const actions =
        options.readOnly || layer?.semanticRole === "particle"
            ? []
            : (flow.stageResults.actions ?? []).flatMap((contribution) =>
                  Array.isArray(contribution?.actions)
                      ? contribution.actions
                      : [],
              );
    const sections = [
        ...sectionsFor("beforeCore"),
        ...coreSections(detail, schemas, entries, i18n, options),
        section(
            i18n.t("gateway.study.library_additional_definitions"),
            additionalDefinitions,
        ),
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
