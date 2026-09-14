/**
 * Renders structured document-version differences with git-style semantics.
 *
 * Public exports:
 *   renderDocumentDiff(diff) — renders escaped line changes with a change overview.
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

let diffInstance = 0;

function renderRow(type, oldLine, newLine, prefix, content, id) {
    return `<div id="${id}" class="document-diff-line document-diff-line--${type}" data-document-diff-line="${type}"><span class="document-diff-line-number">${renderLineNumber(oldLine)}</span><span class="document-diff-line-number">${renderLineNumber(newLine)}</span><span class="document-diff-prefix" aria-hidden="true">${prefix}</span><pre>${escapeHtml(String(content ?? ""))}</pre></div>`;
}

export function renderDocumentDiff(diff) {
    const instanceId = `document-diff-${++diffInstance}`;
    const markers = [];
    const rows = (Array.isArray(diff?.lines) ? diff.lines : []).flatMap(
        (line, lineIndex, lines) => {
            const rowId = `${instanceId}-line-${lineIndex + 1}`;
            const position =
                lines.length <= 1 ? 0 : (lineIndex / (lines.length - 1)) * 100;
            if (line?.type === "changed") {
                markers.push({ type: "changed", rowId, position, label: "±" });
                return [
                    renderRow(
                        "changed-previous",
                        line.oldLine,
                        null,
                        "−",
                        line.oldContent,
                        rowId,
                    ),
                    renderRow(
                        "changed-next",
                        null,
                        line.newLine,
                        "+",
                        line.newContent,
                        `${rowId}-next`,
                    ),
                ];
            }
            const prefixes = { unchanged: " ", added: "+", removed: "−" };
            const type = ["unchanged", "added", "removed"].includes(line?.type)
                ? line.type
                : "unchanged";
            if (type !== "unchanged") {
                markers.push({
                    type,
                    rowId,
                    position,
                    label: type === "added" ? "+" : "−",
                });
            }
            return [
                renderRow(
                    type,
                    line?.oldLine,
                    line?.newLine,
                    prefixes[type],
                    line?.content,
                    rowId,
                ),
            ];
        },
    );
    const overview = markers
        .map(
            ({ type, rowId, position, label }) =>
                `<a class="document-diff-marker document-diff-marker--${type}" href="#${rowId}" style="--document-diff-marker-position:${position.toFixed(3)}%" aria-label="${label}"></a>`,
        )
        .join("");
    return `<div class="document-diff-shell"><div class="document-diff">${rows.join("")}</div><nav class="document-diff-overview" aria-label="±">${overview}</nav></div>`;
}

export const documentDiff = Object.freeze({ renderDocumentDiff });
uiCtx.capabilities.contribute("ui:documentDiff", documentDiff);
