import { parsers } from "prettier/plugins/babel";

/** Report missing visual boundaries without depending on Git state or formatting a file. */
export function declarationSpacingIssues(source) {
    const ast = parsers["babel-ts"].parse(source);
    const positions = new Set();
    const boundary = (previous, node) => {
        const start = node.leadingComments?.[0]?.start ?? node.start;
        if (!source.slice(previous.end, start).includes("\n\n"))
            positions.add(start);
    };
    const body = ast.program.body;
    for (let index = 1; index < body.length; index += 1) {
        const previous = body[index - 1];
        const node = body[index];
        const current =
            node.type === "ExportNamedDeclaration" ? node.declaration : node;
        const prior =
            previous.type === "ExportNamedDeclaration"
                ? previous.declaration
                : previous;
        if (!current || !prior) continue;
        if (
            /Function|Class|Interface|TypeAlias/.test(current.type) ||
            /Function|Class|Interface|TypeAlias/.test(prior.type) ||
            (prior.type === "ImportDeclaration" &&
                current.type !== "ImportDeclaration")
        )
            boundary(previous, node);
    }
    const visit = (node) => {
        if (node.type === "ClassBody")
            for (let index = 1; index < node.body.length; index += 1) {
                const previous = node.body[index - 1];
                const current = node.body[index];
                if (/Method/.test(current.type) || /Method/.test(previous.type))
                    boundary(previous, current);
            }
        for (const value of Object.values(node)) {
            if (Array.isArray(value))
                value.forEach((child) => {
                    if (child?.type) visit(child);
                });
            else if (value?.type) visit(value);
        }
    };
    visit(ast.program);
    return [...positions].map(
        (position) => source.slice(0, position).split("\n").length,
    );
}
