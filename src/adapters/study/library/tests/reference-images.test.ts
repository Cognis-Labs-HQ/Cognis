import assert from "node:assert/strict";
import test from "node:test";
import {
    LibraryImageStore,
    validateReferenceImage,
    MAX_IMAGE_UPLOAD_BYTES,
} from "../image-store.js";
import { LibraryImages } from "../service/images.js";
import { createLibraryFlow } from "./reuse/flows.js";
import type { LibrarySchema, LibraryEntry } from "../types.js";

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
