import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { contentEntryId, inspectContentPack } from "../../content-pack.js";
import { validateLibrarySchema } from "../../layers.js";

test("public content inspection generates flagged variants and rejects authored copies", async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "generated-transform-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    await cp(new URL("../fixtures/external-pack", import.meta.url), root, {
        recursive: true,
    });
    const schemaPath = path.join(root, "schema.json");
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    schema.transformSets = [
        {
            id: "plural",
            metadata: { labels: { en: "Plural" } },
            flag: "transform:plural",
            matchTags: ["transform:plural"],
            baseState: "base",
            rules: [
                {
                    id: "plural",
                    metadata: { labels: { en: "Plural" } },
                    fromState: "base",
                    toState: "plural",
                    removeSuffix: "",
                    append: "s",
                    pronunciation: { removeSuffix: "", append: "s" },
                },
            ],
        },
    ];
    await writeFile(schemaPath, JSON.stringify(schema));
    const recordsPath = path.join(root, "content/characters/characters.json");
    const [source] = JSON.parse(await readFile(recordsPath, "utf8"));
    source.tags = ["transform:plural"];
    await writeFile(recordsPath, JSON.stringify([source]));
    const plan = await inspectContentPack(root);
    assert.equal(
        plan.records.filter((record) => record.layer === "characters").length,
        1,
    );
    source.tags = ["inflected"];
    await writeFile(recordsPath, JSON.stringify([source]));
    await assert.rejects(
        inspectContentPack(root),
        /generated_transformation_readonly/,
    );
    source.tags = ["transform:unknown"];
    await writeFile(recordsPath, JSON.stringify([source]));
    await assert.rejects(inspectContentPack(root), /unresolved_transform_flag/);
});

test("external-package contract fixture preserves validated contract metadata", async () => {
    const root = fileURLToPath(
        new URL("../fixtures/external-pack", import.meta.url),
    );
    const plan = await inspectContentPack(root);
    assert.equal(plan.records.length, 4);
    const definition = plan.records.find(
        ({ layer }) => layer === "definitions",
    );
    assert.equal(definition?.class, "definition");
    assert.equal(definition?.hidden, true);
    assert.equal(
        plan.records.find(({ layer }) => layer === "words")?.class,
        "lexical:noun",
    );
    assert.deepEqual(
        plan.records.find(({ layer }) => layer === "words")?.tags,
        ["fixture"],
    );
    assert.deepEqual(plan.manifest.metadata, {
        catalog: { featured: true, rank: 1 },
        tags: ["fixture"],
    });
    assert.deepEqual(plan.schema.metadata.provider, { stable: true });
    assert.equal(plan.schema.layers[0].fields?.[2].type, "fixtureScore");
    assert.deepEqual(plan.schema.layers[0].fields?.[2].metadata.unit, "rank");
    assert.equal(plan.assets.length, 2);
    const dependency = plan.schema.layers
        .find(({ id }) => id === "symbols")
        ?.relationships?.find(({ id }) => id === "reading-unit-dependency");
    assert.equal(dependency?.resolverRole, undefined);
    assert.equal(dependency?.presentationRole, undefined);
    assert.equal(dependency?.onDelete, "restrict");
    assert.deepEqual(
        plan.records.find(({ layer }) => layer === "symbols")?.references,
        [
            {
                entryId: "synthetic:character:lo",
                relation: "reading-unit-dependency",
            },
        ],
    );
});

