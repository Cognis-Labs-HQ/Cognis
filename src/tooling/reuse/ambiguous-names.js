/**
 * Inspects JavaScript and TypeScript binding names and static table aliases.
 * Exports ambiguousNameIssues(source), returning name, line, offset and kind for each violation.
 * @example ambiguousNameIssues("export const a = 1;") // [{ name: "a", line: 1, offset: 13, kind: "binding" }]
 */
import { parsers } from "prettier/plugins/typescript";
import abbreviations from "./ambiguous-name-words.json" with { type: "json" };

const LOOP_NAMES = new Set(["i", "j", "k"]);
const ABBREVIATED_WORDS = new Set(Object.keys(abbreviations.words));
const ABBREVIATED_NAMES = new Set(
    Object.keys(abbreviations.names).map((name) => name.toLowerCase()),
);

function isAbbreviated(name) {
    if (ABBREVIATED_NAMES.has(name.toLowerCase())) return true;
    if (
        /^(?:event|value|database|recipient|node|sender|section|pattern|calendar|reject|request|response)\d+$/.test(
            name,
        )
    )
        return true;
    const words =
        name.match(/[A-Z]+(?=[A-Z][a-z]|\d|_|$)|[A-Z]?[a-z]+|\d+/g) ?? [];
    return words.some((word, index) => {
        if (
            word.toLowerCase() === "db" &&
            /^(?:maria|indexed)$/i.test(words[index - 1] ?? "")
        )
            return false;
        const normalized = word.toLowerCase();
        return (
            ABBREVIATED_WORDS.has(normalized) ||
            (normalized.endsWith("s") &&
                ABBREVIATED_WORDS.has(normalized.slice(0, -1)))
        );
    });
}

function hasCounterUpdate(node, name) {
    if (!node || typeof name !== "string") return false;
    if (node.type === "SequenceExpression")
        return node.expressions.some((expression) =>
            hasCounterUpdate(expression, name),
        );
    return (
        (node.type === "UpdateExpression" && node.argument.name === name) ||
        (node.type === "AssignmentExpression" &&
            ["+=", "-="].includes(node.operator) &&
            node.left.name === name &&
            !(
                node.right.type === "Literal" &&
                typeof node.right.value === "string"
            ))
    );
}

/**
 * Checks variables, imports, signature labels and private members independently of formatting.
 * Public data keys, type identities and literal text retain their contract roles.
 * @param {string} source Complete JavaScript or TypeScript source; parse failures propagate.
 * @returns {{name:string,line:number,offset:number,kind:string}[]} Ordered violations with one-based lines.
 */
export function ambiguousNameIssues(source) {
    const ast = parsers.typescript.parse(source);
    const issues = [];
    const definitions = new WeakSet();
    const report = (node, kind) => {
        issues.push({
            name: node.name ?? node.value,
            line: node.loc.start.line,
            offset: node.range[0],
            kind,
        });
    };
    const binding = (node, numericCounter = false, ignoredAllowed = true) => {
        if (!node) return;
        if (node.type === "Identifier") {
            const name = node.name;
            definitions.add(node);
            if (
                (name.length <= 2 || isAbbreviated(name)) &&
                !(name === "_" && ignoredAllowed) &&
                name !== "id" &&
                !(numericCounter && LOOP_NAMES.has(name))
            )
                report(node, "binding");
        } else if (node.type === "ObjectPattern")
            node.properties.forEach((property) =>
                binding(
                    property.value ?? property.argument,
                    numericCounter,
                    ignoredAllowed,
                ),
            );
        else if (node.type === "ArrayPattern")
            node.elements.forEach((element) =>
                binding(element, numericCounter, ignoredAllowed),
            );
        else if (node.type === "AssignmentPattern")
            binding(node.left, numericCounter, ignoredAllowed);
        else if (node.type === "RestElement")
            binding(node.argument, numericCounter, ignoredAllowed);
        else if (node.type === "TSParameterProperty")
            binding(node.parameter, false, false);
    };
    const visit = (node, parent, relation) => {
        if (node.type === "VariableDeclaration")
            for (const declaration of node.declarations)
                binding(
                    declaration.id,
                    parent?.type === "ForStatement" &&
                        parent.init === node &&
                        hasCounterUpdate(parent.update, declaration.id.name) &&
                        !(
                            declaration.init?.type === "Literal" &&
                            typeof declaration.init.value === "string"
                        ),
                    !/^Export/.test(parent?.type ?? ""),
                );
        if (
            /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod|ClassPrivateMethod|TSFunctionType|TSConstructorType|TSMethodSignature|TSCallSignatureDeclaration|TSConstructSignatureDeclaration|TSDeclareFunction|TSEmptyBodyFunctionExpression)$/.test(
                node.type,
            )
        )
            node.params.forEach((parameter) => binding(parameter));
        if (node.type === "CatchClause") binding(node.param);
        if (
            (node.type === "PropertyDefinition" ||
                node.type === "MethodDefinition") &&
            (node.accessibility === "private" ||
                node.key.type === "PrivateIdentifier") &&
            !node.computed &&
            (String(node.key.name ?? node.key.value).length <= 2 ||
                isAbbreviated(String(node.key.name ?? node.key.value)))
        )
            report(node.key, "private member");
        if (
            /^(?:ImportSpecifier|ImportDefaultSpecifier|ImportNamespaceSpecifier)$/.test(
                node.type,
            ) &&
            node.importKind !== "type" &&
            parent?.importKind !== "type"
        )
            binding(node.local);
        if (
            /^(?:FunctionDeclaration|FunctionExpression|ClassDeclaration|ClassExpression)$/.test(
                node.type,
            )
        )
            binding(node.id, false, !/^Export/.test(parent?.type ?? ""));
        if (
            node.type === "Property" &&
            (node.key.name ?? node.key.value) === "alias" &&
            node.value.type === "Literal" &&
            typeof node.value.value === "string" &&
            /^[A-Za-z0-9_]{1,2}$/.test(node.value.value)
        )
            report(node.value, "SQL alias");
        if (
            node.type === "Identifier" &&
            node.name === "_" &&
            !definitions.has(node)
        ) {
            const propertyKey = relation === "key" && !parent?.computed;
            const memberKey = relation === "property" && !parent?.computed;
            const publicLabel =
                relation === "exported" || relation === "imported";
            const typeLabel =
                parent?.type.startsWith("TS") && parent.type !== "TSTypeQuery";
            if (!propertyKey && !memberKey && !publicLabel && !typeLabel)
                report(node, "used ignored binding");
        }
        for (const [key, value] of Object.entries(node)) {
            const descend = (child) => {
                if (child?.type) visit(child, node, key);
            };
            if (Array.isArray(value)) value.forEach(descend);
            else descend(value);
        }
    };
    visit(ast, null);
    return issues.sort((left, right) => left.offset - right.offset);
}
