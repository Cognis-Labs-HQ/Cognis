/**
 * Renders structured document-version differences with git-style semantics.
 *
 * Public exports:
 *   renderDocumentDiff(diff) — renders escaped line changes as accessible HTML.
 *   documentDiff — ctx capability exposing the document diff renderer.
 *
 * Usage:
 *   const { renderDocumentDiff } = uiCtx.capabilities.get('ui:documentDiff');
 *   container.innerHTML = renderDocumentDiff(await response.json().then(({ data }) => data));
 *
 * @param {{ lines?: Array<{type: 'unchanged'|'added'|'removed'|'changed', content?: string, oldContent?: string, newContent?: string, oldLine?: number|null, newLine?: number|null}> }} diff
 * @returns {string} Escaped document-diff HTML.
 */

import { escapeHtml } from "./escape-html.js";
import { uiCtx } from "./ui-ctx.js";

function renderLineNumber(value) {
    return value == null ? "" : escapeHtml(String(value));
}

function renderRow(type, oldLine, newLine, prefix, content) {
    return `<div class="document-diff-line document-diff-line--${type}" data-document-diff-line="${type}"><span class="document-diff-line-number">${renderLineNumber(oldLine)}</span><span class="document-diff-line-number">${renderLineNumber(newLine)}</span><span class="document-diff-prefix" aria-hidden="true">${prefix}</span><pre>${escapeHtml(String(content ?? ""))}</pre></div>`;
}

export function renderDocumentDiff(diff) {
    const rows = (Array.isArray(diff?.lines) ? diff.lines : []).flatMap(
        (line) => {
            if (line?.type === "changed") {
                return [
                    renderRow(
                        "changed-previous",
                        line.oldLine,
                        null,
                        "−",
                        line.oldContent,
                    ),
                    renderRow(
                        "changed-next",
                        null,
                        line.newLine,
                        "+",
                        line.newContent,
                    ),
                ];
            }
            const prefixes = { unchanged: " ", added: "+", removed: "−" };
            const type = ["unchanged", "added", "removed"].includes(line?.type)
                ? line.type
                : "unchanged";
            return [
                renderRow(
                    type,
                    line?.oldLine,
                    line?.newLine,
                    prefixes[type],
                    line?.content,
                ),
            ];
        },
    );
    return `<div class="document-diff">${rows.join("")}</div>`;
}

export const documentDiff = Object.freeze({ renderDocumentDiff });
uiCtx.capabilities.contribute("ui:documentDiff", documentDiff);
