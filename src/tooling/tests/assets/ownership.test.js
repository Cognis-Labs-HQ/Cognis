import {
    mkdtempSync,
    mkdirSync,
    writeFileSync,
    renameSync,
    rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
    assetOwnershipIssues,
    inspectCoreAssetOwnership,
} from "../../reuse/assets/ownership.js";

const ROOT = resolve(import.meta.dirname, "../../../..");

test("assets used only by a component with its own asset space cannot be published as core assets", () => {
    for (const owner of [
        "src/gateways/example",
        "src/adapters/example/provider",
        "src/modules/extension",
    ]) {
        assert.equal(
            assetOwnershipIssues([
                {
                    path: "core/icon.svg",
                    consumers: [{ owner, ownsAssetSpace: true }],
                },
            ]).length,
            1,
        );
    }
});

test("core-owned and shared assets retain their neutral publication space", () => {
    assert.deepEqual(
        assetOwnershipIssues([
            {
                path: "core/brand.svg",
                consumers: [{ owner: "core", ownsAssetSpace: true }],
            },
            {
                path: "core/shared.svg",
                consumers: [
                    { owner: "feature-a", ownsAssetSpace: true },
                    { owner: "feature-b", ownsAssetSpace: true },
                ],
            },
        ]),
        [],
    );
});

test("shipping feature assets respect component publication boundaries", () => {
    assert.deepEqual(inspectCoreAssetOwnership(ROOT), []);
});

test("ownership discovery covers assets-only gateways, adapters and external modules", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-asset-owner-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    const core = resolve(root, "src/ui/public/assets");
    mkdirSync(core, { recursive: true });
    for (const [index, location] of [
        "src/gateways/example",
        "src/adapters/example/provider",
        "external-modules/extension",
    ].entries()) {
        const component = resolve(root, location);
        mkdirSync(resolve(component, "assets"), { recursive: true });
        writeFileSync(
            resolve(component, "manifest.json"),
            JSON.stringify({ id: `owner-${index}`, version: "1.0.0" }),
        );
        const filename = `image-${index}.svg`;
        writeFileSync(resolve(core, filename), "<svg></svg>");
        writeFileSync(
            resolve(component, "index.js"),
            `export const icon = '/static/assets/${filename}';`,
        );
        assert.equal(inspectCoreAssetOwnership(root).length, 1);
        renameSync(
            resolve(core, filename),
            resolve(component, "assets", filename),
        );
        writeFileSync(
            resolve(component, "index.js"),
            `export const icon = '/static/components/owner-${index}/assets/${filename}';`,
        );
        assert.deepEqual(inspectCoreAssetOwnership(root), []);
    }
});

test("core styles, fonts and templates obey the same ownership boundary", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-static-owner-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    const component = resolve(root, "src/gateways/example");
    mkdirSync(resolve(component, "ui"), { recursive: true });
    writeFileSync(
        resolve(component, "manifest.json"),
        JSON.stringify({ id: "example", version: "1.0.0" }),
    );
    for (const [directory, filename, prefix] of [
        ["src/ui/styles", "feature.css", "/static/styles/"],
        ["src/ui/styles/fonts", "feature.woff2", "/static/styles/fonts/"],
        ["src/ui/public/templates", "feature.html", "/static/templates/"],
    ]) {
        mkdirSync(resolve(root, directory), { recursive: true });
        writeFileSync(resolve(root, directory, filename), "feature asset");
        writeFileSync(
            resolve(component, "ui/index.js"),
            `export const asset = '${prefix}${filename}';`,
        );
        assert.equal(inspectCoreAssetOwnership(root).length, 1);
        rmSync(resolve(root, directory, filename));
    }
});

test("relative imports identify core-owned widget styles without ownership exceptions", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-relative-assets-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(resolve(root, "src/ui/styles"), { recursive: true });
    mkdirSync(resolve(root, "src/ui/reuse"), { recursive: true });
    mkdirSync(resolve(root, "src/gateways/example/ui"), { recursive: true });
    writeFileSync(
        resolve(root, "src/gateways/example/manifest.json"),
        JSON.stringify({ id: "example", version: "1.0.0" }),
    );
    writeFileSync(
        resolve(root, "src/ui/styles/widget.css"),
        ".widget { color: inherit; }",
    );
    writeFileSync(
        resolve(root, "src/gateways/example/ui/index.js"),
        "export const styles = '/static/styles/widget.css';",
    );
    assert.equal(inspectCoreAssetOwnership(root).length, 1);
    writeFileSync(
        resolve(root, "src/ui/reuse/widget.js"),
        "export const styles = new URL('../styles/widget.css', import.meta.url);",
    );
    assert.deepEqual(inspectCoreAssetOwnership(root), []);
});

test("dynamic core resource catalogues own listed resources rather than an entire URL prefix", (context) => {
    const root = mkdtempSync(resolve(tmpdir(), "cognis-resource-catalogue-"));
    context.after(() => rmSync(root, { recursive: true, force: true }));
    for (const directory of [
        "src/ui/styles",
        "src/ui/reuse",
        "src/gateways/example/ui",
    ])
        mkdirSync(resolve(root, directory), { recursive: true });
    writeFileSync(
        resolve(root, "src/gateways/example/manifest.json"),
        JSON.stringify({ id: "example", version: "1.0.0" }),
    );
    writeFileSync(
        resolve(root, "src/ui/styles/widget.css"),
        ".widget { color: inherit; }",
    );
    writeFileSync(
        resolve(root, "src/ui/styles/feature.css"),
        ".feature { color: inherit; }",
    );
    writeFileSync(
        resolve(root, "src/ui/reuse/resources.js"),
        'export const names = ["widget.css"]; export const url = name => `/static/styles/${name}`;',
    );
    writeFileSync(
        resolve(root, "src/gateways/example/ui/index.js"),
        "export const styles = ['/static/styles/widget.css', '/static/styles/feature.css'];",
    );
    const issues = inspectCoreAssetOwnership(root);
    assert.equal(issues.length, 1);
    assert.ok(issues[0].includes("feature.css"));
});
