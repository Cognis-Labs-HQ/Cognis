import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { parsers } from "prettier/plugins/babel";

const SHARED_BUILDER = "/static/reuse/form-builder.js";
const isFunction = (node) => /Function|Method/.test(node.type);
const children = (node) =>
    Object.values(node).flatMap((value) =>
        Array.isArray(value)
            ? value.filter((child) => child?.type)
            : value?.type
              ? [value]
              : [],
    );
const propertyName = (node) =>
    node.computed ? node.property?.value : node.property?.name;

function patternNames(node) {
    if (!node) return [];
    if (node.type === "Identifier") return [node.name];
    if (node.type === "RestElement") return patternNames(node.argument);
    if (node.type === "AssignmentPattern") return patternNames(node.left);
    if (node.type === "ObjectPattern")
        return node.properties.flatMap((property) =>
            patternNames(property.value ?? property.argument),
        );
    if (node.type === "ArrayPattern")
        return node.elements.flatMap(patternNames);
    return [];
}

function writeTargets(node) {
    if (!node) return [];
    if (["Identifier", "MemberExpression"].includes(node.type)) return [node];
    if (node.type === "RestElement") return writeTargets(node.argument);
    if (node.type === "AssignmentPattern") return writeTargets(node.left);
    if (node.type === "ObjectPattern")
        return node.properties.flatMap((property) =>
            writeTargets(property.value ?? property.argument),
        );
    if (node.type === "ArrayPattern")
        return node.elements.flatMap(writeTargets);
    return [];
}

function parseModule(filePath) {
    const program = parsers["babel-ts"].parse(
        readFileSync(filePath, "utf8"),
    ).program;
    const scopes = new WeakMap();
    const parents = new WeakMap();
    const nodes = [];
    const rootScope = {
        bindings: new Map(),
        parent: null,
        functionScope: true,
    };
    const bind = (scope, name, binding) => {
        scope.bindings.set(name, scope.bindings.has(name) ? null : binding);
    };
    const visit = (node, scope, parent) => {
        parents.set(node, parent);
        nodes.push(node);
        if (node.type === "FunctionDeclaration" && node.id)
            bind(scope, node.id.name, { node, kind: "function" });
        if (
            isFunction(node) ||
            node.type === "CatchClause" ||
            node.type === "BlockStatement" ||
            /^(For|Switch)/.test(node.type)
        ) {
            scope = {
                bindings: new Map(),
                parent: scope,
                functionScope: isFunction(node),
            };
        }
        scopes.set(node, scope);
        if (isFunction(node)) {
            for (const parameter of node.params)
                for (const name of patternNames(parameter))
                    bind(scope, name, { node: parameter, kind: "parameter" });
            if (node.type === "FunctionExpression" && node.id)
                bind(scope, node.id.name, { node, kind: "function" });
        }
        if (node.type === "CatchClause")
            for (const name of patternNames(node.param))
                bind(scope, name, { node: node.param, kind: "parameter" });
        if (node.type === "ImportDeclaration")
            for (const specifier of node.specifiers)
                bind(scope, specifier.local.name, {
                    node: specifier,
                    kind: "import",
                    source: node.source.value,
                });
        if (node.type === "VariableDeclaration") {
            let declarationScope = scope;
            if (node.kind === "var")
                while (!declarationScope.functionScope)
                    declarationScope = declarationScope.parent;
            for (const declaration of node.declarations)
                for (const name of patternNames(declaration.id))
                    bind(declarationScope, name, {
                        node: declaration,
                        kind: node.kind,
                    });
        }
        if (node.type === "ClassDeclaration" && node.id)
            bind(scope, node.id.name, { node, kind: "class" });
        for (const child of children(node)) visit(child, scope, node);
    };
    visit(program, rootScope, null);
    const bindingAt = (identifier) => {
        if (identifier?.type !== "Identifier") return null;
        for (let scope = scopes.get(identifier); scope; scope = scope.parent)
            if (scope.bindings.has(identifier.name))
                return scope.bindings.get(identifier.name);
        return null;
    };
    for (const node of nodes) {
        const target =
            node.type === "AssignmentExpression"
                ? node.left
                : node.type === "UpdateExpression" ||
                    (node.type === "UnaryExpression" &&
                        node.operator === "delete")
                  ? node.argument
                  : /^(ForIn|ForOf)Statement$/.test(node.type)
                    ? node.left
                    : null;
        for (const written of writeTargets(target)) {
            const member = written.type === "MemberExpression";
            const binding = bindingAt(member ? written.object : written);
            if (binding) binding[member ? "memberWritten" : "written"] = true;
        }
    }
    return { filePath, program, parents, nodes, bindingAt };
}

