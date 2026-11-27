/**
 * Inspects JavaScript and TypeScript binding names and static table aliases.
 * Exports ambiguousNameIssues(source), returning name, line, offset and kind for each violation.
 * @example ambiguousNameIssues("export const a = 1;") // [{ name: "a", line: 1, offset: 13, kind: "binding" }]
 */
import { parsers } from "prettier/plugins/typescript";

const SPATIAL_NAMES = new Set(["x", "y", "w", "h"]);
const LOOP_NAMES = new Set(["i", "j", "k", "r", "c"]);

/**
 * Checks declarations, destructuring, parameters and catch bindings independently of formatting.
 * Property keys, type parameters and literal text are not variable bindings.
 * @param {string} source Complete JavaScript or TypeScript source; parse failures propagate.
 * @returns {{name:string,line:number,offset:number,kind:string}[]} Ordered violations with one-based lines.
 */
export function ambiguousNameIssues(source) {
    const ast = parsers.typescript.parse(source);
    const issues = [];
    const report = (node, kind) => {
        issues.push({
            name: node.name ?? node.value,
            line: node.loc.start.line,
            offset: node.range[0],
            kind,
        });
    };
    const binding = (node, numericCounter = false) => {
        if (!node) return;
        if (node.type === "Identifier") {
            const name = node.name;
            if (
                name.length <= 2 &&
                name !== "_" &&
                name !== "id" &&
                !SPATIAL_NAMES.has(name) &&
                !(numericCounter && LOOP_NAMES.has(name))
            )
                report(node, "binding");
        } else if (node.type === "ObjectPattern")
            node.properties.forEach((property) =>
                binding(property.value ?? property.argument),
            );
        else if (node.type === "ArrayPattern")
            node.elements.forEach((element) => binding(element));
        else if (node.type === "AssignmentPattern") binding(node.left);
        else if (node.type === "RestElement") binding(node.argument);
        else if (node.type === "TSParameterProperty") binding(node.parameter);
    };
    const visit = (node, parent) => {
        if (node.type === "VariableDeclaration")
            for (const declaration of node.declarations)
                binding(
                    declaration.id,
                    parent?.type === "ForStatement" && parent.init === node,
                );
        if (
            /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression|ObjectMethod|ClassMethod|ClassPrivateMethod)$/.test(
                node.type,
            )
        )
            node.params.forEach((parameter) => binding(parameter));
        if (node.type === "CatchClause") binding(node.param);
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
            binding(node.id);
        if (
            node.type === "Property" &&
            (node.key.name ?? node.key.value) === "alias" &&
            node.value.type === "Literal" &&
            typeof node.value.value === "string" &&
            /^[A-Za-z0-9_]{1,2}$/.test(node.value.value)
        )
            report(node.value, "SQL alias");
        for (const value of Object.values(node)) {
            const descend = (child) => {
                if (child?.type) visit(child, node);
            };
            if (Array.isArray(value)) value.forEach(descend);
            else descend(value);
        }
    };
    visit(ast, null);
    return issues.sort((left, right) => left.offset - right.offset);
}
