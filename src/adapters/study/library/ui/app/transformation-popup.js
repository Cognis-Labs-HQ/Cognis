import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { localizedLabel } from "./presentation.js";
import {
    matchingTransformation,
    transformedDefinitions,
    transformationPathways,
} from "./transformations.js";
import { resolveLabelComposition } from "./composition-links.js";
import { highlightTransformationPath } from "./transformation-interactions.js";

function renderTransformationNodes(
    nodes,
    schema,
    selectedNode,
    baseDefinitions,
) {
    const levels = new Map();
    nodes.forEach((node, index) => {
        const level = levels.get(node.depth) ?? [];
        level.push({ node, index });
        levels.set(node.depth, level);
    });
    return [...levels.values()]
        .map(
            (items) =>
                `<ol>${items
                    .map(({ node, index }) => {
                        const descriptor = node.rule
                            ? localizedLabel(
                                  node.rule.metadata,
                                  schema.language,
                              ) || node.rule.id
                            : "";
                        const definitions = transformedDefinitions(
                            baseDefinitions,
                            node,
                            schema.language,
                        );
                        const selectable = node.depth > 0;
                        return `<li class="${selectable ? "" : "library-transform-root"}" data-library-transform-node="${index}"${node.parent === undefined ? "" : ` data-library-transform-parent="${node.parent}"`}><button class="btn-neutral${node === selectedNode ? " active" : ""}" type="button"${selectable ? ` data-library-transform-index="${index}"` : ""}><strong>${escapeHtml(node.value)}</strong>${descriptor ? `<span class="library-transform-info" aria-label="${escapeHtml(descriptor)}">i<span role="tooltip">${escapeHtml(descriptor)}</span></span>` : ""}</button><div class="library-transform-definitions">${definitions.map((definition) => `<p class="library-transform-definition">${escapeHtml(definition)}</p>`).join("")}</div></li>`;
                    })
                    .join("")}</ol>`,
        )
        .join("");
}

export function renderTransformationTree(
    entry,
    schema,
    pathway,
    selectedNode = pathway.nodes[0],
    { showSummary = true, baseDefinitions = [] } = {},
) {
    const summary = showSummary
        ? `<header><output data-library-transform-output>${escapeHtml(selectedNode.value)}</output><span data-library-transform-pronunciation>${escapeHtml(selectedNode.pronunciation)}</span><span data-library-transform-definition>${escapeHtml(localizedLabel(selectedNode.definition, schema.language))}</span></header>`
        : "";
    return `<div class="library-transform-tech-tree"><div class="library-transform-graph" data-library-transform-tree data-library-transform-entry="${escapeHtml(entry.id)}">${summary}<svg class="library-transform-links" aria-hidden="true"></svg>${renderTransformationNodes(pathway.nodes, schema, selectedNode, baseDefinitions)}</div></div>`;
}

export function sourceTransformation(entry, schema, sourceLabel) {
    if (!entry) return null;
    const match = matchingTransformation(entry, schema, sourceLabel);
    if (!match) return null;
    const pathway = transformationPathways(entry, schema).find(
        ({ set }) => set.id === match.set.id,
    );
    return pathway ? { ...match, pathway } : null;
}

export function transformedPopupPresentation(
    transformation,
    entry,
    schema,
    titleDetailItems,
    body,
    definitions = [],
    schemas = [],
    entries = [],
) {
    if (!transformation)
        return { title: entry.label, titleDetailItems, body, definitions };
    const details = titleDetailItems.filter(
        ({ placement }) =>
            placement !== "reading" && placement !== "definition",
    );
    const pronunciation = transformation.node.pronunciation;
    const readingReferences = resolveLabelComposition(
        pronunciation,
        entry,
        schemas,
        entries,
    );
    details.unshift(
        ...(readingReferences.length
            ? readingReferences.map((reference) => ({
                  label: reference.label,
                  actionId: `open-title-reference:${reference.id}`,
                  placement: "reading",
              }))
            : [{ label: pronunciation, placement: "reading" }]),
    );
    const changedDefinitions = transformedDefinitions(
        definitions,
        transformation.node,
        schema.language,
    );
    if (changedDefinitions[0])
        details.push({ label: changedDefinitions[0], placement: "definition" });
    return {
        title: transformation.node.value,
        titleDetailItems: details,
        body,
        definitions: changedDefinitions,
    };
}

