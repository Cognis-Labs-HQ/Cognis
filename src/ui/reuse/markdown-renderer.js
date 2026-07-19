/**
 * Markdown renderer for user/admin generated rich text.
 *
 * Public exports:
 * - renderMarkdown(markdown, options) — converts supported Markdown syntax to sanitized HTML.
 * - initializeMarkdownCodeCopy() — attaches copy-to-clipboard handling for rendered code.
 *
 * Example:
 * ```js
 * element.innerHTML = renderMarkdown('Visit https://cognis.example');
 * ```
 */

import { copyTextToClipboard } from "./clipboard.js";
import { createI18n } from "./i18n.js";
import { showToast } from "./toast.js";

let markdownCodeCopyReady = false;
let markdownCodeCopyI18n = null;

function escapeHtml(value) {
    return String(value)
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
    return href.startsWith("http://") || href.startsWith("https://");
}

function splitTrailingUrlPunctuation(href) {
    const match = String(href).match(/^(.+?)([.,!?;:]*)([)\]}]*)$/);
    if (!match) return { href, suffix: "" };
    const [, candidateHref, punctuation, closers] = match;
    return {
        href: candidateHref,
        suffix: `${punctuation}${closers}`,
    };
}

function renderLinkMarkup(label, href) {
    const safeLabel = escapeHtml(label);
    if (!canLinkToHref(href)) return safeLabel;
    const safeHref = escapeHtmlAttribute(href);
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
}

function renderDetectedUrlMarkup(href) {
    const { href: trimmedHref, suffix } = splitTrailingUrlPunctuation(href);
    return `${renderLinkMarkup(trimmedHref, trimmedHref)}${escapeHtml(suffix)}`;
}