function directCallStatement(module, call) {
    let statement = module.parents.get(call);
    if (
        statement?.type === "AssignmentExpression" &&
        statement.right === call &&
        statement.operator === "=" &&
        statement.left.type === "Identifier"
    )
        statement = module.parents.get(statement);
    else if (
        statement?.type === "VariableDeclarator" &&
        statement.init === call
    )
        statement = module.parents.get(statement);
    if (
        !["ExpressionStatement", "VariableDeclaration"].includes(
            statement?.type,
        )
    )
        return null;
    const block = module.parents.get(statement);
    return ["BlockStatement", "Program"].includes(block?.type)
        ? { statement, block }
        : null;
}

function isValueReference(module, node, binding) {
    if (node.type !== "Identifier" || node === binding.node.id) return false;
    const parent = module.parents.get(node);
    if (
        (parent?.type === "MemberExpression" &&
            parent.property === node &&
            !parent.computed) ||
        (parent?.type === "ObjectProperty" &&
            parent.key === node &&
            !parent.computed)
    )
        return false;
    return module.bindingAt(node) === binding;
}

function onlyUsedToAttach(module, binding) {
    return module.nodes.every((node) => {
        if (!isValueReference(module, node, binding)) return true;
        const parent = module.parents.get(node);
        const call = module.parents.get(parent);
        return (
            parent?.type === "MemberExpression" &&
            parent.object === node &&
            !parent.computed &&
            propertyName(parent) === "attach" &&
            call?.type === "CallExpression" &&
            call.callee === parent &&
            !call.optional
        );
    });
}

function formHasNotEscaped(module, binding, attach) {
    return module.nodes.every((node) => {
        if (
            node.start >= attach.start ||
            !isValueReference(module, node, binding)
        )
            return true;
        const parent = module.parents.get(node);
        return (
            (parent?.type === "IfStatement" && parent.test === node) ||
            (parent?.type === "BinaryExpression" &&
                parent.operator === "instanceof" &&
                parent.left === node) ||
            (parent?.type === "UnaryExpression" && parent.operator === "!")
        );
    });
}

function finalReturn(fn) {
    if (fn.async || fn.generator || fn.body.type !== "BlockStatement")
        return null;
    const last = fn.body.body.at(-1);
    if (last?.type !== "ReturnStatement") return null;
    const returns = [];
    const visit = (node) => {
        if (isFunction(node)) return;
        if (node.type === "ReturnStatement") returns.push(node);
        for (const child of children(node)) visit(child);
    };
    visit(fn.body);
    return returns.length === 1 ? last.argument : null;
}

/** Prove a narrow delegated submit path; unsupported syntax fails closed.
 * Every listener must attach the same const form to a const builder beforehand,
 * in its own execution block. Factories must directly return the real shared
 * builder through named, owner-local imports/functions, without reassignment.
 */
