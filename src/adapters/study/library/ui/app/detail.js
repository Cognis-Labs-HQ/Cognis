import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    isMeaningLayer,
    isWritingUnitLayer,
    layerForEntry,
    localizedLabel,
    localizedTextValue,
    metadataFields,
    relationSection,
    renderAudio,
    renderDetailFields,
    renderEntryLink,
    renderMetadataPills,
    renderScope,
    section,
} from "./presentation.js";
import { resolveCompositionDependants } from "./composition-links.js";
import { definitionDisplay } from "./definition-display.js";
import { similarEntries } from "./similar-items.js";
import { uniqueRelatedEntries } from "./related-entries.js";
import {
    dependantsMatchingTransformation,
    transformationPathways,
} from "./transformations.js";

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
    const visibleRelatedWords = relatedWords.filter(
        (candidate) =>
            candidate.label.normalize("NFC") !== entry.label.normalize("NFC"),
    );
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
    const relatedDependants = uniqueRelatedEntries([
        ...visibleRelatedWords,
        ...otherUsedBy,
    ]);
    const fields = entry.fields ?? {};
    const metadataIds = new Set(metadataFields(layer).map(({ id }) => id));
    const reserved = new Set([
        "pronunciation",
        "audio",
        ...metadataIds,
        ...(layer?.fields ?? [])
            .filter(({ type }) => type === "strokePattern")
            .map(({ id }) => id),
    ]);
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
    const layerLabel = localizedLabel(layer?.metadata, entry.language);
    const providerIdentifiesVocabulary =
        layer?.semanticRole === "lexicalUnit" &&
        (entry.tags ?? []).some((tag) => tag.toLocaleLowerCase() === "vocab");
    const classPill =
        layerLabel && !providerIdentifiesVocabulary
            ? `<span class="library-metadata-pill library-content-class-pill">${escapeHtml(layerLabel)}</span>`
            : "";
    const tagPills = (entry.tags ?? [])
        .map(
            (tag) =>
                `<span class="library-metadata-pill">${escapeHtml(tag)}</span>`,
        )
        .join("");
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const hasVariants = transformationPathways(entry, schema).some(
        ({ nodes }) => nodes.length > 1,
    );
    const variants = options.transformation
        ? ""
        : hasVariants
          ? `<button class="library-detail-variants btn-neutral" type="button" data-library-transform-variants>${escapeHtml(i18n.t("gateway.study.library_variants"))}</button>`
          : "";
    return [
        `<header class="library-detail-summary">${renderAudio(entry, layer, entries, schemas, i18n.t("gateway.study.library_play_audio"), i18n.t("gateway.study.library_dependencies_missing_audio"))}<div class="library-entry-indicators">${classPill}${tagPills}${renderMetadataPills(entry, layer)}</div>${variants}</header>`,
        options.showReferenceTree ? relationTree(references, usedBy, i18n) : "",
        renderDetailFields(genericFields),
        !options.showReferenceTree && relatedDependants.length
            ? relationSection(
                  i18n.t("gateway.study.library_used_by"),
                  relatedDependants,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
        !options.showReferenceTree && directExamples.length
            ? relationSection(
                  i18n.t("gateway.study.library_usage_examples"),
                  directExamples,
                  i18n.t("gateway.study.library_no_relationships"),
              )
            : "",
        !options.showReferenceTree
            ? relationSection(
                  i18n.t("gateway.study.library_similar_items"),
                  similarEntries(entry, entries),
                  i18n.t("gateway.study.library_no_similar_items"),
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
    const usedBy = Array.from(
        new Map(
            [
                ...(detail.usedBy ?? []),
                ...resolveCompositionDependants(detail.entry, schemas, entries),
            ].map((entry) => [entry.id, entry]),
        ).values(),
    );
    const presentationDetail = options.transformation
        ? {
              ...detail,
              usedBy: dependantsMatchingTransformation(
                  usedBy,
                  detail.entry.id,
                  options.transformation,
              ),
          }
        : { ...detail, usedBy };
    const flow = await uiCtx.runFlow(DETAIL_FLOW, {
        detail: presentationDetail,
        i18n,
        languageCode,
    });
    const sectionsFor = (stageId) =>
        (flow.stageResults[stageId] ?? []).flatMap((contribution) =>
            Array.isArray(contribution?.sections)
                ? contribution.sections.filter(Boolean)
                : [],
        );
    const layer = layerForEntry(schemas, presentationDetail.entry);
    const { titleDefinition, additionalDefinitions } = definitionDisplay(
        presentationDetail,
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
    const core = [
        ...sectionsFor("beforeCore"),
        ...coreSections(presentationDetail, schemas, entries, i18n, options),
    ];
    const tail = [...sectionsFor("core"), ...sectionsFor("afterCore")];
    const renderBody = (definitions) =>
        `<div class="library-detail">${[
            ...core,
            section(
                i18n.t("gateway.study.library_additional_definitions"),
                definitions.slice(1),
            ),
            ...tail,
        ].join("")}</div>`;
    const definitions = [titleDefinition, ...additionalDefinitions].filter(
        Boolean,
    );
    return {
        body: renderBody(definitions),
        definitions,
        renderBody,
        titleDefinition,
        titleLeading: renderScope(presentationDetail.entry, i18n),
        actions,
    };
}
