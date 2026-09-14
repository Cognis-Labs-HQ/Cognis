/**
 * Renders structured document-version differences with git-style semantics.
 *
 * Public exports:
 *   renderDocumentDiff(diff) — renders escaped line changes with a change overview.
 *   renderMarkdownDocumentDiff(diff) — renders a full Markdown document with change overlays.
 *   documentDiff — ctx capability exposing the document diff renderer.
 *
 * Usage:
 *   const { renderDocumentDiff } = uiCtx.capabilities.get('ui:documentDiff');
 *   container.innerHTML = renderDocumentDiff(await response.json().then(({ data }) => data));
 *   article.innerHTML = renderMarkdownDocumentDiff(diff);
 *
 * @param {{ lines?: Array<{type: 'unchanged'|'added'|'removed'|'changed', content?: string, oldContent?: string, newContent?: string, oldLine?: number|null, newLine?: number|null}> }} diff
 * @returns {string} Escaped document-diff HTML.
 */

import { escapeHtml } from "./escape-html.js";
import { renderMarkdown } from "./markdown-renderer.js";
import { uiCtx } from "./ui-ctx.js";

function renderLineNumber(value) {
    return value == null ? "" : escapeHtml(String(value));
}

let diffInstance = 0;

function markerPosition(lineIndex, lineCount) {
    return lineCount <= 1 ? 0 : (lineIndex / (lineCount - 1)) * 100;
}

function renderOverview(markers) {
    return markers
        .map(
            ({ type, rowId, position, label }) =>
                `<a class="document-diff-marker document-diff-marker--${type}" href="#${rowId}" style="--document-diff-marker-position:${position.toFixed(3)}%" aria-label="${label}"></a>`,
        )
        .join("");
}

function renderRow(type, oldLine, newLine, prefix, content, id) {
    return `<div id="${id}" class="document-diff-line document-diff-line--${type}" data-document-diff-line="${type}"><span class="document-diff-line-number">${renderLineNumber(oldLine)}</span><span class="document-diff-line-number">${renderLineNumber(newLine)}</span><span class="document-diff-prefix" aria-hidden="true">${prefix}</span><pre>${escapeHtml(String(content ?? ""))}</pre></div>`;
}

export function renderDocumentDiff(diff) {
    const instanceId = `document-diff-${++diffInstance}`;
    const markers = [];
    const rows = (Array.isArray(diff?.lines) ? diff.lines : []).flatMap(
        (line, lineIndex, lines) => {
            const rowId = `${instanceId}-line-${lineIndex + 1}`;
            const position = markerPosition(lineIndex, lines.length);
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
    const overview = renderOverview(markers);
    return `<div class="document-diff-shell"><div class="document-diff">${rows.join("")}</div><nav class="document-diff-overview" aria-label="±">${overview}</nav></div>`;
}

function renderMarkdownOverlay(type, content, id) {
    return `<section id="${id}" class="document-diff-markdown-overlay document-diff-markdown-overlay--${type}" data-document-diff-line="${type}">${renderMarkdown(String(content ?? ""))}</section>`;
}

/**
 * Renders a structured line diff as a full-size Markdown document. Unchanged
 * content retains normal Markdown presentation while changes receive semantic
 * overlays and overview-rail anchors.
 *
 * @param {{ lines?: Array<{type: 'unchanged'|'added'|'removed'|'changed', content?: string, oldContent?: string, newContent?: string}> }} diff
 * @returns {string} Sanitized rendered Markdown with diff overlays.
 */
export function renderMarkdownDocumentDiff(diff) {
    const instanceId = `document-diff-markdown-${++diffInstance}`;
    const lines = Array.isArray(diff?.lines) ? diff.lines : [];
    const markers = [];
    const segments = [];
    const appendSegment = (type, content, lineIndex) => {
        const previous = segments.at(-1);
        if (previous?.type === type && type !== "changed-previous") {
            previous.content.push(String(content ?? ""));
            return;
        }
        segments.push({ type, content: [String(content ?? "")], lineIndex });
    };
    lines.forEach((line, lineIndex) => {
        const type = ["unchanged", "added", "removed", "changed"].includes(
            line?.type,
        )
            ? line.type
            : "unchanged";
        if (type === "changed") {
            appendSegment("changed-previous", line.oldContent, lineIndex);
            appendSegment("changed-next", line.newContent, lineIndex);
            return;
        }
        appendSegment(type, line.content, lineIndex);
    });
    const overlays = segments.map(
        ({ type, content, lineIndex }, segmentIndex) => {
            const rowId = `${instanceId}-segment-${segmentIndex + 1}`;
            const markerType = type.startsWith("changed") ? "changed" : type;
            if (type !== "unchanged" && type !== "changed-next") {
                markers.push({
                    type: markerType,
                    rowId,
                    position: markerPosition(lineIndex, lines.length),
                    label:
                        markerType === "added"
                            ? "+"
                            : markerType === "removed"
                              ? "−"
                              : "±",
                });
            }
            return renderMarkdownOverlay(type, content.join("\n"), rowId);
        },
    );
    return `<div class="document-diff-shell document-diff-shell--markdown"><article class="document-diff-markdown">${overlays.join("")}</article><nav class="document-diff-overview" aria-label="±">${renderOverview(markers)}</nav></div>`;
}

export const documentDiff = Object.freeze({
    renderDocumentDiff,
    renderMarkdownDocumentDiff,
});
uiCtx.capabilities.contribute("ui:documentDiff", documentDiff);
