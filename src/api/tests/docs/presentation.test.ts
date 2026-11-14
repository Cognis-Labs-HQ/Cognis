import test from "node:test";
import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createDocsRoutes } from "../../routes/docs/index.js";
import { loadTestModule } from "../../../tooling/reuse/test-module.js";
import type { readGroupPresentation } from "../../routes/docs/presentation.js";

test("unexpected filesystem failures remain visible when reading optional Docs presentation", async () => {
    const failure = Object.assign(new Error("read denied"), { code: "EACCES" });
    const diagnostics: unknown[] = [];
    const presentation = loadTestModule<{
        readGroupPresentation: typeof readGroupPresentation;
    }>(
        new URL("../../routes/docs/presentation.ts", import.meta.url),
        {
            "node:path": path,
            "node:crypto": crypto,
            "node:fs/promises": {
                realpath: async (value: string) => value,
                readFile: async () => {
                    throw failure;
                },
            },
        },
        { console },
    );
    await assert.rejects(
        presentation.readGroupPresentation(
            ["/source"],
            "11111111-1111-4111-8111-111111111111",
            (...args) => diagnostics.push(args),
        ),
        (error) => error === failure,
    );
    assert.deepEqual(diagnostics, []);
});

test("Docs preserves the public host's owner-local locale path prefixes", async (context) => {
    const directory = await mkdtemp(path.join(tmpdir(), "cognis-docs-host-"));
    const sourceRoot = path.join(directory, "external-modules");
    const previousRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = sourceRoot;
    context.after(async () => {
        if (previousRoot === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousRoot;
        await rm(directory, { recursive: true, force: true });
    });
    const { createUiRoutes } = await import("../../routes/ui/index.js");
    const uuid = "11111111-1111-4111-8111-111111111111";
    const moduleRoot = path.join(sourceRoot, uuid);
    await mkdir(path.join(moduleRoot, "docs"), { recursive: true });
    await writeFile(
        path.join(moduleRoot, "package.json"),
        JSON.stringify({ version: "1.0.0" }),
    );
    await writeFile(path.join(moduleRoot, "docs/guide.en.md"), "# Guide");
    const diagnostics: unknown[] = [];
    const docs = createDocsRoutes({
        sourceRoot,
        archiveRoot: path.join(directory, "archive"),
        log: (...args) => diagnostics.push(args),
    });
    const xml =
        '<resources><string name="module.name">Whiteboard</string></resources>';
    for (const suffix of [
        "_locales",
        "-locales",
        "languages/_regional",
        "languages/-regional",
        ".locales",
        "languages/.regional",
    ]) {
        const stringsBaseUrl = `/static/modules/whiteboard/${suffix}`;
        const manifest = {
            id: "whiteboard",
            uuid,
            class: "extension",
            name: "module.name",
            version: "1.0.0",
            entrypoints: { ui: "./ui/index.js" },
            ui: { stringsBaseUrl },
        };
        await writeFile(
            path.join(moduleRoot, "manifest.json"),
            JSON.stringify(manifest),
        );
        const stringsPath = path.join(
            moduleRoot,
            "ui",
            suffix,
            "en/strings.xml",
        );
        await mkdir(path.dirname(stringsPath), { recursive: true });
        await writeFile(stringsPath, xml);
        const uiRoute = createUiRoutes({
            listManifests: async () => [manifest],
        } as any);
        const response = () => {
            let status = 0;
            let body = "";
            return {
                res: {
                    setHeader() {},
                    writeHead(value: number) {
                        status = value;
                    },
                    end(value: string | Buffer) {
                        body += value.toString();
                    },
                },
                get status() {
                    return status;
                },
                get body() {
                    return body;
                },
            };
        };
        const index = response();
        await docs(
            { method: "GET" } as any,
            index.res as any,
            new URL("http://localhost/api/v1/docs"),
        );
        assert.equal(index.status, 200);
        const entries = JSON.parse(index.body).data;
        assert.equal(entries.length, 1);
        const presentation = entries[0].groupPresentation;
        const asset = response();
        await uiRoute(
            { headers: {} } as any,
            asset.res as any,
            new URL(`http://localhost${stringsBaseUrl}/en/strings.xml`),
        );
        if (suffix.split("/").some((segment) => segment.startsWith("."))) {
            assert.equal(asset.status, 404, suffix);
            assert.equal(presentation, undefined, suffix);
        } else {
            assert.equal(presentation.ui.stringsBaseUrl, stringsBaseUrl);
            assert.match(presentation.ui.stringsRevision, /^[a-f0-9]{64}$/);
            assert.equal(asset.status, 200, suffix);
            assert.equal(asset.body, xml, suffix);
        }
    }
    assert.equal(diagnostics.length, 2);
});
