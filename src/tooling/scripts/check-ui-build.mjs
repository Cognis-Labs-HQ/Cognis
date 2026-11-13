import { COMMON_STYLESHEETS } from "../../ui/reuse/resources.js";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { checkUiHostContracts } from "./check-ui-host-contracts.mjs";

const outputRoot = path.resolve("dist/ui");
async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map((entry) => {
                const entryPath = path.join(directory, entry.name);
                return entry.isDirectory() ? walk(entryPath) : [entryPath];
            }),
        )
    ).flat();
}

const manifest = JSON.parse(
    await readFile(path.join(outputRoot, "asset-manifest.json"), "utf8"),
);
assert.ok(
    Object.keys(manifest).length > 0,
    "asset manifest must contain dynamic contributions",
);
for (const [sourceUrl, emittedUrl] of Object.entries(manifest)) {
    assert.match(sourceUrl, /^\/static\//);
    assert.match(emittedUrl, /^\/assets\/.+-[A-Z0-9]+\.(?:css|js|xml)$/i);
    const emittedPath = path.join(outputRoot, emittedUrl);
    await Promise.all([
        access(emittedPath),
        access(`${emittedPath}.br`),
        access(`${emittedPath}.gz`),
    ]);
}
const offlineAssets = new Set(
    JSON.parse(
        await readFile(
            path.join(outputRoot, "public/offline-manifest.json"),
            "utf8",
        ),
    ),
);
for (const asset of Object.values(manifest)) {
    assert.ok(
        offlineAssets.has(asset),
        `Public bundle prepared offline: ${asset}`,
    );
}
for (const name of COMMON_STYLESHEETS) {
    const logical = `/static/styles/reuse/${name}`;
    assert.ok(
        offlineAssets.has(logical),
        `Shared offline stylesheet: ${logical}`,
    );
    assert.ok(
        offlineAssets.has(manifest[logical]),
        `Built shared offline stylesheet: ${logical}`,
    );
}
for (const locale of await readdir(path.resolve("src", "ui", "languages"))) {
    assert.ok(
        offlineAssets.has(`/static/languages/${locale}/strings.xml`),
        `Offline UI strings: ${locale}`,
    );
}
for (const flag of await readdir(
    path.join(outputRoot, "public", "assets", "flags"),
)) {
    if (flag.endsWith(".svg"))
        assert.ok(
            offlineAssets.has(`/static/assets/flags/${flag}`),
            `Offline language flag: ${flag}`,
        );
}
const publicPages = await readdir(path.join(outputRoot, "public", "pages"));
for (const publicAssetPath of await walk(
    path.join(outputRoot, "public", "assets"),
)) {
    const relativeAssetPath = path.relative(
        path.join(outputRoot, "public", "assets"),
        publicAssetPath,
    );
    await access(path.join(outputRoot, "assets", relativeAssetPath));
}
for (const pageName of publicPages.filter((name) => name.endsWith(".html"))) {
    const html = await readFile(
        path.join(outputRoot, "public", "pages", pageName),
        "utf8",
    );
    for (const matchedUrl of html.matchAll(
        /(?:src|href)="(\/assets\/[^"?]+)"/g,
    )) {
        await access(path.join(outputRoot, matchedUrl[1]));
    }
}
for (const sourcePath of (await walk(path.resolve("src"))).filter(
    (filePath) =>
        /\.(?:js|ts)$/.test(filePath) && !filePath.includes("/tests/"),
)) {
    const contents = await readFile(sourcePath, "utf8");
    for (const match of contents.matchAll(
        /scriptUrl\s*:\s*["'](\/static\/[^"']+\.js)["']/g,
    )) {
        assert.ok(
            manifest[match[1]],
            `${path.relative(process.cwd(), sourcePath)} contributes unresolved asset ${match[1]}`,
        );
    }
}
await checkUiHostContracts(async (moduleUrl) => {
    const emittedUrl = manifest[moduleUrl];
    assert.ok(
        emittedUrl,
        `${moduleUrl} must be published for external callbacks`,
    );
    return readFile(path.join(outputRoot, emittedUrl), "utf8");
});
console.log(
    `Validated ${Object.keys(manifest).length} dynamic contribution URLs.`,
);
