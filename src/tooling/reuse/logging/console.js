import { readFileSync, existsSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { createScanner, SyntaxKind } from "typescript/unstable/ast";
import { sourceFiles } from "../component-files.js";

const OUTPUT_OWNERS = new Set([
    "src/gateways/logging/logger.ts",
    "src/gateways/logging/ui/console.js",
]);
const CODE_EXTENSIONS = new Set([".js", ".ts", ".mjs", ".cjs", ".jsx", ".tsx"]);
const GLOBALS = new Set(["globalThis", "window", "self", "global"]);
const REGEX_PREFIXES = new Set([
    "=",
    "(",
    "[",
    ",",
    ":",
    "return",
    "=>",
    "!",
    "&&",
    "||",
    "??",
    ";",
    "{",
]);

function tokens(source) {
    const scanner = createScanner(true, undefined, source);
    const values = [];
    const templates = [];
    let kind;
    while ((kind = scanner.scan()) !== SyntaxKind.EndOfFile) {
        if (
            kind === SyntaxKind.SlashToken &&
            (!values.length || REGEX_PREFIXES.has(values.at(-1).text))
        )
            kind = scanner.reScanSlashToken();
        if (kind === SyntaxKind.TemplateHead) templates.push(0);
        else if (kind === SyntaxKind.OpenBraceToken && templates.length)
            templates[templates.length - 1]++;
        else if (kind === SyntaxKind.CloseBraceToken && templates.length) {
            if (templates.at(-1) === 0) {
                kind = scanner.reScanTemplateToken(false);
                if (kind === SyntaxKind.TemplateTail) templates.pop();
            } else templates[templates.length - 1]--;
        }
        values.push({
            kind,
            text:
                kind === SyntaxKind.Identifier
                    ? scanner.getTokenValue()
                    : scanner.getTokenText(),
            value: scanner.getTokenValue(),
            offset: scanner.getTokenStart(),
        });
    }
    return values;
}

/** Find native console references, including aliases, computed access and imports. */
export function consoleReferences(source) {
    const values = tokens(source);
    return values.flatMap((token, index) => {
        const previous = values[index - 1];
        const next = values[index + 1];
        let forbidden = false;
        if (token.kind === SyntaxKind.Identifier && token.text === "console") {
            const property = previous?.text === "." || previous?.text === "?.";
            forbidden = property
                ? GLOBALS.has(values[index - 2]?.text)
                : next?.text !== ":";
            if (next?.text === ":") {
                const close = values.findIndex(
                    (entry, candidate) =>
                        candidate > index && entry.text === "}",
                );
                forbidden =
                    close > index &&
                    values[close + 1]?.text === "=" &&
                    GLOBALS.has(values[close + 2]?.text);
            }
        }
        if (
            token.kind === SyntaxKind.StringLiteral ||
            token.kind === SyntaxKind.NoSubstitutionTemplateLiteral
        ) {
            if (token.value === "console" && previous?.text === "[")
                forbidden =
                    GLOBALS.has(values[index - 2]?.text) ||
                    (values[index - 2]?.text === "?." &&
                        GLOBALS.has(values[index - 3]?.text));
            if (["console", "node:console"].includes(token.value))
                forbidden ||=
                    previous?.text === "from" ||
                    previous?.text === "import" ||
                    (previous?.text === "(" &&
                        ["require", "import"].includes(
                            values[index - 2]?.text,
                        ));
        }
        return forbidden
            ? [
                  {
                      offset: token.offset,
                      line: source.slice(0, token.offset).split("\n").length,
                  },
              ]
            : [];
    });
}

function codeSections(source, extension) {
    if (extension !== ".html") return [{ source, offset: 0 }];
    const sections = [];
    source = source.replace(/<!--[\s\S]*?-->/g, (comment) =>
        comment.replace(/[^\n]/g, " "),
    );
    for (const match of source.matchAll(
        /<script(?=[\t\n\f\r />])(?:[^"'>]|"[^"]*"|'[^']*')*>([\s\S]*?)(?:<\/script(?=[\t\n\f\r />])(?:[^"'>]|"[^"]*"|'[^']*')*>|$)/gi,
    ))
        sections.push({
            source: match[1],
            offset: match.index + match[0].indexOf(">") + 1,
        });
    for (const match of source.matchAll(/\bon\w+\s*=\s*(["'])([\s\S]*?)\1/gi))
        sections.push({
            source: match[2]
                .replace(/&quot;|&#34;|&#x22;/gi, '"')
                .replace(/&apos;|&#39;|&#x27;/gi, "'"),
            offset: match.index + match[0].indexOf(match[1]) + 1,
        });
    return sections;
}

function isGatewayInitialization(source, offset) {
    const values = tokens(source);
    const start = values.findIndex(
        (entry, index) =>
            entry.text === "function" &&
            values[index + 1]?.text === "bootstrap" &&
            (values[index - 1]?.text === "export" ||
                (values[index - 1]?.text === "async" &&
                    values[index - 2]?.text === "export")),
    );
    if (start < 0) return false;
    let index = start + 2;
    while (index < values.length && values[index]?.text !== "(") index++;
    if (index === values.length) return false;
    let parentheses = 0;
    do {
        if (values[index]?.text === "(") parentheses++;
        if (values[index]?.text === ")") parentheses--;
        index++;
    } while (parentheses && index < values.length);
    while (index < values.length && values[index].text !== "{") index++;
    const body = values[index]?.offset;
    let braces = 0;
    do {
        if (values[index]?.text === "{") braces++;
        if (values[index]?.text === "}") braces--;
        index++;
    } while (braces && index < values.length);
    return (
        body !== undefined &&
        offset > body &&
        offset < (values[index - 1]?.offset ?? 0)
    );
}

/** Scan production sources; terminal reports use streams and test fixtures stay isolated. */
export function consoleLoggingViolations(
    root,
    externalRoot = resolve(root, "external-modules"),
) {
    const roots = [resolve(root, "src"), externalRoot].filter(existsSync);
    const violations = [];
    for (const sourceRoot of roots) {
        for (const file of sourceFiles(sourceRoot)) {
            const path = relative(root, file).replaceAll("\\", "/");
            if (OUTPUT_OWNERS.has(path)) continue;
            const extension = extname(file);
            if (!CODE_EXTENSIONS.has(extension) && extension !== ".html")
                continue;
            const source = readFileSync(file, "utf8");
            for (const section of codeSections(source, extension))
                for (const issue of consoleReferences(section.source)) {
                    if (
                        path === "src/gateways/logging/bootstrap.ts" &&
                        isGatewayInitialization(
                            source,
                            section.offset + issue.offset,
                        )
                    )
                        continue;
                    const line = source
                        .slice(0, section.offset + issue.offset)
                        .split("\n").length;
                    violations.push(`${path}:${line}`);
                }
        }
    }
    return violations;
}
