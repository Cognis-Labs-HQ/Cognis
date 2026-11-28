import { createScanner, SyntaxKind } from "typescript/unstable/ast";

const REGULAR_EXPRESSION_PREFIXES = new Set([
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

export function sourceTokens(source) {
    const scanner = createScanner(true, undefined, source);
    const values = [];
    const templates = [];
    let kind;
    while ((kind = scanner.scan()) !== SyntaxKind.EndOfFile) {
        if (
            kind === SyntaxKind.SlashToken &&
            (!values.length ||
                REGULAR_EXPRESSION_PREFIXES.has(values.at(-1).text))
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