function renderInline(markdown) {
    const codeTokens = [];
    const linkTokens = [];
    let rendered = String(markdown ?? "").replace(
        /`([^`]+)`/g,
        (match, codeText) => {
            const token = `@@CODE_${codeTokens.length}@@`;
            codeTokens.push(renderInlineCodeMarkup(codeText));
            return token;
        },
    );
    rendered = rendered.replace(
        /\[((?:\\.|[^\]])+)\]\(([^)\s]+)\)/g,
        (match, label, href) => {
            const token = `@@LINK_${linkTokens.length}@@`;
            linkTokens.push(renderLinkMarkup(label, href));
            return token;
        },
    );
    rendered = rendered.replace(/https?:\/\/[^\s<>()\[\]{}"']+/gi, (href) => {
        const token = `@@LINK_${linkTokens.length}@@`;
        linkTokens.push(renderDetectedUrlMarkup(href));
        return token;
    });
    rendered = escapeHtml(rendered);
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    rendered = rendered.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    rendered = rendered.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    rendered = rendered.replace(/@@LINK_(\d+)@@/g, (match, index) => {
        const token = linkTokens[Number(index)];
        return token ?? match;
    });
    rendered = rendered.replace(/@@CODE_(\d+)@@/g, (match, index) => {
        const token = codeTokens[Number(index)];
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

const CODE_LANGUAGE_ALIASES = new Map([
    ["js", "javascript"],
    ["mjs", "javascript"],
    ["cjs", "javascript"],
    ["javascript", "javascript"],
    ["node", "javascript"],
    ["ts", "typescript"],
    ["tsx", "typescript"],
    ["typescript", "typescript"],
    ["jsx", "javascript"],
    ["json", "json"],
    ["bash", "bash"],
    ["sh", "bash"],
    ["zsh", "bash"],
    ["shell", "bash"],
    ["python", "python"],
    ["py", "python"],
    ["sql", "sql"],
    ["html", "html"],
    ["xml", "html"],
    ["css", "css"],
]);

function resolveShebangLanguage(firstLine) {
    const shebang = String(firstLine ?? "")
        .trim()
        .toLowerCase();
    if (!shebang.startsWith("#!")) return null;
    if (
        shebang.includes("node") ||
        shebang.includes("deno") ||
        shebang.includes("bun")
    ) {
        return "javascript";
    }
    if (shebang.includes("python")) return "python";
    if (
        shebang.includes("bash") ||
        shebang.includes("sh") ||
        shebang.includes("zsh")
    ) {
        return "bash";
    }
    return null;
}

function resolveCodeLanguage(infoString, codeLines) {
    const rawLanguageToken = String(infoString ?? "")
        .trim()
        .split(/\s+/)[0]
        .toLowerCase();
    if (rawLanguageToken) {
        return CODE_LANGUAGE_ALIASES.get(rawLanguageToken) ?? "plaintext";
    }
    return resolveShebangLanguage(codeLines[0]) ?? "plaintext";
}

const CODE_HIGHLIGHT_KEYWORDS = {
    javascript:
        /\b(await|break|case|catch|class|const|continue|default|else|export|extends|false|finally|for|function|if|import|in|let|new|null|return|switch|throw|true|try|typeof|undefined|var|while|yield)\b/g,
    typescript:
        /\b(abstract|any|as|await|boolean|break|case|catch|class|const|continue|declare|default|else|enum|export|extends|false|finally|for|function|if|implements|import|in|infer|interface|keyof|let|module|namespace|new|null|number|private|protected|public|readonly|return|satisfies|string|switch|throw|true|try|type|typeof|undefined|var|void|while)\b/g,
    json: /\b(true|false|null)\b/g,
    bash: /\b(case|do|done|elif|else|esac|fi|for|function|if|in|local|return|then|until|while)\b/g,
    python: /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|False|finally|for|from|if|import|in|is|lambda|None|nonlocal|not|or|pass|raise|return|True|try|while|with|yield)\b/g,
    sql: /\b(ALTER|AND|AS|BY|CASE|CREATE|DELETE|DESC|DISTINCT|DROP|ELSE|END|FROM|GROUP|HAVING|IN|INNER|INSERT|INTO|JOIN|LEFT|LIKE|LIMIT|NOT|NULL|ON|OR|ORDER|RIGHT|SELECT|SET|TABLE|THEN|UNION|UPDATE|VALUES|WHEN|WHERE)\b/gi,
    html: /(&lt;\/?[a-zA-Z][^&]*?&gt;)/g,
    css: /\b(@media|@supports|@keyframes|color|background|display|position|padding|margin|border|font|grid|flex|width|height|min|max)\b/g,
};

function highlightCode(code, language) {
    let highlighted = escapeHtml(code);
    const tokenBucket = [];
    const tokenize = (renderedToken) => {
        const token = `@@TOK_${tokenBucket.length}@@`;
        tokenBucket.push(renderedToken);
        return token;
    };
    const wrap = (regex, className) => {
        highlighted = highlighted.replace(regex, (match) =>
            tokenize(
                `<span class="markdown-token ${className}">${match}</span>`,
            ),
        );
    };

    if (language === "javascript" || language === "typescript") {
        wrap(/\/\*[\s\S]*?\*\//g, "markdown-token--comment");
        wrap(/\/\/[^\n]*/g, "markdown-token--comment");
    } else if (language === "python" || language === "bash") {
        wrap(/#[^\n]*/g, "markdown-token--comment");
    } else if (language === "sql") {
        wrap(/--[^\n]*/g, "markdown-token--comment");
    } else if (language === "css") {
        wrap(/\/\*[\s\S]*?\*\//g, "markdown-token--comment");
    }

    wrap(
        /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g,
        "markdown-token--string",
    );
    wrap(/\b\d+(?:\.\d+)?\b/g, "markdown-token--number");
    const keywordRegex = CODE_HIGHLIGHT_KEYWORDS[language];
    if (keywordRegex) {
        wrap(keywordRegex, "markdown-token--keyword");
    }

    return highlighted.replace(/@@TOK_(\d+)@@/g, (match, index) => {
        const token = tokenBucket[Number(index)];
        return token ?? match;
    });
}

function renderMarkdownCopyButtonMarkup(copyValue) {
    const safeCopyValue = escapeHtmlAttribute(copyValue);
    return `<button class="markdown-code-copy popup-action-btn" data-markdown-code-copy="${safeCopyValue}" data-popup-action="copy" type="button" aria-label="Copy"></button>`;
}

function renderInlineCodeMarkup(codeText) {
    return `<span class="markdown-code-inline"><code>${escapeHtml(codeText)}</code>${renderMarkdownCopyButtonMarkup(codeText)}</span>`;
}

function renderCodeBlockMarkup(infoString, codeLines) {
    const normalizedLines = [...codeLines];
    while (
        normalizedLines.length > 0 &&
        !String(normalizedLines[0] ?? "").trim()
    ) {
        normalizedLines.shift();
    }
    while (
        normalizedLines.length > 0 &&
        !String(normalizedLines[normalizedLines.length - 1] ?? "").trim()
    ) {
        normalizedLines.pop();
    }
    const code = normalizedLines.join("\n");
    const language = resolveCodeLanguage(infoString, normalizedLines);
    const highlighted = highlightCode(code, language);
    const safeLanguage = escapeHtmlAttribute(language);
    return `<pre class="markdown-code-block"><code class="markdown-code language-${safeLanguage}" data-language="${safeLanguage}">${highlighted}</code>${renderMarkdownCopyButtonMarkup(code)}</pre>`;
}

function isListItem(line) {
    return /^([-+]|\d+\.)\s+/.test(line.trimStart());
}

function listTypeOfLine(line) {
    return /^\d+\.\s+/.test(line.trimStart()) ? "ol" : "ul";
}

function stripListPrefix(line) {
    return line.trimStart().replace(/^([-+]|\d+\.)\s+/, "");
}

function lineStartsBlock(line) {
    const trimmedLine = line.trim();
    return (
        trimmedLine.startsWith("```") ||
        trimmedLine.startsWith("#") ||
        trimmedLine.startsWith(">") ||
        isListItem(trimmedLine) ||
        trimmedLine.startsWith("|")
    );
}

