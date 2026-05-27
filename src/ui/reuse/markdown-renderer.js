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
    let rendered = String(markdown ?? "").replace(
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
    rendered = rendered.replace(/~~([^~]+)~~/g, "<del>$1</del>");
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
    return `<pre class="markdown-code-block"><code class="markdown-code language-${safeLanguage}" data-language="${safeLanguage}">${highlighted}</code></pre>`;
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
 * Renders a Markdown string to a sanitized HTML string.
 * Supports headings, emphasis, inline code, links, fenced code blocks with
 * shebang language detection + syntax highlighting, lists, tables, blockquotes,
 * and paragraph normalization.
 *
 * @param {string} markdown
 * @returns {string}
 */
export function renderMarkdown(markdown) {
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
        html.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
    }

    closeList();
    closeTable();
    return html.join("\n");
}
