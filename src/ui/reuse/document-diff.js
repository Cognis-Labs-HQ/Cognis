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

function annotatedMarkdownLine(content, annotationId) {
    const source = String(content ?? "");
    const prefix =
        source.match(/^(#{1,6}\s+|>\s?|[-+]\s+|\d+[.)]\s+)/)?.[0] ?? "";
    return `${prefix}COGNISDIFFSTART${annotationId}TOKEN${source.slice(prefix.length)}COGNISDIFFEND${annotationId}TOKEN`;
}

function applyMarkdownAnnotations(html, annotations) {
    return annotations.reduce((rendered, { id, type, token }) => {
        const start = `COGNISDIFFSTART${token}TOKEN`;
        const end = `COGNISDIFFEND${token}TOKEN`;
        return rendered
            .replace(
                start,
                `<span id="${id}" class="document-diff-markdown-overlay document-diff-markdown-overlay--${type}" data-document-diff-line="${type}">`,
            )
            .replace(end, "</span>");
    }, html);
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
    const annotations = [];
    const markdownLines = [];
    const appendLine = (type, content, lineIndex) => {
        if (type === "unchanged") {
            markdownLines.push(String(content ?? ""));
            return;
        }
        const token = String(annotations.length + 1);
        const id = `${instanceId}-change-${token}`;
        annotations.push({ id, type, token });
        markdownLines.push(annotatedMarkdownLine(content, token));
        if (type === "changed-next") return;
        const markerType = type.startsWith("changed") ? "changed" : type;
        markers.push({
            type: markerType,
            rowId: id,
            position: markerPosition(lineIndex, lines.length),
            label:
                markerType === "added"
                    ? "+"
                    : markerType === "removed"
                      ? "−"
                      : "±",
        });
    };
    lines.forEach((line, lineIndex) => {
        const type = ["unchanged", "added", "removed", "changed"].includes(
            line?.type,
        )
            ? line.type
            : "unchanged";
        if (type === "changed") {
            appendLine("changed-previous", line.oldContent, lineIndex);
            appendLine("changed-next", line.newContent, lineIndex);
            return;
        }
        appendLine(type, line.content, lineIndex);
    });
    const renderedMarkdown = applyMarkdownAnnotations(
        renderMarkdown(markdownLines.join("\n")),
        annotations,
    );
    return `<div class="document-diff-shell document-diff-shell--markdown"><article class="document-diff-markdown">${renderedMarkdown}</article><nav class="document-diff-overview" aria-label="±">${renderOverview(markers)}</nav></div>`;
}

export const documentDiff = Object.freeze({
    renderDocumentDiff,
    renderMarkdownDocumentDiff,
});
uiCtx.capabilities.contribute("ui:documentDiff", documentDiff);
