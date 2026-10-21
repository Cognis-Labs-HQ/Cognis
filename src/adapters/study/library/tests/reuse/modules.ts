import vm from "node:vm";
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
    vm.runInNewContext(
        source,
        {
            module,
            exports: module.exports,
            ...globals,
            require(id: string) {
                if (!Object.hasOwn(imports, id))
                    throw new Error(`Unexpected import: ${id}`);
                return imports[id];
            },
        },
        { filename: url.pathname },
    );
    return module.exports as Module;
}
