import assert from "node:assert/strict";
import test from "node:test";
import { localizedLabels } from "../reuse/localized-labels.js";

test("backend reward metadata uses translated labels and English fallback for missing or blank values", async () => {
    const read = async (file: URL) =>
        file.pathname.includes("/en/")
            ? '<resources><string name="reward.title">Independent</string><string name="reward.description">Complete practice.</string></resources>'
            : '<resources><string name="reward.title">Selbstständig</string><string name="reward.description"> </string></resources>';
    assert.deepEqual(
        await localizedLabels(
            new URL("file:///labels/"),
            "de",
            "reward.",
            ["title", "description"],
            read,
        ),
        { title: "Selbstständig", description: "Complete practice." },
    );
    await assert.rejects(
        localizedLabels(
            new URL("file:///labels/"),
            "de",
            "reward.",
            ["missing"],
            read,
        ),
        /missing_translation:reward.missing/,
    );
});
