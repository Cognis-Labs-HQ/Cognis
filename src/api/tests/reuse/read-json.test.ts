import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { readJson } from "../../reuse/read-json.js";

test("bounded JSON counts UTF-8 bytes before parsing and stops consuming oversized bodies", async () => {
    const body = JSON.stringify({ value: "猫𠮷" });
    assert.deepEqual(
        await readJson(Readable.from([body]) as IncomingMessage, {
            maxBytes: Buffer.byteLength(body),
        }),
        { value: "猫𠮷" },
    );
    const request = Readable.from(
        (async function* () {
            yield Buffer.alloc(17, 32);
            yield Buffer.from(body);
        })(),
        { highWaterMark: 1 },
    ) as IncomingMessage;
    await assert.rejects(
        readJson(request, { maxBytes: 16 }),
        /request_body_too_large/,
    );
    assert.equal(request.destroyed, true);
    await assert.rejects(
        readJson(Readable.from([body]) as IncomingMessage, {
            maxBytes: body.length,
        }),
        /request_body_too_large/,
    );
});

test("bounded JSON retains empty-request handling and reports malformed JSON", async () => {
    assert.deepEqual(
        await readJson(Readable.from([]) as IncomingMessage, { maxBytes: 16 }),
        {},
    );
    await assert.rejects(
        readJson(Readable.from(["{"]) as IncomingMessage, { maxBytes: 16 }),
        SyntaxError,
    );
});

test("object JSON rejects valid non-object shapes as client errors", async () => {
    for (const body of ["null", "[]", "12", '"text"', "true"]) {
        await assert.rejects(
            readJson(Readable.from([body]) as IncomingMessage),
            {
                message: "invalid_request_body",
                status: 400,
            },
        );
    }
    assert.deepEqual(
        await readJson(
            Readable.from(['{"items":[],"value":null}']) as IncomingMessage,
        ),
        { items: [], value: null },
    );
});

test("array request contracts accept arrays explicitly without weakening object routes", async () => {
    assert.deepEqual(
        await readJson(
            Readable.from(['[{"enabled":true}]']) as IncomingMessage,
            { shape: "array" },
        ),
        [{ enabled: true }],
    );
    for (const body of ["null", "{}", "false", '"text"'])
        await assert.rejects(
            readJson(Readable.from([body]) as IncomingMessage, {
                shape: "array",
            }),
            { status: 400, message: "invalid_request_body" },
        );
});
