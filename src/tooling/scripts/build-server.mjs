import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
        entries.map(async (entry) => {
            const entryPath = path.join(directory, entry.name);
            return entry.isDirectory() ? walk(entryPath) : [entryPath];
        }),
    );
    return nested.flat();
}

const outputRoot = path.resolve("dist/server");
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
const sourceFiles = (await walk(path.resolve("src"))).filter(
    (filePath) =>
        filePath.endsWith(".ts") &&
        !filePath.includes("/tests/") &&
        !filePath.endsWith(".test.ts"),
);
await build({
    entryPoints: sourceFiles,
    outbase: ".",
    outdir: outputRoot,
    bundle: false,
    platform: "node",
    format: "esm",
    target: "node22",
    logLevel: "info",
});
await build({
    entryPoints: {
        "src/api/main": "src/api/main.ts",
        "node_modules/@cognis/core/index": "src/core/index.ts",
    },
    outdir: outputRoot,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    external: ["mysql2", "pg"],
});
await mkdir(path.join(outputRoot, "node_modules/@cognis/core"), {
    recursive: true,
});
const corePackage = JSON.parse(await readFile("src/core/package.json", "utf8"));
corePackage.main = "index.js";
await writeFile(
    path.join(outputRoot, "node_modules/@cognis/core/package.json"),
    `${JSON.stringify(corePackage, null, 2)}\n`,
);
await cp("src", path.join(outputRoot, "src"), {
    recursive: true,
    filter: (source) => {
        const normalizedSource = source.split(path.sep).join("/");
        return (
            !source.endsWith(".ts") &&
            !/(?:^|\/)tests(?:\/|$)/.test(normalizedSource)
        );
    },
});
const uiManifest = JSON.parse(
    await readFile("dist/ui/asset-manifest.json", "utf8"),
);
for (const htmlPath of (await walk(path.join(outputRoot, "src"))).filter(
    (filePath) => filePath.endsWith(".html"),
)) {
    let html = await readFile(htmlPath, "utf8");
    for (const [sourceUrl, emittedUrl] of Object.entries(uiManifest)) {
        html = html.replaceAll(sourceUrl, emittedUrl);
    }
    await writeFile(htmlPath, html);
}
for (const packagePath of (await walk(path.join(outputRoot, "src"))).filter(
    (filePath) => filePath.endsWith("package.json"),
)) {
    const packageManifest = JSON.parse(await readFile(packagePath, "utf8"));
    if (typeof packageManifest.main === "string") {
        packageManifest.main = packageManifest.main.replace(/\.ts$/, ".js");
        await writeFile(
            packagePath,
            `${JSON.stringify(packageManifest, null, 2)}\n`,
        );
    }
}
