import assert from "node:assert/strict";
import test from "node:test";
import { pronunciationClass } from "../ui/reuse/pronunciation.js";

test("IPA typography applies to full, composed and inflected phonetic readings", () => {
    for (const reading of [
        "/ˈlæŋɡwɪdʒ/",
        "/ˈlɪvɪŋ/",
        ["/riːd/", "/red/"],
        "/aɪ/ /riːd/",
        "/θ/",
        "/ð/",
    ]) {
        assert.equal(pronunciationClass(reading), "study-ipa");
    }
});

test("ordinary letter names and Japanese readings retain the chosen app typography", () => {
    for (const reading of [
        "ay",
        "double-u",
        "こんにちは",
        "コーヒー",
        "",
        null,
        undefined,
    ]) {
        assert.equal(pronunciationClass(reading), "");
    }
});
