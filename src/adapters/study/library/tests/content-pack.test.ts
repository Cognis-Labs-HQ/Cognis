import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { contentEntryId, inspectContentPack } from "../content-pack.js";

async function writeJson(file: string, value: unknown): Promise<void> {
    await writeFile(file, JSON.stringify(value), "utf8");
}

test("declarative language packs are inspected deterministically", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "letters"), { recursive: true });
    await mkdir(path.join(root, "content", "words"), { recursive: true });
    const manifest = {
        id: "english-core",
        publisher: "Cognis Labs HQ",
        version: "1.0.0",
        contentRevision: "2026-09-05",
        schema: "schema.json",
        content: "content",
        license: { id: "CC-BY-4.0" },
    };
    await writeJson(path.join(root, "manifest.json"), manifest);
    await writeJson(path.join(root, "schema.json"), {
        id: "english",
        version: 1,
        language: "en",
        label: "English",
        layers: [
            { id: "letters", label: "Letters" },
            {
                id: "words",
                label: "Words",
                relationships: [
                    {
                        id: "spelling",
                        label: "Spelling",
                        targetLayer: "letters",
                        minimum: 1,
                        ordered: true,
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "letters", "a.json"), [
        { id: "letter:a", label: "a" },
    ]);
    await writeJson(path.join(root, "content", "words", "a.json"), [
        {
            id: "word:a",
            label: "a",
            references: [
                { entryId: "letter:a", relation: "spelling", position: 0 },
            ],
        },
    ]);

    const first = await inspectContentPack(root);
    const second = await inspectContentPack(root);
    assert.equal(first.digest, second.digest);
    assert.equal(first.records.length, 2);
    assert.equal(
        contentEntryId(manifest, "letter:a"),
        contentEntryId(manifest, "letter:a"),
    );
});

test("content packs reject dangling relationships", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "units"), { recursive: true });
    await writeJson(path.join(root, "manifest.json"), {
        id: "broken",
        publisher: "Test Publisher",
        version: "1.0.0",
        contentRevision: "1",
        schema: "schema.json",
        content: "content",
        license: { id: "test" },
    });
    await writeJson(path.join(root, "schema.json"), {
        id: "broken",
        version: 1,
        language: "x-test",
        label: "Broken",
        layers: [
            {
                id: "units",
                label: "Units",
                relationships: [
                    {
                        id: "parts",
                        label: "Parts",
                        targetLayer: "units",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "units", "broken.json"), [
        {
            id: "unit:a",
            label: "A",
            references: [{ entryId: "unit:missing", relation: "parts" }],
        },
    ]);

    await assert.rejects(inspectContentPack(root), /reference_not_found/);
});
