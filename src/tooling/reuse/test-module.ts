import virtualMachine from "node:vm";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";

/** Load the real module exports with explicit public-contract replacements for its imports. */
export function loadTestModule<Module extends object = Record<string, unknown>>(
    url: URL,
    imports: Record<string, unknown>,
    globals: Record<string, unknown> = {},
): Module {
    const module = { exports: {} };
    const source = transformSync(readFileSync(url, "utf8"), {
        format: "cjs",
        loader: url.pathname.endsWith(".ts") ? "ts" : "js",
        target: "es2022",
        define: { "import.meta.url": JSON.stringify(url.href) },
    }).code;
    const context = virtualMachine.isContext(globals)
        ? globals
        : virtualMachine.createContext(globals);
    const evaluate = virtualMachine.compileFunction(
        source,
        ["module", "exports", "require"],
        {
            parsingContext: context,
            filename: url.pathname,
        },
    );
    evaluate(module, module.exports, (id: string) => {
        if (!Object.hasOwn(imports, id))
            throw new Error(`Unexpected import: ${id}`);
        return imports[id];
    });
    return module.exports as Module;
}

/** Evaluate actual ESM exports, including top-level await, with explicit import contracts. */
export async function importTestModule<
    Module extends object = Record<string, unknown>,
>(
    url: URL,
    imports: Record<string, Record<string, unknown>>,
    globals: Record<string, unknown> = {},
): Promise<Module> {
    const context = virtualMachine.isContext(globals)
        ? globals
        : virtualMachine.createContext(globals);
    const source = transformSync(readFileSync(url, "utf8"), {
        format: "esm",
        loader: url.pathname.endsWith(".ts") ? "ts" : "js",
        target: "es2022",
    }).code;
    const module = new virtualMachine.SourceTextModule(source, {
        context,
        identifier: url.href,
        initializeImportMeta(metadata) {
            metadata.url = url.href;
        },
    });
    await module.link((id) => {
        if (!Object.hasOwn(imports, id))
            throw new Error(`Unexpected import: ${id}`);
        const values = imports[id];
        return new virtualMachine.SyntheticModule(
            Object.keys(values),
            function () {
                for (const [key, value] of Object.entries(values))
                    this.setExport(key, value);
            },
            { context },
        );
    });
    await module.evaluate();
    return module.namespace as Module;
}
