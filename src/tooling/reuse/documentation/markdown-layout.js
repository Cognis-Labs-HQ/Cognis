export function markdownLayout(markdown) {
    const issues = [];
    let fence = "";
    let comment = false;
    let hasCode = false;
    let codeStart = 0;
    const lines = [];
    for (let line of markdown.split("\n")) {
        if (!fence) {
            let visible = "";
            for (let index = 0; index < line.length; index++) {
                const inline =
                    !comment && line[index] === "`"
                        ? line
                              .slice(index)
                              .match(/^(`+)(?!`)(.*?)(?<!`)\1(?!`)/)
                        : null;
                if (inline) {
                    visible += inline[0];
                    index += inline[0].length - 1;
                    continue;
                }
                if (!comment && line.startsWith("<!--", index)) {
                    comment = true;
                    index += 3;
                } else if (comment && line.startsWith("-->", index)) {
                    comment = false;
                    index += 2;
                } else if (!comment) {
                    if (/^<h[1-6]\b/i.test(line.slice(index)))
                        issues.push("Use unindented ATX headings");
                    visible += line[index];
                }
            }
            line = visible;
        }
        const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
        if (fence) {
            if (
                marker &&
                marker[1][0] === fence[0] &&
                marker[1].length >= fence.length &&
                !marker[2].trim()
            )
                fence = "";
            else if (line.trim()) lines[codeStart] = "Code example";
            lines.push("");
            continue;
        }
        if (marker) {
            fence = marker[1];
            hasCode = true;
            codeStart = lines.length;
            lines.push("");
            continue;
        }
        if (/^(?: {4}|\t)/.test(line) && line.trim()) {
            hasCode = true;
            lines.push("Code example");
            continue;
        }
        if (/^ {1,3}#{1,6}\s/.test(line))
            issues.push("Use unindented ATX headings");
        lines.push(line);
    }
    if (fence) issues.push("Unclosed code fence");
    if (comment) issues.push("Unclosed HTML comment");
    for (let index = 0; index < lines.length; index++) {
        if (
            /^ {0,3}(?:=+|-+)\s*$/.test(lines[index]) &&
            lines[index - 1]?.trim()
        )
            issues.push("Use ATX headings instead of Setext headings");
        if (!/^#{1,6}\s+/.test(lines[index])) continue;
        if ((index > 0 && lines[index - 1].trim()) || lines[index + 1]?.trim())
            issues.push("Separate headings from content with blank lines");
    }
    return { prose: lines.join("\n"), issues, hasCode };
}
