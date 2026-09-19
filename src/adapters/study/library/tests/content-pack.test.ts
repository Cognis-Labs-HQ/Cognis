import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    contentEntryId,
    inspectContentPack,
    versionedContentEntryId,
} from "../content-pack.js";

async function writeJson(file: string, value: unknown): Promise<void> {
    await writeFile(file, JSON.stringify(value), "utf8");
}

test("declarative language packs are inspected deterministically", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "letters"), { recursive: true });
    await mkdir(path.join(root, "content", "words"), { recursive: true });
    await mkdir(path.join(root, "assets", "strokes"), { recursive: true });
    await mkdir(path.join(root, "assets", "audio"), { recursive: true });
    await writeFile(path.join(root, "assets", "strokes", "a.svg"), "<svg/>");
    await writeFile(path.join(root, "assets", "audio", "a.mp3"), "audio");
    const manifest = {
        id: "english-core",
        publisher: "Cognis Labs HQ",
        version: "1.0.0",
        contentRevision: "2026-09-05",
        namespace: "english",
        schema: "schema.json",
        content: "content",
        assets: "assets",
        license: { id: "CC-BY-4.0" },
    };
    await writeJson(path.join(root, "manifest.json"), manifest);
    await writeJson(path.join(root, "schema.json"), {
        id: "english",
        version: 1,
        namespace: "english",
        language: "en",
        metadata: { labels: { en: "English" } },
        layers: [
            {
                id: "letters",
                metadata: { labels: { en: "Letters" } },
                semanticRole: "atomicWritingUnit",
                grid: {
                    rowSize: 5,
                    items: [null, "english:letter:a"],
                },
                fields: [
                    {
                        id: "pronunciation",
                        metadata: { labels: { en: "Pronunciation" } },
                        type: "stringList",
                        required: true,
                    },
                    {
                        id: "audio",
                        metadata: { labels: { en: "Audio" } },
                        type: "audio",
                        required: true,
                    },
                    {
                        id: "strokes",
                        metadata: { labels: { en: "Strokes" } },
                        type: "asset",
                    },
                ],
                strokeAsset: { field: "strokes", format: "svg" },
            },
            {
                id: "words",
                metadata: { labels: { en: "Words" } },
                relationships: [
                    {
                        id: "spelling",
                        metadata: { labels: { en: "Spelling" } },
                        targetLayer: "letters",
                        minimum: 1,
                        ordered: true,
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "letters", "a.json"), [
        {
            id: "english:letter:a",
            label: "a",
            hidden: true,
            fields: {
                pronunciation: ["ay"],
                audio: "audio/a.mp3",
                strokes: "strokes/a.svg",
            },
        },
    ]);
    await writeJson(path.join(root, "content", "words", "a.json"), [
        {
            id: "english:word:a",
            label: "a",
            references: [
                {
                    entryId: "english:letter:a",
                    relation: "spelling",
                    position: 0,
                },
            ],
        },
    ]);

    const first = await inspectContentPack(root);
    const second = await inspectContentPack(root);
    assert.equal(first.digest, second.digest);
    assert.equal(first.records.length, 2);
    assert.equal(first.records[0].hidden, true);
    assert.deepEqual(first.schema.layers[0].grid, {
        rowSize: 5,
        items: [null, "english:letter:a"],
    });
    assert.deepEqual(first.assets, [
        {
            path: "audio/a.mp3",
            mediaType: "audio/mpeg",
            data: Buffer.from("audio").toString("base64"),
        },
        {
            path: "strokes/a.svg",
            mediaType: "image/svg+xml",
            data: Buffer.from("<svg/>").toString("base64"),
        },
    ]);
    assert.equal(
        contentEntryId(manifest, "english:letter:a"),
        contentEntryId({ ...manifest, version: "2.0.0" }, "english:letter:a"),
    );
    assert.notEqual(
        versionedContentEntryId(manifest, "english:letter:a"),
        versionedContentEntryId(
            { ...manifest, version: "2.0.0" },
            "english:letter:a",
        ),
    );

    await writeJson(path.join(root, "schema.json"), {
        ...first.schema,
        namespace: "unowned",
    });
    await assert.rejects(
        inspectContentPack(root),
        /schema_namespace_not_owned/,
    );
});

test("content packs accept complete semantic versions", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    await mkdir(path.join(root, "content", "units"), { recursive: true });
    await writeJson(path.join(root, "manifest.json"), {
        id: "versioned",
        publisher: "Test Publisher",
        namespace: "versioned",
        version: "1.2.3-beta.1+vendor.7",
        contentRevision: "1",
        schema: "schema.json",
        content: "content",
        license: { id: "CC-BY-4.0" },
    });
    await writeJson(path.join(root, "schema.json"), {
        id: "versioned",
        version: 1,
        namespace: "versioned",
        language: "x-test",
        metadata: { labels: { en: "Versioned" } },
        layers: [{ id: "units", metadata: { labels: { en: "Units" } } }],
    });
    await writeJson(path.join(root, "content", "units", "data.json"), [
        { id: "versioned:unit", label: "Unit" },
    ]);

    assert.equal(
        (await inspectContentPack(root)).manifest.version,
        "1.2.3-beta.1+vendor.7",
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
        namespace: "broken",
        schema: "schema.json",
        content: "content",
        license: { id: "test" },
    });
    await writeJson(path.join(root, "schema.json"), {
        id: "broken",
        version: 1,
        namespace: "broken",
        language: "x-test",
        metadata: { labels: { en: "Broken" } },
        layers: [
            {
                id: "units",
                metadata: { labels: { en: "Units" } },
                relationships: [
                    {
                        id: "parts",
                        metadata: { labels: { en: "Parts" } },
                        targetLayer: "units",
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "units", "broken.json"), [
        {
            id: "broken:unit:a",
            label: "A",
            references: [{ entryId: "broken:unit:missing", relation: "parts" }],
        },
    ]);

    await assert.rejects(inspectContentPack(root), /reference_not_found/);
});

test("content packs reject ordered sequences with unlinked text", async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-library-pack-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    for (const layer of ["words", "particles", "sentences"])
        await mkdir(path.join(root, "content", layer), { recursive: true });
    await writeJson(path.join(root, "manifest.json"), {
        id: "sentences",
        publisher: "Test Publisher",
        version: "1.0.0",
        contentRevision: "1",
        namespace: "sentences",
        schema: "schema.json",
        content: "content",
        license: { id: "test" },
    });
    await writeJson(path.join(root, "schema.json"), {
        id: "sentences",
        version: 1,
        namespace: "sentences",
        language: "ja",
        metadata: { labels: { en: "Sentences" } },
        layers: [
            {
                id: "words",
                semanticRole: "lexicalUnit",
                metadata: { labels: { en: "Words" } },
            },
            {
                id: "particles",
                semanticRole: "particle",
                metadata: { labels: { en: "Particles" } },
            },
            {
                id: "sentences",
                semanticRole: "orderedLexicalSequence",
                metadata: { labels: { en: "Sentences" } },
                relationships: [
                    {
                        id: "words",
                        targetLayer: "words",
                        metadata: { labels: { en: "Words" } },
                        ordered: true,
                        onDelete: "restrict",
                    },
                    {
                        id: "particles",
                        targetLayer: "particles",
                        metadata: { labels: { en: "Particles" } },
                        ordered: true,
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "words", "words.json"), [
        { id: "sentences:word:japanese", label: "日本語" },
    ]);
    await writeJson(path.join(root, "content", "particles", "particles.json"), [
        { id: "sentences:particle:ga", label: "が" },
    ]);
    const sentenceFile = path.join(
        root,
        "content",
        "sentences",
        "sentences.json",
    );
    const references = [
        {
            entryId: "sentences:word:japanese",
            relation: "words",
            position: 0,
        },
        {
            entryId: "sentences:particle:ga",
            relation: "particles",
            position: 1,
        },
    ];
    await writeJson(sentenceFile, [
        { id: "sentences:sentence:valid", label: "日本語が", references },
    ]);
    await assert.doesNotReject(inspectContentPack(root));

    await writeJson(sentenceFile, [
        {
            id: "sentences:sentence:invalid",
            label: "日本語が好き",
            references,
        },
    ]);
    await assert.rejects(
        inspectContentPack(root),
        /ordered_sequence_content_unresolved/,
    );
});
