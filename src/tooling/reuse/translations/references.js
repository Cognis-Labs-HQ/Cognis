import { SyntaxKind } from "typescript/unstable/ast";
import { sourceTokens } from "../source-tokens.js";

/** Literal translation calls; comments, computed keys and concatenated prefixes are not complete references. */
export function translationReferences(source, { html = false } = {}) {
    if (html) {
        const markup = source.replace(/<!--[\s\S]*?-->/g, (comment) =>
            comment.replace(/[^\n]/g, " "),
        );
        return [
            ...markup.matchAll(
                /\bdata-i18n(?:-alt|-aria-label|-placeholder|-title)?\s*=\s*(["'])([^"']+)\1/g,
            ),
        ]
            .filter((match) => !match[2].includes("${"))
            .map((match) => ({ key: match[2], offset: match.index }));
    }
    const tokens = sourceTokens(source);
    return tokens.flatMap((token, index) => {
        if (
            token.text !== "t" ||
            ![".", "?."].includes(tokens[index - 1]?.text)
        )
            return [];
        let start = index + 1;
        if (tokens[start]?.text === "?.") start++;
        if (tokens[start]?.text !== "(") return [];
        const argument = tokens[start + 1];
        if (
            ![
                SyntaxKind.StringLiteral,
                SyntaxKind.NoSubstitutionTemplateLiteral,
            ].includes(argument?.kind)
        )
            return [];
        if (![")", ","].includes(tokens[start + 2]?.text)) return [];
        return [{ key: argument.value, offset: argument.offset }];
    });
}
