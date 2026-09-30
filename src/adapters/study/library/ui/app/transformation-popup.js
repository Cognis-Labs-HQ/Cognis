import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { localizedLabel } from "./presentation.js";
import {
    matchingTransformation,
    transformedDefinition,
    transformationPathways,
} from "./transformations.js";
import { highlightTransformationPath } from "./transformation-interactions.js";

function renderTransformationNodes(
    nodes,
    schema,
    selectedNode,
    baseDefinition,
) {
    const children = new Map();
    nodes.forEach((node, index) => {
        if (node.parent === undefined) return;
        const siblings = children.get(node.parent) ?? [];
        siblings.push({ node, index });
        children.set(node.parent, siblings);
    });
    const branch = (parentIndex) => {
        const items = children.get(parentIndex) ?? [];
        if (!items.length) return "";
        return `<ol>${items
            .map(({ node, index }) => {
                const descriptor =
                    localizedLabel(node.rule.metadata, schema.language) ||
                    node.rule.id;
                const definition = transformedDefinition(
                    baseDefinition,
                    node,
                    schema.language,
                );
                return `<li data-library-transform-node="${index}" data-library-transform-parent="${parentIndex}">${definition ? `<p class="library-transform-definition">${escapeHtml(definition)}</p>` : ""}<button class="btn-neutral${node === selectedNode ? " active" : ""}" type="button" data-library-transform-index="${index}" data-library-transform-pronunciation-value="${escapeHtml(node.pronunciation)}" data-library-transform-definition-value="${escapeHtml(definition)}"><strong>${escapeHtml(node.value)}</strong><span class="library-transform-info" aria-label="${escapeHtml(descriptor)}">i<span role="tooltip">${escapeHtml(descriptor)}</span></span></button>${branch(index)}</li>`;
            })
            .join("")}</ol>`;
    };
    return branch(0);
}

export function renderTransformationTree(
    entry,
    schema,
    pathway,
    selectedNode = pathway.nodes[0],
    { showSummary = true, baseDefinition = "" } = {},
) {
    const summary = showSummary
        ? `<header><output data-library-transform-output>${escapeHtml(selectedNode.value)}</output><span data-library-transform-pronunciation>${escapeHtml(selectedNode.pronunciation)}</span><span data-library-transform-definition>${escapeHtml(localizedLabel(selectedNode.definition, schema.language))}</span></header>`
        : "";
    return `<div class="library-transform-tech-tree" data-library-transform-tree data-library-transform-entry="${escapeHtml(entry.id)}">${summary}${renderTransformationNodes(pathway.nodes, schema, selectedNode, baseDefinition)}</div>`;
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
) {
    if (!transformation) return { title: entry.label, titleDetailItems, body };
    const baseDefinition = titleDetailItems.find(
        ({ placement }) => placement === "definition",
    )?.label;
    const details = titleDetailItems.filter(
        ({ placement }) =>
            placement !== "reading" && placement !== "definition",
    );
    details.unshift({
        label: transformation.node.pronunciation,
        placement: "reading",
    });
    const definition = transformedDefinition(
        baseDefinition,
        transformation.node,
        schema.language,
    );
    if (definition)
        details.push({ label: definition, placement: "definition" });
    return {
        title: transformation.node.value,
        titleDetailItems: details,
        body,
    };
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
        if (tree) highlightTransformationPath(tree, control);
        const select = overlay.querySelector('[data-popup-action="select"]');
        if (select) select.disabled = false;
    });
}

export async function openTransformationTreePopup(
    entry,
    schema,
    i18n,
    baseDefinition,
) {
    const pathways = transformationPathways(entry, schema);
    if (!pathways.length) return null;
    let overlay;
    const result = await openPopup({
        title: entry.label,
        body: pathways
            .map(
                (pathway, index) =>
                    `<section data-library-transform-set="${index}">${renderTransformationTree(entry, schema, pathway, undefined, { showSummary: false, baseDefinition })}</section>`,
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
        },
        onAction: (action) =>
            action !== "select" ||
            Boolean(selectedTransformation(overlay, pathways)),
    });
    return result === "select"
        ? selectedTransformation(overlay, pathways)
        : null;
}

export async function openTransformationPopup(entry, schema, i18n) {
    const pathways = transformationPathways(entry, schema);
    if (!pathways.length) return null;
    let overlay;
    const result = await openPopup({
        title: i18n
            .t("gateway.study.library_transform_prompt")
            .replace("{{ verb }}", entry.label),
        body: `<hr><div class="library-transform-options">${pathways
            .map((pathway, pathwayIndex) =>
                pathway.nodes
                    .slice(1)
                    .map(
                        (node, nodeOffset) =>
                            `<button class="library-transform-option btn-neutral" type="button" data-library-transform-set="${pathwayIndex}" data-library-transform-index="${nodeOffset + 1}"><strong>${escapeHtml(node.value)}</strong><span>${escapeHtml(node.pronunciation)}</span></button>`,
                    )
                    .join(""),
            )
            .join("")}</div>`,
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
