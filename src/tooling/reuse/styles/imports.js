export function stylesheetImportIssues(source) {
    const imports = [
        ...source.matchAll(
            /^@import\s+(?:url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\s*\)|"[^"]*"|'[^']*')[^;\n]*;/gm,
        ),
    ];
    if ((source.match(/^@import\b/gm) ?? []).length !== imports.length)
        return ["Use complete, parseable @import statements"];
    if (!imports.length) return [];
    const issues = [];
    const first = imports[0].index;
    const last = imports.at(-1);
    const end = last.index + last[0].length;
    const block = imports.map((match) => match[0]).join("\n");
    if (source.slice(first, end) !== block)
        issues.push(
            "Keep @import statements in one contiguous block without blank lines",
        );
    const targets = imports.map(
        (match) =>
            match[0].match(/(?:url\(\s*)?["']([^"']+)["']/)?.[1] ?? match[0],
    );
    const sorted = [...targets].sort();
    if (JSON.stringify(targets) !== JSON.stringify(sorted))
        issues.push("Sort @import targets alphabetically");
    if (new Set(targets).size !== targets.length)
        issues.push("Do not duplicate @import targets");
    if (source.slice(end).trim() && !source.slice(end).startsWith("\n\n"))
        issues.push("Use one blank line after the @import block");
    if (source.slice(end).startsWith("\n\n\n"))
        issues.push("Use only one blank line after the @import block");
    if (
        source.slice(0, first).trim() &&
        !/^@charset\s+[^;]+;\s*$/.test(source.slice(0, first))
    )
        issues.push("Place imports before style rules");
    return issues;
}
