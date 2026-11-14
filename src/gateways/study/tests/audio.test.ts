import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { StudyAudio } from "../audio.js";

const input = { language: "en", label: "dog", semanticRole: "lexicalUnit" };

function fixture() {
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:audio:fetch",
        stages: ["validate", "fetch"],
    });
    const logs: unknown[][] = [];
    return {
        audio: new StudyAudio(ctx.flow, (...args) => logs.push(args)),
        logs,
    };
}

test("audio providers execute ctx stages, deduplicate pending fetches, and release on removal", async () => {
    const { audio } = fixture();
    let calls = 0;
    const remove = audio.registerProvider({
        id: "voice",
        revision: "one",
        languages: ["en"],
        async fetchAudio() {
            calls++;
            await new Promise((resolve) => setImmediate(resolve));
            return { mediaType: "audio/mpeg", data: new Uint8Array([1, 2]) };
        },
    });
    assert.equal(audio.supports("en", "orderedLexicalSequence"), true);
    const key = audio.cacheKey(input);
    const [first, second] = await Promise.all([
        audio.fetchAudio(input),
        audio.fetchAudio(input),
    ]);
    assert.equal(calls, 1);
    assert.deepEqual(first, second);
    remove();
    assert.equal(audio.supports("en", "lexicalUnit"), false);
    assert.throws(() => audio.cacheKey(input), /audio_lookup_unavailable/);
    audio.registerProvider({
        id: "voice",
        revision: "two",
        languages: ["en"],
        async fetchAudio() {
            return first;
        },
    });
    assert.notEqual(audio.cacheKey(input), key);
    audio.dispose();
    assert.equal(audio.supports("en", "lexicalUnit"), false);
});

test("audio boundaries reject conflicting providers, oversized results, and invalid input", async () => {
    const { audio, logs } = fixture();
    const provider = {
        id: "voice",
        revision: "one",
        languages: ["en"],
        async fetchAudio() {
            return { mediaType: "text/html", data: new Uint8Array([1]) };
        },
    };
    audio.registerProvider(provider);
    assert.throws(
        () => audio.registerProvider({ ...provider, id: "other" }),
        /audio_provider_conflict/,
    );
    await assert.rejects(
        audio.fetchAudio({ ...input, label: "x".repeat(201) }),
        /audio_lookup_unavailable/,
    );
    await assert.rejects(audio.fetchAudio(input), /invalid_audio_recording/);
    assert.ok(logs.some(([level]) => level === "error"));
});

test("removing an audio provider aborts in-flight retrieval", async () => {
    const { audio } = fixture();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
        started = resolve;
    });
    const remove = audio.registerProvider({
        id: "voice",
        revision: "one",
        languages: ["en"],
        async fetchAudio(_input, signal) {
            started();
            await new Promise((_resolve, reject) =>
                signal.addEventListener(
                    "abort",
                    () => reject(new Error("audio_aborted")),
                    { once: true },
                ),
            );
            throw new Error("unreachable");
        },
    });
    const pending = audio.fetchAudio(input);
    await ready;
    remove();
    await assert.rejects(pending, /audio_aborted/);
});

test("language registration discovers speech dynamically and omits an unset voice", async () => {
    const ctx = createCtx();
    ctx.registerFlow({
        id: "study:audio:fetch",
        stages: ["validate", "fetch"],
    });
    const requests: unknown[] = [];
    let speech: import("@cognis/core").SpeechSynthesisCapability | undefined;
    let voiceId: string | undefined;
    const audio = new StudyAudio(ctx.flow);
    const remove = audio.registerLanguage(
        "en",
        () => ({ voiceId }),
        () => speech,
    );
    assert.equal(audio.supports("en", "lexicalUnit"), false);
    speech = {
        revision: "one",
        synthesize: async (input) => {
            requests.push(input);
            return { mediaType: "audio/mpeg", data: new Uint8Array([1]) };
        },
    };
    await audio.fetchAudio(input);
    assert.deepEqual(requests[0], { text: "dog", language: "en" });
    const firstKey = audio.cacheKey(input);
    voiceId = "different";
    await audio.fetchAudio(input);
    assert.deepEqual(requests[1], { text: "dog", language: "en", voiceId });
    assert.notEqual(audio.cacheKey(input), firstKey);
    speech = undefined;
    assert.equal(audio.supports("en", "lexicalUnit"), false);
    await assert.rejects(audio.fetchAudio(input), /audio_lookup_unavailable/);
    remove();
    assert.equal(audio.supports("en", "lexicalUnit"), false);
});
