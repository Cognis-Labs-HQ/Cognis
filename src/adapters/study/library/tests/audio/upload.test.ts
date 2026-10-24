import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { LibraryAudioCache } from "../../audio-cache.js";
import {
    MAX_AUDIO_UPLOAD_BYTES,
    storeUploadedAudio,
    validateAudioUpload,
    validateUploadedAudioFields,
} from "../../service/uploads.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type { NamespaceFileClient } from "@cognis/core";
import type { LibrarySchema } from "../../types.js";
import { readRawBody } from "../../../../../api/reuse/read-json.js";

const actor = { accountId: "alice", role: "user" };
const schema = {
    layers: [{ id: "words", fields: [{ id: "audio", type: "audio" }] }],
} as LibrarySchema;

function recording(size = 12) {
    const data = Buffer.alloc(size);
    data.write("RIFF");
    data.write("WAVE", 8);
    return data;
}

test("audio uploads enforce the 5 MiB boundary and verified media signatures", async () => {
    validateAudioUpload("audio/wav", recording(MAX_AUDIO_UPLOAD_BYTES));
    assert.throws(
        () =>
            validateAudioUpload(
                "audio/wav",
                recording(MAX_AUDIO_UPLOAD_BYTES + 1),
            ),
        /audio_upload_too_large/,
    );
    assert.throws(
        () => validateAudioUpload("audio/mpeg", recording()),
        /unsupported_audio_type/,
    );
    const request = Readable.from([
        recording(MAX_AUDIO_UPLOAD_BYTES),
        Buffer.from([1]),
    ]) as IncomingMessage;
    await assert.rejects(
        readRawBody(request, { maxBytes: MAX_AUDIO_UPLOAD_BYTES }),
        /request_body_too_large/,
    );
});

test("owned uploads execute authorization before persistence and reject foreign attachments", async () => {
    const objects = new Map<string, Uint8Array>();
    const cache = new LibraryAudioCache({
        get: async (_actor, key) => objects.get(key) ?? null,
        put: async (_actor, key, data) => {
            objects.set(key, data);
        },
    } as NamespaceFileClient);
    let authorized = false;
    const upload = await storeUploadedAudio(actor, "audio/wav", recording(), {
        cache,
        flow: createLibraryFlow(),
        authorize: async (_actor, location) => {
            authorized = true;
            return location;
        },
    });
    assert.equal(authorized, true);
    assert.match(upload.value, /^file:uploads\/alice\//);
    await validateUploadedAudioFields(
        actor,
        schema,
        "words",
        { audio: upload.value },
        {},
        cache,
    );
    await assert.rejects(
        validateUploadedAudioFields(
            { accountId: "bob", role: "user" },
            schema,
            "words",
            { audio: upload.value },
            {},
            cache,
        ),
        /forbidden/,
    );
    await assert.rejects(
        validateUploadedAudioFields(
            actor,
            schema,
            "words",
            { audio: "file:lookups/private.audio" },
            {},
            cache,
        ),
        /invalid_audio_upload/,
    );
    await assert.rejects(
        storeUploadedAudio(actor, "audio/wav", recording(), {
            cache,
            flow: createLibraryFlow(),
            authorize: async () => {
                throw new Error("forbidden");
            },
        }),
        /forbidden/,
    );
    assert.equal(objects.size, 1);
});

test("audio attachments reject traversal and malformed upload paths before consulting storage", async () => {
    let reads = 0;
    const cache = new LibraryAudioCache({
        get: async () => {
            reads++;
            return null;
        },
    } as never);
    for (const value of [
        "file:uploads/alice/../bob/a.audio",
        "file:uploads/alice/nested/a.audio",
        "file:uploads/alice/a.audio/extra",
    ]) {
        await assert.rejects(
            validateUploadedAudioFields(
                actor,
                schema,
                "words",
                { audio: value },
                {},
                cache,
            ),
            /invalid_audio_upload/,
        );
    }
    assert.equal(reads, 0);
});