/**
 * Attaches delegated copy-to-clipboard behavior for Markdown code controls.
 *
 * @returns {void}
 */
export function initializeMarkdownCodeCopy() {
    if (markdownCodeCopyReady) return;
    if (typeof document === "undefined") return;
    markdownCodeCopyReady = true;
    markdownCodeCopyI18n = createI18n().catch(() => ({
        t(key) {
            const labels = {
                "ui.reuse.copy": "Copy",
                "ui.reuse.markdown_code_copied": "Code copied to clipboard.",
                "ui.reuse.markdown_code_copy_failed": "Could not copy code.",
            };
            return labels[key] ?? key;
        },
    }));

    document.addEventListener("click", async (event) => {
        const copyButton = event.target?.closest?.("[data-markdown-code-copy]");
        if (!copyButton) return;
        event.preventDefault();
        const i18n = await markdownCodeCopyI18n;
        copyButton.setAttribute("aria-label", i18n.t("ui.reuse.copy"));
        const copied = await copyTextToClipboard(
            copyButton.getAttribute("data-markdown-code-copy") ?? "",
        );
        if (copied) {
            copyButton.classList.add("popup-action-btn--copied");
            setTimeout(() => {
                copyButton.classList.remove("popup-action-btn--copied");
            }, 1500);
        }
        showToast(
            i18n.t(
                copied
                    ? "ui.reuse.markdown_code_copied"
                    : "ui.reuse.markdown_code_copy_failed",
            ),
            { variant: copied ? "success" : "error" },
        );
    });
}

initializeMarkdownCodeCopy();

/**
 * Renders a Markdown string to a sanitized HTML string.
 * Supports headings, emphasis, inline code, links, fenced code blocks with
 * shebang language detection + syntax highlighting, lists, tables, blockquotes,
 * and paragraph normalization.
 *
 * @param {string} markdown
 * @param {{ softBreaks?: boolean }} [options] Options object. When softBreaks
 *   is true, single line breaks within paragraphs are preserved as <br> tags
 *   instead of being normalized to spaces.
 * @returns {string}
 */
