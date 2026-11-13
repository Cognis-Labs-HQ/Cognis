import assert from "node:assert/strict";
import test from "node:test";
import {
    LibraryImageStore,
    hasImageReference,
    validateReferenceImage,
    MAX_IMAGE_UPLOAD_BYTES,
} from "../../image-store.js";
import { LibraryImages } from "../../service/images.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type { LibrarySchema, LibraryEntry } from "../../types.js";

const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
const actor = { accountId: "alice", role: "user" };
const schema: LibrarySchema = {
    id: "images",
    version: 1,
    namespace: "images",
    language: "en",
    layers: [
        {
            id: "words",
            fields: [
                {
                    id: "pictures",
                    type: "imageList",
                    input: { control: "imageFiles" },
                },
            ],
        },
    ],
};

test("reference image upload validates bytes and keeps files private; reads follow card and staged-request access through registered flows", async () => {
    const stored = new Map<string, Uint8Array>();
    const files = new LibraryImageStore({
        put: async (_actor, key, data, options) => {
            assert.equal(options.publicRead, false);
            stored.set(key, data);
        },
        get: async (_actor, key) => stored.get(key),
    } as never);
    let readable = true;
    let stagedReadable = false;
    let entry: LibraryEntry;
    const flows: string[] = [];
    const images = new LibraryImages({
        files,
        flow: createLibraryFlow((id) => flows.push(id)),
        schema: () => schema,
        read: async () => (readable ? entry : null),
        readRequest: async () => (stagedReadable ? entry : null),
        asset: async () => null,
        isReferenced: async () => false,
    });
    const uploaded = await images.upload(actor, "image/png", png);
    entry = {
        id: "card",
        schemaId: schema.id,
        layer: "words",
        label: "dog",
        fields: { pictures: [uploaded.value] },
        scope: "user",
        scopeId: "alice",
        createdBy: "alice",
    } as LibraryEntry;
    assert.deepEqual(
        (await images.read(actor, "card", "pictures", 0)).data,
        png,
    );
    readable = false;
    await assert.rejects(
        images.read(actor, "card", "pictures", 0),
        /not_found/,
    );
    await assert.rejects(
        images.read(actor, "request", "pictures", 0, true),
        /not_found/,
    );
    stagedReadable = true;
    assert.deepEqual(
        (await images.read(actor, "request", "pictures", 0, true)).data,
        png,
    );
    await assert.rejects(
        images.read(actor, "request", "pictures", -1, true),
        /image_not_found/,
    );
    await images.validate(actor, schema, "words", entry.fields);
    await assert.rejects(
        images.validate(
            { accountId: "bob", role: "user" },
            schema,
            "words",
            entry.fields,
        ),
        /forbidden/,
    );
    await images.validate(
        { accountId: "bob", role: "user" },
        schema,
        "words",
        entry.fields,
        entry.fields,
    );
    assert.deepEqual(flows, [
        "study:library:uploadImage",
        ...Array(5).fill("study:library:readImage"),
    ]);
});

test("image uploads reject MIME mismatches, active content and oversized payloads", () => {
    validateReferenceImage("image/png", png);
    assert.throws(
        () => validateReferenceImage("image/jpeg", png),
        /unsupported_image_type/,
    );
    assert.throws(
        () => validateReferenceImage("image/svg+xml", Buffer.from("<svg/>")),
        /unsupported_image_type/,
    );
    assert.throws(
        () =>
            validateReferenceImage(
                "image/png",
                new Uint8Array(MAX_IMAGE_UPLOAD_BYTES + 1),
            ),
        /image_upload_too_large/,
    );
});

test("discarding staged images follows owner authorization and keeps images referenced by cards or requests", async () => {
    const stored = new Map<string, Uint8Array>();
    const files = new LibraryImageStore({
        put: async (_actor, key, data) => {
            stored.set(key, data);
        },
        get: async (_actor, key) => stored.get(key),
        delete: async (_actor, key) => stored.delete(key),
    } as never);
    const referenced = new Set<string>();
    const runs: string[] = [];
    const images = new LibraryImages({
        files,
        flow: createLibraryFlow((id) => runs.push(id)),
        schema: () => schema,
        read: async () => null,
        readRequest: async () => null,
        asset: async () => null,
        isReferenced: async (value) => referenced.has(value),
    });
    const uploaded = await images.upload(actor, "image/png", png);
    await assert.rejects(
        images.discard({ accountId: "other", role: "admin" }, uploaded.value),
        /forbidden/,
    );
    referenced.add(uploaded.value);
    assert.deepEqual(await images.discard(actor, uploaded.value), {
        discarded: false,
    });
    assert.equal(stored.size, 1);
    referenced.clear();
    assert.deepEqual(await images.discard(actor, uploaded.value), {
        discarded: true,
    });
    assert.equal(stored.size, 0);
    assert.equal(
        runs.filter((id) => id === "study:library:discardImage").length,
        3,
    );
});

test("image cleanup detects references in saved fields, pending graphs and historical request snapshots", async () => {
    const value = "file:uploads/alice/123.image";
    let entryRows: Array<Record<string, unknown>> = [
        { fields_json: JSON.stringify({ images: [value] }) },
    ];
    let requestRows: Array<Record<string, unknown>> = [];
    const database = {
        executeCommand: async ({ table }) => ({
            rows: table === "study_library_entries" ? entryRows : requestRows,
        }),
    };
    assert.equal(await hasImageReference(database as never, value), true);
    entryRows = [];
    requestRows = [
        {
            proposed_entry_json: JSON.stringify({
                linkedEntries: [{ entry: { fields: { images: [value] } } }],
            }),
        },
    ];
    assert.equal(await hasImageReference(database as never, value), true);
    requestRows = [
        {
            source_context_json: JSON.stringify([
                { fields: { images: [value] } },
            ]),
        },
    ];
    assert.equal(await hasImageReference(database as never, value), true);
    requestRows = [
        {
            source_entry_json: JSON.stringify({
                fields: { images: [value + ".other"] },
            }),
        },
    ];
    assert.equal(await hasImageReference(database as never, value), false);
});
