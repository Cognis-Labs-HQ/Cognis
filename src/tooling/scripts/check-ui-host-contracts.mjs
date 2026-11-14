import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const contracts = {
    "/static/reuse/page-entry.js": ["mountWhenDirect", "navigateToDocument"],
};

/** Parse public exports without evaluating downloaded browser code. */
export async function checkUiHostContracts(loadModule) {
    for (const [moduleUrl, requiredExports] of Object.entries(contracts)) {
        const source = await loadModule(moduleUrl);
        const result = await build({
            stdin: { contents: source, sourcefile: moduleUrl },
            format: "esm",
            bundle: false,
            write: false,
            metafile: true,
            outfile: "host-contract.js",
            logLevel: "silent",
        });
        const exportedNames = Object.values(result.metafile.outputs).flatMap(
            (output) => output.exports,
        );
        for (const name of requiredExports) {
            assert.ok(
                exportedNames.includes(name),
                `${moduleUrl} must export ${name}; deploy the matching host before its external callbacks`,
            );
        }
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
    const args = process.argv.slice(2);
    assert.ok(
        args.length === 0 || (args.length === 2 && args[0] === "--origin"),
        "Usage: npm run check:ui-host -- [--origin https://host.example]",
    );
    const origin = args.length ? new URL(args[1]) : null;
    if (origin) {
        assert.ok(
            ["http:", "https:"].includes(origin.protocol) &&
                !origin.username &&
                !origin.password &&
                origin.pathname === "/" &&
                !origin.search &&
                !origin.hash,
            "Supply an HTTP(S) origin without credentials, query or path",
        );
    }
    await checkUiHostContracts(async (moduleUrl) => {
        if (!origin) {
            return readFile(
                path.resolve("src/ui", moduleUrl.slice("/static/".length)),
                "utf8",
            );
        }
        const response = await fetch(new URL(moduleUrl, origin), {
            credentials: "omit",
            redirect: "error",
            headers: { "cache-control": "no-cache" },
            signal: AbortSignal.timeout(10_000),
        });
        assert.ok(response.ok, `${moduleUrl}: HTTP ${response.status}`);
        return response.text();
    });
    console.log("Validated standalone authentication host exports.");
}
