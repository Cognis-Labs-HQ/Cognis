import { layerForEntry, pronunciationValues } from "./presentation.js";
import {
    distinctPronunciationLabels,
    excludeTitleReferenceDuplicates,
    resolveReferenceAliasComposition,
    resolveGroupedPronunciation,
    resolveLabelComposition,
} from "./composition-links.js";
import { visibleTitleDefinition } from "./title-definition.js";
import { secondarySpellingGroups } from "./popup-spellings.js";
import { variantPlacement } from "./variant-placement.js";

function linkedItems(entries) {
    return entries.map((entry) => ({
        label: entry.label,
        actionId: `open-title-reference:${entry.id}`,
    }));
}

function normalizedTitleText(value) {
    return String(value).trim().normalize("NFKC").replaceAll(/\s+/g, "");
}

export const hasReadingDetails = (items) =>
    items.some(({ placement }) => placement === "reading");

export function withParentAttribution(items, parentEntry, parentLabel) {
    const [prefix, suffix = ""] = parentLabel.split("{{ parent }}");
    const parentItems = [
        ...(hasReadingDetails(items)
            ? [{ label: " · ", placement: "reading" }]
            : []),
        { label: prefix, placement: "reading" },
        {
            label: parentEntry.label,
            actionId: `open-title-reference:${parentEntry.id}`,
            placement: "reading",
        },
        { label: suffix, placement: "reading" },
    ];
    const definitionIndex = items.findIndex(
        ({ placement }) => placement === "definition",
    );
    const insertionIndex = definitionIndex < 0 ? items.length : definitionIndex;
    return [
        ...items.slice(0, insertionIndex),
        ...parentItems,
        ...items.slice(insertionIndex),
    ];
}

export function withParentTitleAttribution(
    items,
    entry,
    layer,
    schemas,
    entries,
    parentLabel,
) {
    if (layer?.semanticRole === "lexicalUnit") return items;
    const parentId = variantPlacement(entry, schemas, entries)?.parentId;
    const parentEntry = entries.find(({ id }) => id === parentId);
    return parentEntry
        ? withParentAttribution(items, parentEntry, parentLabel)
        : items;
}