function drawTransformationLinks(tree) {
    const svg = tree.querySelector(".library-transform-links");
    if (!svg) return;
    const bounds = tree.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${tree.scrollWidth} ${tree.scrollHeight}`);
    svg.innerHTML = "";
    for (const item of tree.querySelectorAll("[data-library-transform-node]")) {
        if (!item.hasAttribute("data-library-transform-parent")) continue;
        const target = item.querySelector(":scope > button");
        const parent = tree.querySelector(
            `[data-library-transform-node="${item.dataset.libraryTransformParent}"] > button`,
        );
        const end = target.getBoundingClientRect();
        const start = parent?.getBoundingClientRect();
        const startItem = parent
            ?.closest("[data-library-transform-node]")
            ?.getBoundingClientRect();
        const startX = start
            ? start.left + start.width / 2 - bounds.left
            : tree.scrollWidth / 2;
        const startY = startItem ? startItem.bottom - bounds.top : 0;
        const endX = end.left + end.width / 2 - bounds.left;
        const endY = end.top - bounds.top;
        const midpointY = startY + (endY - startY) / 2;
        const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
        );
        path.setAttribute(
            "d",
            `M ${startX} ${startY} C ${startX} ${midpointY}, ${endX} ${midpointY}, ${endX} ${endY}`,
        );
        if (item.classList.contains("library-transform-path-active"))
            path.classList.add("active");
        svg.append(path);
    }
}

function selectedTransformation(overlay, pathways) {
    const control = overlay.querySelector(
        "[data-library-transform-index].active",
    );
    if (!control) return null;
    const section = control.closest("[data-library-transform-set]");
    const pathway = pathways[Number(section.dataset.libraryTransformSet)];
    return {
        set: pathway.set,
        node: pathway.nodes[Number(control.dataset.libraryTransformIndex)],
        pathway,
    };
}

function bindTransformationSelection(overlay) {
    overlay.addEventListener("click", (event) => {
        const control = event.target.closest("[data-library-transform-index]");
        if (!control) return;
        overlay
            .querySelectorAll("[data-library-transform-index]")
            .forEach((candidate) =>
                candidate.classList.toggle("active", candidate === control),
            );
        const tree = control.closest("[data-library-transform-tree]");
        if (tree) {
            highlightTransformationPath(tree, control);
            drawTransformationLinks(tree);
        }
        const select = overlay.querySelector('[data-popup-action="select"]');
        if (select) select.disabled = false;
    });
}

export async function openTransformationTreePopup(
    entry,
    schema,
    i18n,
    baseDefinitions,
) {
    const pathways = transformationPathways(entry, schema);
    if (!pathways.length) return null;
    let overlay;
    const result = await openPopup({
        title: entry.label,
        body: pathways
            .map(
                (pathway, index) =>
                    `<section data-library-transform-set="${index}">${renderTransformationTree(entry, schema, pathway, undefined, { showSummary: false, baseDefinitions })}</section>`,
            )
            .join(""),
        maxWidth: "min(94rem, 96vw)",
        actions: [
            {
                id: "select",
                label: i18n.t("gateway.study.library_select_transform"),
                variant: "confirm",
                disabled: true,
            },
        ],
        onOpen(value) {
            overlay = value;
            bindTransformationSelection(overlay);
            requestAnimationFrame(() => {
                overlay
                    .querySelectorAll("[data-library-transform-tree]")
                    .forEach(drawTransformationLinks);
            });
        },
        onAction: (action) =>
            action !== "select" ||
            Boolean(selectedTransformation(overlay, pathways)),
    });
    return result === "select"
        ? selectedTransformation(overlay, pathways)
        : null;
}

export function renderTransformationOptions(
    pathways,
    schema,
    baseDefinitions = [],
) {
    return pathways
        .map((pathway, pathwayIndex) =>
            pathway.nodes
                .slice(1)
                .map((node, nodeOffset) => {
                    const definitions = transformedDefinitions(
                        baseDefinitions,
                        node,
                        schema.language,
                    );
                    return `<button class="library-transform-option btn-neutral" type="button" data-library-transform-set="${pathwayIndex}" data-library-transform-index="${nodeOffset + 1}"><strong>${escapeHtml(node.value)}</strong>${node.pronunciation && node.pronunciation !== node.value ? `<span>${escapeHtml(node.pronunciation)}</span>` : ""}<span class="library-transform-option-definitions">${definitions.map((definition) => `<span>${escapeHtml(definition)}</span>`).join("")}</span></button>`;
                })
                .join(""),
        )
        .join("");
}

export async function openTransformationPopup(
    entry,
    schema,
    i18n,
    baseDefinitions = [],
) {
    const pathways = transformationPathways(entry, schema);
    if (!pathways.length) return null;
    let overlay;
    const result = await openPopup({
        title: i18n
            .t("gateway.study.library_transform_title")
            .replace("{{ verb }}", entry.label),
        body: `<p class="library-transform-prompt">${escapeHtml(
            i18n
                .t("gateway.study.library_transform_prompt")
                .replace("{{ verb }}", entry.label),
        )}</p><div class="library-transform-options">${renderTransformationOptions(pathways, schema, baseDefinitions)}</div>`,
        actions: [
            {
                id: "select",
                label: i18n.t("gateway.study.library_select_transform"),
                variant: "confirm",
                disabled: true,
            },
            {
                id: "base",
                label: i18n
                    .t("gateway.study.library_use_base_transform")
                    .replace("{{ verb }}", entry.label),
                variant: "confirm",
            },
        ],
        onOpen(value) {
            overlay = value;
            bindTransformationSelection(overlay);
        },
        onAction: (action) =>
            action !== "select" ||
            Boolean(selectedTransformation(overlay, pathways)),
    });
    if (result === "base") return { base: true };
    return result === "select"
        ? selectedTransformation(overlay, pathways)
        : null;
}
