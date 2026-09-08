import assert from "node:assert/strict";
import test from "node:test";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../../api/tests/reuse/route-test-helpers.js";
import { createLibraryRoutes } from "../routes/index.js";

const schemas = [
    {
        id: "japanese",
        version: 1,
        language: "JA",
        label: "Japanese",
        layers: [],
    },
    { id: "german", version: 1, language: "de", label: "German", layers: [] },
    {
        id: "private-use",
        version: 1,
        language: "X-Test",
        label: "Test Language",
        layers: [],
    },
];

async function request(path: string, token = "learner") {
    const route = createLibraryRoutes(
        { listSchemas: () => schemas } as never,
        createAuthContext(
            new Map([["learner", { sub: "alice", role: "user" }]]),
        ) as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({ method: "GET", token }) as never,
        response as never,
        new URL(`http://localhost${path}`),
    );
    return {
        status: response.statusCode,
        body: JSON.parse(response.payload),
    };
}

test("schema route returns only the requested BCP-47 language", async () => {
    const result = await request("/api/v1/study/library/schemas?language=JA");
    assert.equal(result.status, 200);
    assert.deepEqual(
        result.body.data.map((schema: { id: string }) => schema.id),
        ["japanese"],
    );
});

test("schema route rejects malformed language codes", async () => {
    const result = await request(
        "/api/v1/study/library/schemas?language=not_a_language",
    );
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "invalid_language");
});

test("schema route supports private-use BCP-47 languages", async () => {
    const result = await request(
        "/api/v1/study/library/schemas?language=x-test",
    );
    assert.equal(result.status, 200);
    assert.deepEqual(
        result.body.data.map((schema: { id: string }) => schema.id),
        ["private-use"],
    );
});

test("schema route rejects unauthorized requests", async () => {
    const result = await request(
        "/api/v1/study/library/schemas?language=ja",
        "",
    );
    assert.equal(result.status, 401);
    assert.equal(result.body.error.code, "unauthorized");
});

test("entry deletion passes validated selections to the Library capability", async () => {
    let request:
        | {
              actor: { accountId: string; role: string };
              entryIds: readonly string[];
              blacklistContentHashes: boolean;
          }
        | undefined;
    const route = createLibraryRoutes(
        {
            deleteEntries: async (actor, entryIds, blacklistContentHashes) => {
                request = { actor, entryIds, blacklistContentHashes };
            },
        } as never,
        createAuthContext(
            new Map([["admin", { sub: "ada", role: "admin" }]]),
        ) as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({
            method: "DELETE",
            token: "admin",
            body: JSON.stringify({
                entryIds: ["one", "two"],
                blacklistContentHashes: true,
            }),
        }) as never,
        response as never,
        new URL("http://localhost/api/v1/study/library/entries"),
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(request, {
        actor: { accountId: "ada", role: "admin" },
        entryIds: ["one", "two"],
        blacklistContentHashes: true,
    });
});

test("asset route keeps authenticated package bytes out of shared caches", async () => {
    const route = createLibraryRoutes(
        {
            readContentPackAsset: async () => ({
                mediaType: "image/svg+xml",
                data: Buffer.from("<svg/>"),
            }),
        } as never,
        createAuthContext(
            new Map([["learner", { sub: "alice", role: "user" }]]),
        ) as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({ method: "GET", token: "learner" }) as never,
        response as never,
        new URL(
            "http://localhost/api/v1/study/library/assets/Publisher/pack/1.0.0/strokes/a.svg",
        ),
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "image/svg+xml");
    assert.equal(response.headers["cache-control"], "private, no-store");
    assert.equal(response.payload, "<svg/>");
});

test("Library browser resolves labels from localized schema metadata", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
        new URL("../ui/app/index.js", import.meta.url),
        "utf8",
    );
    const presentationSource = await readFile(
        new URL("../ui/app/presentation.js", import.meta.url),
        "utf8",
    );
    assert.match(
        source,
        /localizedLabel\(\s*schema\.metadata,\s*schema\.language,?\s*\)/,
    );
    assert.match(
        source,
        /localizedLabel\(\s*layer\.metadata,\s*schema\.language,?\s*\)/,
    );
    assert.match(presentationSource, /parseLanguageCode\(language\)/);
    assert.match(
        presentationSource,
        /import \{ parseLanguageCode \} from "\/static\/gateways\/study\/ui\/language\.js"/,
    );
});

test("remote audio cache remains behind authenticated entry access", async () => {
    let requestedEntry = "";
    let requestedField = "";
    const route = createLibraryRoutes(
        {
            readAudio: async (_actor, entryId, fieldId) => {
                requestedEntry = entryId;
                requestedField = fieldId;
                return { mediaType: "audio/mpeg", data: Buffer.from("audio") };
            },
        } as never,
        createAuthContext(
            new Map([["learner", { sub: "alice", role: "user" }]]),
        ) as never,
    );
    const response = new ResponseRecorder();
    await route(
        new RequestRecorder({ method: "GET", token: "learner" }) as never,
        response as never,
        new URL(
            "http://localhost/api/v1/study/library/entries/character-a/audio/audio",
        ),
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["content-type"], "audio/mpeg");
    assert.equal(response.headers["cache-control"], "private, max-age=86400");
    assert.equal(requestedEntry, "character-a");
    assert.equal(requestedField, "audio");
});