export function popupTitleDetailItems(
    detail,
    schemas,
    titleDefinition,
    sourceDefinition = "",
    titleReferences = [],
    entries = [],
) {
    const layer = layerForEntry(schemas, detail.entry);
    const spellingGroups = excludeTitleReferenceDuplicates(
        secondarySpellingGroups(detail, schemas),
        titleReferences,
    );
    const spellingLabels = new Set(
        spellingGroups.map((group) =>
            group.map((entry) => entry.label).join(""),
        ),
    );
    const displayedSpellingGroups = spellingGroups.map((group) =>
        normalizedTitleText(group.map((entry) => entry.label).join("")) ===
        normalizedTitleText(detail.entry.label)
            ? group.map((entry) => ({
                  ...entry,
                  label: pronunciationValues(entry)[0] ?? entry.label,
              }))
            : group,
    );
    const spellingItems = displayedSpellingGroups.flatMap(
        (group, groupIndex) => [
            ...(groupIndex ? [{ label: " · " }] : []),
            ...linkedItems(group),
        ],
    );
    const pronunciationField = (layer?.fields ?? []).find(
        ({ id }) => id === "pronunciation",
    );
    const linkRelationships = new Set([
        ...(pronunciationField?.input?.linkRelationships ?? []),
        ...(layer?.relationships ?? [])
            .filter(
                ({ presentationRole }) => presentationRole === "pronunciation",
            )
            .map(({ id }) => id),
    ]);
    const linkedPronunciationEntries = linkRelationships.size
        ? (detail.entry.references ?? [])
              .map((reference, authoredIndex) => ({
                  entry: (detail.references ?? []).find(
                      ({ id }) => id === reference.entryId,
                  ),
                  authoredIndex,
                  position: reference.position ?? authoredIndex,
                  relation: reference.relation,
              }))
              .filter(
                  ({ entry, relation }) =>
                      entry && linkRelationships.has(relation),
              )
              .sort(
                  (left, right) =>
                      left.position - right.position ||
                      left.authoredIndex - right.authoredIndex,
              )
              .map(({ entry }) => entry)
        : [];
    const derivedPronunciationEntries = (detail.entry.references ?? [])
        .slice()
        .sort(
            (left, right) =>
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER),
        )
        .map((reference) =>
            (detail.references ?? []).find(
                ({ id }) => id === reference.entryId,
            ),
        )
        .filter((candidate) => {
            const role = candidate
                ? layerForEntry(schemas, candidate)?.semanticRole
                : undefined;
            return candidate && !["definition", "meaning"].includes(role);
        });
    const linkedPronunciationGroups = Array.from(linkRelationships).flatMap(
        (relation) =>
            (detail.entry.referenceGroups?.[relation] ?? []).map((group) =>
                group
                    .slice()
                    .sort(
                        (left, right) =>
                            (left.position ?? 0) - (right.position ?? 0),
                    )
                    .map(({ entryId }) =>
                        (detail.references ?? []).find(
                            ({ id }) => id === entryId,
                        ),
                    )
                    .filter(Boolean),
            ),
    );
    const pronunciationGroups = distinctPronunciationLabels(
        detail.entry,
        spellingLabels,
    )
        .map((label) => {
            const configuredLinked = linkRelationships.size
                ? linkedPronunciationGroups.length
                    ? resolveGroupedPronunciation(
                          label,
                          linkedPronunciationGroups,
                      )
                    : resolveReferenceAliasComposition(
                          label,
                          linkedPronunciationEntries,
                      )
                : [];
            const referenced = configuredLinked.length
                ? configuredLinked
                : resolveReferenceAliasComposition(
                      label,
                      derivedPronunciationEntries,
                  );
            const linked = referenced.length
                ? referenced
                : resolveLabelComposition(
                      label,
                      detail.entry,
                      schemas,
                      entries,
                  );
            const linkedLabel = linked.map((entry) => entry.label).join("");
            const displayedLinked =
                linked.length &&
                normalizedTitleText(linkedLabel) ===
                    normalizedTitleText(detail.entry.label)
                    ? linked.map((entry) => ({
                          ...entry,
                          label: pronunciationValues(entry)[0] ?? entry.label,
                      }))
                    : linked;
            return { label, linked: displayedLinked };
        })
        .filter(({ label, linked }) => {
            const displayedPronunciation = linked.length
                ? linked.map((entry) => entry.label).join("")
                : label;
            return (
                normalizedTitleText(displayedPronunciation) !==
                normalizedTitleText(detail.entry.label)
            );
        });
    const pronunciationItems = pronunciationGroups.flatMap(
        ({ label, linked }, pronunciationIndex) => [
            ...(pronunciationIndex || spellingItems.length
                ? [{ label: " · " }]
                : []),
            ...(linked.length ? linkedItems(linked) : [{ label }]),
        ],
    );
    const placement = "reading";
    const items = [...spellingItems, ...pronunciationItems].map((item) => ({
        ...item,
        placement,
    }));
    const visibleDefinition = visibleTitleDefinition(
        detail.entry.label,
        layer?.semanticRole,
        titleDefinition,
        sourceDefinition,
    );
    if (visibleDefinition) {
        items.push({
            label: visibleDefinition,
            placement: "definition",
        });
    }
    return items;
}

export function popupTitleItems(references, transformed) {
    if (transformed) return [];
    return references.map((entry) => ({
        label: entry.label,
        actionId: `open-title-reference:${encodeURIComponent(
            JSON.stringify({
                entryId: entry.id,
                transformation: entry.referenceTransformation,
            }),
        )}`,
    }));
}
