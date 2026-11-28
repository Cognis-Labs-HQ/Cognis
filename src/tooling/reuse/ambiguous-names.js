/**
 * Inspects JavaScript and TypeScript binding names and static table aliases.
 * Exports ambiguousNameIssues(source), returning name, line, offset and kind for each violation.
 * @example ambiguousNameIssues("export const a = 1;") // [{ name: "a", line: 1, offset: 13, kind: "binding" }]
 */
import { parsers } from "prettier/plugins/typescript";
import abbreviations from "./ambiguous-name-words.json" with { type: "json" };

const LOOP_NAMES = new Set(["i", "j", "k"]);
const MEASUREMENT_UNITS = new Set(Object.keys(abbreviations.measurementUnits));
const CONVENTIONAL_NAMES = new Set(Object.keys(abbreviations.conventional));
const ABBREVIATED_WORDS = new Set(Object.keys(abbreviations.words));
const ABBREVIATED_NAMES = new Set(
    Object.keys(abbreviations.names)
        .map((name) => name.toLowerCase())
        .filter((name) => !CONVENTIONAL_NAMES.has(name)),
);

function isAbbreviated(name) {
    if (CONVENTIONAL_NAMES.has(name.replace(/^_+/, "").toLowerCase()))
        return false;
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
        if (
            words.length > 1 &&
            (MEASUREMENT_UNITS.has(normalized) ||
                (normalized.endsWith("s") &&
                    MEASUREMENT_UNITS.has(normalized.slice(0, -1))))
        )
            return false;
        return (
            ABBREVIATED_WORDS.has(normalized) ||
            (normalized.endsWith("s") &&
                ABBREVIATED_WORDS.has(normalized.slice(0, -1)))
        );
    });
}

function expandedName(name) {
    const words =
        name.match(/[A-Z]+(?=[A-Z][a-z]|\d|_|$)|[A-Z]?[a-z]+|\d+/g) ?? [];
    return words
        .map((word) => abbreviations.words[word.toLowerCase()] ?? word)
        .join("")
        .toLowerCase();
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
    const ambiguous = (name) =>
        (name.length <= 2 || isAbbreviated(name)) &&
        !CONVENTIONAL_NAMES.has(name.toLowerCase());
    const binding = (node, numericCounter = false, ignoredAllowed = true) => {
        if (!node) return;
        if (node.type === "Identifier") {
            const name = node.name;
            definitions.add(node);
            if (
                ambiguous(name) &&
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
            (/^(?:ObjectMethod|ClassMethod|MethodDefinition|TSMethodSignature)$/.test(
                node.type,
            ) ||
                (node.type === "Property" &&
                    (node.method || ["get", "set"].includes(node.kind)))) &&
            !node.computed &&
            node.accessibility !== "private" &&
            node.key?.name &&
            !Object.hasOwn(abbreviations.canonicalMembers, node.key.name) &&
            (node.key.name.match(
                /[A-Z]+(?=[A-Z][a-z]|\d|_|$)|[A-Z]?[a-z]+|\d+/g,
            )?.length ?? 0) > 1 &&
            isAbbreviated(node.key.name)
        )
            report(node.key, "composite method");

        if (
            /^TS(?:InterfaceDeclaration|TypeAliasDeclaration)$/.test(
                node.type,
            ) &&
            (node.id.name.match(/[A-Z]+(?=[A-Z][a-z]|\d|_|$)|[A-Z]?[a-z]+|\d+/g)
                ?.length ?? 0) > 1 &&
            isAbbreviated(node.id.name)
        )
            report(node.id, "composite type");

        if (
            node.type === "ImportSpecifier" &&
            node.local.name !== node.imported.name &&
            (expandedName(node.local.name) ===
                expandedName(node.imported.name) ||
                ((parent.source?.value?.startsWith(".") ||
                    parent.source?.value?.startsWith("/") ||
                    parent.source?.value?.startsWith("@cognis/")) &&
                    isAbbreviated(node.imported.name)))
        )
            report(node.local, "naming-only import alias");

        if (
            node.type === "ExportSpecifier" &&
            node.local.name !== node.exported.name &&
            (expandedName(node.local.name) ===
                expandedName(node.exported.name) ||
                isAbbreviated(node.exported.name))
        )
            report(node.exported, "naming-only export alias");

        if (
            (node.type === "PropertyDefinition" ||
                node.type === "MethodDefinition") &&
            (node.accessibility === "private" ||
                node.key.type === "PrivateIdentifier") &&
            !node.computed &&
            ambiguous(String(node.key.name ?? node.key.value))
        )
            report(node.key, "private member");
        if (
            /^(?:ImportSpecifier|ImportDefaultSpecifier|ImportNamespaceSpecifier)$/.test(
                node.type,
            ) &&
            node.importKind !== "type" &&
            parent?.importKind !== "type"
        )
            if (!(
                parent.source?.value &&
                !parent.source.value.startsWith(".") &&
                !parent.source.value.startsWith("/") &&
                !parent.source.value.startsWith("@cognis/") &&
                node.type === "ImportSpecifier" &&
                node.imported.name === node.local.name
            ))
                binding(node.local);
        if (
            /^(?:FunctionDeclaration|FunctionExpression|ClassDeclaration|ClassExpression|TSEnumDeclaration|TSModuleDeclaration)$/.test(
                node.type,
            )
        )
            binding(
                node.id?.type === "Identifier" ? node.id : null,
                false,
                !/^Export/.test(parent?.type ?? ""),
            );
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
                parent?.type.startsWith("TS") &&
                parent.type !== "TSTypeQuery" &&
                !(
                    relation === "expression" &&
                    /^TS(?:AsExpression|SatisfiesExpression|NonNullExpression|TypeAssertion|InstantiationExpression)$/.test(
                        parent.type,
                    )
                );
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
