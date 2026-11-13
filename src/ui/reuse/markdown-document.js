/**
 * Markdown document loader for page-level markdown views.
 *
 * Public exports:
 * - loadMarkdownDocumentHtml(path, options) — fetches markdown JSON payload,
 *   optionally transforms its Markdown, and returns rendered HTML.
 *
 * Usage example:
 *   const html = await loadMarkdownDocumentHtml('/api/v1/system/license');
 *   document.querySelector('#doc').innerHTML = html;
 *
 * @param {string} path API route that returns `{ data: { markdown: string } }`.
 * @param {{ transformMarkdown?: (markdown: string) => string }} [options]
 * Optional Markdown transformation applied before rendering.
 * @returns {Promise<string>} Rendered HTML generated from the markdown payload.
 */
import { apiFetch } from "./api-client.js";
import { renderMarkdown } from "./markdown-renderer.js";

export async function loadMarkdownDocumentHtml(path, options = {}) {
    const response = await apiFetch(path);
    if (!response.ok) {
        throw new Error(`markdown_load_failed:${response.status}`);
    }
    const payload = await response.json();
    const markdown = String(payload?.data?.markdown ?? "");
    const transformedMarkdown = options.transformMarkdown
        ? options.transformMarkdown(markdown)
        : markdown;
    return renderMarkdown(transformedMarkdown);
}