export function hasOwnedFormSubmission({ filePath, hostReuseRoot }) {
    try {
        const entryPath = realpathSync(filePath);
        const ownerRoot = dirname(entryPath);
        const modules = new Map();
        const load = (path) => {
            if (!modules.has(path)) modules.set(path, parseModule(path));
            return modules.get(path);
        };
        const entry = load(entryPath);
        const host = load(
            realpathSync(resolve(hostReuseRoot, "form-builder.js")),
        );
        const sharedExport = host.program.body.some(
            (node) =>
                node.type === "ExportNamedDeclaration" &&
                node.declaration?.type === "FunctionDeclaration" &&
                node.declaration.id?.name === "createFormBuilder",
        );
        if (!sharedExport) return false;
        const returnsSharedBuilder = (module, call, visited = new Set()) => {
            if (call?.type !== "CallExpression" || call.optional) return false;
            const binding = module.bindingAt(call.callee);
            if (
                !binding ||
                binding.written ||
                visited.has(binding) ||
                visited.size >= 12
            )
                return false;
            visited = new Set([...visited, binding]);
            if (binding.kind === "import") {
                if (binding.node.type !== "ImportSpecifier") return false;
                const name = binding.node.imported.name;
                if (binding.source === SHARED_BUILDER)
                    return name === "createFormBuilder";
                if (
                    !binding.source.startsWith("./") &&
                    !binding.source.startsWith("../")
                )
                    return false;
                const targetPath = realpathSync(
                    resolve(dirname(module.filePath), binding.source),
                );
                const ownerRelative = relative(ownerRoot, targetPath);
                if (ownerRelative.startsWith("..") || isAbsolute(ownerRelative))
                    return false;
                const target = load(targetPath);
                const exported = target.program.body.find(
                    (node) =>
                        node.type === "ExportNamedDeclaration" &&
                        node.declaration?.type === "FunctionDeclaration" &&
                        node.declaration.id?.name === name,
                );
                if (!exported) return false;
                const declaration = exported.declaration;
                // Resolve the exported binding in its declaration's enclosing scope.
                const targetBinding = target.bindingAt(declaration.id);
                if (
                    targetBinding?.kind !== "function" ||
                    targetBinding.written ||
                    visited.has(targetBinding)
                )
                    return false;
                visited.add(targetBinding);
                return returnsSharedBuilder(
                    target,
                    finalReturn(declaration),
                    visited,
                );
            }
            return (
                binding.kind === "function" &&
                returnsSharedBuilder(module, finalReturn(binding.node), visited)
            );
        };
        const listeners = entry.nodes.filter(
            (node) =>
                ["CallExpression", "OptionalCallExpression"].includes(
                    node.type,
                ) &&
                (propertyName(node.callee) === "addEventListener" ||
                    node.callee.name === "addEventListener") &&
                node.arguments[0]?.value === "submit",
        );
        // Other submission styles keep the original publication rule.
        if (
            !listeners.length ||
            entry.nodes.some(
                (node) =>
                    (node.type === "MemberExpression" &&
                        propertyName(node) === "onsubmit") ||
                    ((node.type === "ObjectProperty" ||
                        node.type === "ObjectMethod") &&
                        (node.key.name ?? node.key.value) === "onSubmit"),
            )
        )
            return false;
        return listeners.every((listener) => {
            const form = entry.bindingAt(listener.callee.object);
            const registration = directCallStatement(entry, listener);
            if (
                !registration ||
                listener.callee.computed ||
                listener.optional ||
                form?.kind !== "const" ||
                form.written ||
                form.node.id.type !== "Identifier" ||
                !form.node.init
            )
                return false;
            return entry.nodes.some((attach) => {
                if (
                    attach.type !== "CallExpression" ||
                    attach.optional ||
                    attach.callee.type !== "MemberExpression" ||
                    attach.callee.computed ||
                    propertyName(attach.callee) !== "attach" ||
                    attach.arguments.length !== 1 ||
                    entry.bindingAt(attach.arguments[0]) !== form
                )
                    return false;
                const attachment = directCallStatement(entry, attach);
                const builder = entry.bindingAt(attach.callee.object);
                return (
                    attachment?.block === registration.block &&
                    attachment.statement.end <= registration.statement.start &&
                    form.node.end < attach.start &&
                    formHasNotEscaped(entry, form, attach) &&
                    builder?.kind === "const" &&
                    !builder.written &&
                    !builder.memberWritten &&
                    onlyUsedToAttach(entry, builder) &&
                    builder.node.id.type === "Identifier" &&
                    builder.node.end < attach.start &&
                    returnsSharedBuilder(entry, builder.node.init)
                );
            });
        });
    } catch {
        // Missing files, parse errors and unresolved paths are not ownership proof.
        return false;
    }
}
