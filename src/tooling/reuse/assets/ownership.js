import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep as separator } from "node:path";
import { componentManifestFiles, sourceFiles } from "../component-files.js";

export function assetOwnershipIssues(assets) {
    return assets.flatMap(({ path, consumers }) => {
        const owners = new Set(consumers.map((consumer) => consumer.owner));
        const soleOwner = owners.size === 1 && consumers[0];
        return soleOwner &&
            soleOwner.ownsAssetSpace &&
            soleOwner.owner !== "core"
            ? [`${path}: belongs in ${soleOwner.owner}'s asset space`]
            : [];
    });
}

function localAssetReferences(root, path, content) {
    const quoted = [
        ...content.matchAll(/["'`]((?:\.\.?\/)[^"'`\s)]+)["'`]/g),
    ].map((match) => match[1]);
    const css = [...content.matchAll(/url\(\s*(\.\.?\/[^)\s]+)\s*\)/g)].map(
        (match) => match[1],
    );
    const corePath = relative(resolve(root, "src/ui"), path).replaceAll(
        "\\",
        "/",
    );
    const references = new Set();
    const names = [
        ...content.matchAll(/["']([a-zA-Z0-9][a-zA-Z0-9._-]*)["']/g),
    ].map((match) => match[1]);
    for (const template of content.matchAll(
        /[`"'](\/static\/[^`"'\s]*\/)\$\{[^}]+\}([^`"'\s]*)/g,
    )) {
        for (const name of names)
            references.add(template[1] + name + template[2]);
    }
    for (const value of [...quoted, ...css]) {
        const target = value.replace(/[?#].*$/, "");
        references.add(resolve(dirname(path), target));
        if (!corePath.startsWith("../")) {
            const published = corePath.replace(/^public\//, "");
            references.add(
                new URL(value, `https://asset.invalid/static/${published}`)
                    .pathname,
            );
        }
    }
    return references;
}

export function inspectCoreAssetOwnership(root) {
    const components = componentManifestFiles(root)
        .map(dirname)
        .filter(
            (directory) =>
                directory !== root &&
                ["ui", "assets", "public"].some((space) =>
                    existsSync(resolve(directory, space)),
                ),
        )
        .sort((first, second) => second.length - first.length);
    const consumers = sourceFiles(root)
        .filter((path) => /\.(?:js|ts|css|html|json)$/.test(path))
        .map((path) => {
            const owner = components.find((directory) =>
                path.startsWith(directory + separator),
            );
            const content = readFileSync(path, "utf8");
            return {
                owner: owner ? relative(root, owner) : "core",
                ownsAssetSpace: Boolean(owner),
                content,
                references: localAssetReferences(root, path, content),
            };
        });
    const spaces = [
        ["src/ui/public/assets", "/static/assets/"],
        ["src/ui/public/templates", "/static/templates/"],
        ["src/ui/styles", "/static/styles/"],
    ];
    const assets = spaces.flatMap(([directory, prefix]) => {
        const base = resolve(root, directory);
        if (!existsSync(base)) return [];
        return sourceFiles(base).map((path) => {
            const url = prefix + relative(base, path).replaceAll("\\", "/");
            return {
                path: relative(root, path),
                consumers: consumers.filter(
                    (consumer) =>
                        consumer.content.includes(url) ||
                        consumer.references.has(url) ||
                        consumer.references.has(path),
                ),
            };
        });
    });
    return assetOwnershipIssues(assets);
}
