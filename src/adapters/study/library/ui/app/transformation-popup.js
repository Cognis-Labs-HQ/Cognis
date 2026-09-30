import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { localizedLabel } from "./presentation.js";
import {
    matchingTransformation,
    transformationPathways,
} from "./transformations.js";

function renderTransformationNodes(nodes, schema, selectedNode) {
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
        return `<ol>${items.map(({ node, index }) => `<li data-library-transform-node="${index}" data-library-transform-parent="${parentIndex}"><button class="btn-neutral${node === selectedNode ? " active" : ""}" type="button" data-library-transform-index="${index}" data-library-transform-pronunciation-value="${escapeHtml(node.pronunciation)}" data-library-transform-definition-value="${escapeHtml(localizedLabel(node.definition, schema.language))}"><span>${escapeHtml(localizedLabel(node.rule.metadata, schema.language) || node.rule.id)}</span><strong>${escapeHtml(node.value)}</strong></button>${branch(index)}</li>`).join("")}</ol>`;
    };
    return branch(0);
}

export function renderTransformationTree(
    entry,
    schema,
    pathway,
    selectedNode = pathway.nodes[0],
) {
    return `<div class="library-transform-tech-tree" data-library-transform-tree data-library-transform-entry="${escapeHtml(entry.id)}"><header><output data-library-transform-output>${escapeHtml(selectedNode.value)}</output><span data-library-transform-pronunciation>${escapeHtml(selectedNode.pronunciation)}</span><span data-library-transform-definition>${escapeHtml(localizedLabel(selectedNode.definition, schema.language))}</span></header>${renderTransformationNodes(pathway.nodes, schema, selectedNode)}</div>`;
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
    const details = titleDetailItems.filter(
        ({ placement }) =>
            placement !== "reading" && placement !== "definition",
    );
    details.unshift({
        label: transformation.node.pronunciation,
        placement: "reading",
    });
    const definition = localizedLabel(
        transformation.node.definition,
        schema.language,
    );
    if (definition)
        details.push({ label: definition, placement: "definition" });
    return {
        title: transformation.node.value,
        titleDetailItems: details,
        body: `${renderTransformationTree(entry, schema, transformation.pathway, transformation.node)}${body}`,
    };
}

export async function openTransformationPopup(entry, schema, i18n) {
    const pathways = transformationPathways(entry, schema);
    if (!pathways.length) return null;
    let selected = null;
    const result = await openPopup({
        title: entry.label,
        body: pathways
            .map(
                (pathway, index) =>
                    `<section data-library-transform-set="${index}">${renderTransformationTree(entry, schema, pathway)}</section>`,
            )
            .join(""),
        actions: [
            {
                id: "select",
                label: i18n.t("ui.reuse.confirm"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen(overlay) {
            overlay.addEventListener("click", (event) => {
                const control = event.target.closest(
                    "[data-library-transform-index]",
                );
                if (!control) return;
                const section = control.closest("[data-library-transform-set]");
                const pathway =
                    pathways[Number(section.dataset.libraryTransformSet)];
                selected = {
                    set: pathway.set,
                    node: pathway.nodes[
                        Number(control.dataset.libraryTransformIndex)
                    ],
                };
                overlay
                    .querySelectorAll("[data-library-transform-index]")
                    .forEach((candidate) =>
                        candidate.classList.toggle(
                            "active",
                            candidate === control,
                        ),
                    );
                section.querySelector("[data-library-transform-output]").value =
                    selected.node.value;
                section.querySelector(
                    "[data-library-transform-pronunciation]",
                ).textContent = selected.node.pronunciation;
                section.querySelector(
                    "[data-library-transform-definition]",
                ).textContent = localizedLabel(
                    selected.node.definition,
                    schema.language,
                );
            });
        },
        onAction: (action) => action !== "select" || Boolean(selected),
    });
    return result === "select" ? selected : null;
}