test("external packages reject unvalidated field types and invalid metadata", async (t) => {
    const source = fileURLToPath(
        new URL("../fixtures/external-pack", import.meta.url),
    );
    const root = await mkdtemp(
        path.join(os.tmpdir(), "cognis-library-contract-"),
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    await cp(source, root, { recursive: true });
    const schemaFile = path.join(root, "schema.json");
    const schema = JSON.parse(await readFile(schemaFile, "utf8"));
    delete schema.layers[0].fields[2].validation;
    await writeJson(schemaFile, schema);
    await assert.rejects(
        inspectContentPack(root),
        /custom_field_validation_required/,
    );
    schema.layers[0].fields[2].validation = { kind: "number" };
    schema.metadata.provider.bad = Number.NaN;
    assert.throws(
        () => validateLibrarySchema(schema),
        /invalid_metadata_value/,
    );
});

async function writeJson(file: string, value: unknown): Promise<void> {
    await writeFile(file, JSON.stringify(value), "utf8");
}

test("external packs preserve unknown writing-unit readings without bypassing required fields", async (t) => {
    const source = fileURLToPath(
        new URL("../fixtures/external-pack", import.meta.url),
    );
    const root = await mkdtemp(
        path.join(os.tmpdir(), "cognis-unknown-reading-"),
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    await cp(source, root, { recursive: true });
    const schemaFile = path.join(root, "schema.json");
    const schema = JSON.parse(await readFile(schemaFile, "utf8"));
    const symbols = schema.layers.find(
        (layer: { id: string }) => layer.id === "symbols",
    );
    const pronunciation = symbols.fields.find(
        (field: { id: string }) => field.id === "pronunciation",
    );
    pronunciation.required = false;
    await writeJson(schemaFile, schema);
    await writeJson(path.join(root, "content", "symbols", "unknown.json"), [
        {
            id: "synthetic:symbol:unknown",
            label: "◈",
            fields: {},
        },
    ]);
    const plan = await inspectContentPack(root);
    assert.deepEqual(
        plan.records.find(({ id }) => id === "synthetic:symbol:unknown")
            ?.fields,
        {},
    );
    pronunciation.required = true;
    await writeJson(schemaFile, schema);
    await assert.rejects(
        inspectContentPack(root),
        /field_required:pronunciation/,
    );
});

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
                cardConstructor: {
                    label: { labels: { en: "Letter" } },
                    fields: ["pronunciation", "audio", "strokes"],
                    input_carousels: [],
                    pronunciation_carousels: [],
                    allowHidden: true,
                },
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
    assert.deepEqual(first.schema.layers[0].cardConstructor, {
        label: { labels: { en: "Letter" } },
        fields: ["pronunciation", "audio", "strokes"],
        input_carousels: [],
        pronunciation_carousels: [],
        allowHidden: true,
    });
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
        language: "x-mock",
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
                    {
                        id: "pronunciation-readings",
                        targetLayer: "words",
                        metadata: { labels: { en: "Pronunciation readings" } },
                        ordered: true,
                        onDelete: "restrict",
                        presentationRole: "pronunciation",
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(root, "content", "words", "words.json"), [
        { id: "sentences:word:language-name", label: "language" },
    ]);
    await writeJson(path.join(root, "content", "particles", "particles.json"), [
        { id: "sentences:particle:ga", label: "g" },
    ]);
    const sentenceFile = path.join(
        root,
        "content",
        "sentences",
        "sentences.json",
    );
    const references = [
        {
            entryId: "sentences:word:language-name",
            relation: "words",
            position: 0,
        },
        {
            entryId: "sentences:particle:ga",
            relation: "particles",
            position: 1,
        },
        {
            entryId: "sentences:word:language-name",
            relation: "pronunciation-readings",
            position: 0,
        },
    ];
    await writeJson(sentenceFile, [
        { id: "sentences:sentence:valid", label: "languageg", references },
    ]);
    const plan = await inspectContentPack(root);
    assert.equal(
        plan.records.find(({ layer }) => layer === "sentences")?.class,
        "sentences",
    );

    await writeJson(sentenceFile, [
        {
            id: "sentences:sentence:invalid",
            label: "languageglikek",
            references,
        },
    ]);
    await assert.rejects(
        inspectContentPack(root),
        /ordered_sequence_content_unresolved/,
    );
});

test("reference images are validated, bundled and preserved in content-pack plans", async (context) => {
    const root = await mkdtemp(
        path.join(os.tmpdir(), "cognis-library-images-"),
    );
    context.after(() => rm(root, { recursive: true, force: true }));
    await cp(
        fileURLToPath(new URL("../fixtures/external-pack", import.meta.url)),
        root,
        { recursive: true },
    );
    const schemaPath = path.join(root, "schema.json");
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const layer = schema.layers.find(({ id }) => id === "words");
    layer.fields.push({
        id: "images",
        type: "imageList",
        metadata: { labels: { en: "Images" } },
        input: { control: "imageFiles" },
    });
    await writeFile(schemaPath, JSON.stringify(schema));
    const contentPath = path.join(root, "content", "words", "words.json");
    const content = JSON.parse(await readFile(contentPath, "utf8"));
    content[0].fields.images = ["dog.png"];
    await writeFile(contentPath, JSON.stringify(content));
    const bytes = Buffer.from("89504e470d0a1a0a00000000", "hex");
    await writeFile(path.join(root, "assets", "dog.png"), bytes);
    const plan = await inspectContentPack(root);
    assert.equal(
        plan.assets.find(({ path }) => path === "dog.png")?.mediaType,
        "image/png",
    );
    assert.deepEqual(
        plan.records.find(({ layer }) => layer === "words")?.fields.images,
        ["dog.png"],
    );
    await writeFile(path.join(root, "assets", "dog.png"), "<svg/>");
    await assert.rejects(inspectContentPack(root), /unsupported_image_type/);
});
