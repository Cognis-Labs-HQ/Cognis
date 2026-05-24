function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeHtmlAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#96;");
}

function canLinkToHref(href) {
    return (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("/") ||
        href.startsWith("./") ||
        href.startsWith("../") ||
        href.startsWith("#")
    );
}

function renderLinkMarkup(label, href) {
    const safeLabel = escapeHtml(label);
    if (!canLinkToHref(href)) return safeLabel;
    const safeHref = escapeHtmlAttribute(href);
    const isExternal =
        href.startsWith("http://") || href.startsWith("https://");
    if (isExternal) {
        return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
    }
    return `<a href="${safeHref}">${safeLabel}</a>`;
}

function renderInline(markdown) {
    const linkTokens = [];
    let rendered = markdown.replace(
        /\[((?:\\.|[^\]])+)\]\(([^)\s]+)\)/g,
        (match, label, href) => {
            const token = `@@LINK_${linkTokens.length}@@`;
            linkTokens.push(renderLinkMarkup(label, href));
            return token;
        },
    );
    rendered = escapeHtml(rendered);

    rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    rendered = rendered.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    rendered = rendered.replace(/@@LINK_(\d+)@@/g, (match, index) => {
        const token = linkTokens[Number(index)];
        return token ?? match;
    });

    return rendered;
}

function isTableSeparator(line) {
    return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function parseTableRow(line) {
    return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => renderInline(cell.trim()));
}

/**
 * Renders a Markdown string to an HTML string.
 * Supports headings (h1–h3), bold, italic, inline code, fenced code blocks,
 * unordered lists, tables, and links (external links open in a new tab).
 *
 * Usage:
 *   element.innerHTML = renderMarkdown(payload.data.markdown);
 *
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
    const lines = markdown.split("\n");
    const html = [];
    let inCode = false;
    let inList = false;
    let inTable = false;

    for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i];
        const line = raw.trimEnd();

        if (line.startsWith("```")) {
            if (!inCode) {
                if (inList) {
                    html.push("</ul>");
                    inList = false;
                }
                if (inTable) {
                    html.push("</tbody></table>");
                    inTable = false;
                }
                html.push("<pre><code>");
                inCode = true;
            } else {
                html.push("</code></pre>");
                inCode = false;
            }
            continue;
        }

        if (inCode) {
            html.push(`${escapeHtml(raw)}\n`);
            continue;
        }

        const nextLine = lines[i + 1]?.trimEnd() ?? "";
        if (line.includes("|") && isTableSeparator(nextLine)) {
            if (inList) {
                html.push("</ul>");
                inList = false;
            }
            const headers = parseTableRow(line);
            html.push("<table><thead><tr>");
            headers.forEach((header) => html.push(`<th>${header}</th>`));
            html.push("</tr></thead><tbody>");
            inTable = true;
            i += 1;
            continue;
        }

        if (inTable && line.includes("|")) {
            const cells = parseTableRow(line);
            html.push("<tr>");
            cells.forEach((cell) => html.push(`<td>${cell}</td>`));
            html.push("</tr>");
            continue;
        }

        if (inTable && !line.includes("|")) {
            html.push("</tbody></table>");
            inTable = false;
        }

        if (line.startsWith("- ")) {
            if (!inList) {
                html.push("<ul>");
                inList = true;
            }
            html.push(`<li>${renderInline(line.slice(2))}</li>`);
            continue;
        }

        if (inList) {
            html.push("</ul>");
            inList = false;
        }

        if (line.startsWith("### ")) {
            html.push(`<h3>${renderInline(line.slice(4))}</h3>`);
            continue;
        }
        if (line.startsWith("## ")) {
            html.push(`<h2>${renderInline(line.slice(3))}</h2>`);
            continue;
        }
        if (line.startsWith("# ")) {
            html.push(`<h1>${renderInline(line.slice(2))}</h1>`);
            continue;
        }

        if (line.length === 0) {
            html.push("");
        } else {
            html.push(`<p>${renderInline(line)}</p>`);
        }
    }

    if (inList) html.push("</ul>");
    if (inTable) html.push("</tbody></table>");
    if (inCode) html.push("</code></pre>");
    return html.join("\n");
}