export function renderMarkdown(markdown, options = {}) {
    const { softBreaks = false } = options;
    const lines = String(markdown ?? "")
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .split("\n")
        .map((line) => line.trimEnd());
    const html = [];
    let listType = null;
    let tableOpen = false;

    const closeList = () => {
        if (!listType) return;
        html.push(`</${listType}>`);
        listType = null;
    };
    const closeTable = () => {
        if (!tableOpen) return;
        html.push("</tbody></table>");
        tableOpen = false;
    };

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith("```")) {
            closeList();
            closeTable();
            const infoString = trimmedLine.slice(3).trim();
            const codeLines = [];
            for (index += 1; index < lines.length; index += 1) {
                const codeLine = lines[index] ?? "";
                if (codeLine.trim().startsWith("```")) break;
                codeLines.push(codeLine);
            }
            html.push(renderCodeBlockMarkup(infoString, codeLines));
            continue;
        }

        if (!trimmedLine) {
            closeList();
            closeTable();
            continue;
        }

        const nextLine = (lines[index + 1] ?? "").trim();
        if (trimmedLine.includes("|") && isTableSeparator(nextLine)) {
            closeList();
            closeTable();
            const headers = parseTableRow(trimmedLine);
            html.push("<table><thead><tr>");
            headers.forEach((header) => html.push(`<th>${header}</th>`));
            html.push("</tr></thead><tbody>");
            tableOpen = true;
            index += 1;
            continue;
        }

        if (tableOpen && trimmedLine.includes("|")) {
            const cells = parseTableRow(trimmedLine);
            html.push("<tr>");
            cells.forEach((cell) => html.push(`<td>${cell}</td>`));
            html.push("</tr>");
            continue;
        }

        closeTable();

        if (isListItem(trimmedLine)) {
            const nextListType = listTypeOfLine(trimmedLine);
            if (listType !== nextListType) {
                closeList();
                listType = nextListType;
                html.push(`<${listType}>`);
            }
            html.push(`<li>${renderInline(stripListPrefix(trimmedLine))}</li>`);
            continue;
        }

        closeList();

        if (trimmedLine.startsWith(">")) {
            const blockQuoteLines = [];
            while (index < lines.length) {
                const blockQuoteLine = lines[index] ?? "";
                const blockQuoteTrimmed = blockQuoteLine.trim();
                if (!blockQuoteTrimmed.startsWith(">")) break;
                blockQuoteLines.push(
                    blockQuoteTrimmed.replace(/^>\s?/, "").trimEnd(),
                );
                index += 1;
            }
            index -= 1;
            html.push(
                `<blockquote>${renderMarkdown(blockQuoteLines.join("\n"))}</blockquote>`,
            );
            continue;
        }

        if (trimmedLine.startsWith("###### ")) {
            html.push(`<h6>${renderInline(trimmedLine.slice(7))}</h6>`);
            continue;
        }
        if (trimmedLine.startsWith("##### ")) {
            html.push(`<h5>${renderInline(trimmedLine.slice(6))}</h5>`);
            continue;
        }
        if (trimmedLine.startsWith("#### ")) {
            html.push(`<h4>${renderInline(trimmedLine.slice(5))}</h4>`);
            continue;
        }
        if (trimmedLine.startsWith("### ")) {
            html.push(`<h3>${renderInline(trimmedLine.slice(4))}</h3>`);
            continue;
        }
        if (trimmedLine.startsWith("## ")) {
            html.push(`<h2>${renderInline(trimmedLine.slice(3))}</h2>`);
            continue;
        }
        if (trimmedLine.startsWith("# ")) {
            html.push(`<h1>${renderInline(trimmedLine.slice(2))}</h1>`);
            continue;
        }

        const paragraphLines = [trimmedLine];
        while (index + 1 < lines.length) {
            const nextParagraphLine = lines[index + 1] ?? "";
            if (!nextParagraphLine.trim()) break;
            if (lineStartsBlock(nextParagraphLine)) break;
            paragraphLines.push(nextParagraphLine.trim());
            index += 1;
        }
        if (softBreaks && paragraphLines.length > 1) {
            html.push(
                `<p>${paragraphLines.map((paragraphLine) => renderInline(paragraphLine)).join("<br>")}</p>`,
            );
        } else {
            html.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
        }
    }

    closeList();
    closeTable();
    return html.join("\n");
}
