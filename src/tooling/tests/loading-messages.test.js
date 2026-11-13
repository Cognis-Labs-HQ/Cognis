import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadingMessagesFromXml } from "../reuse/loading-messages.mjs";

const xml = readFileSync(
    new URL("../../ui/languages/en/strings.xml", import.meta.url),
    "utf8",
);
test("eager loading copy matches English XML; regenerate with sync-loading-messages.mjs", () => {
    const bundle = JSON.parse(
        readFileSync(
            new URL("../../ui/languages/en/loading.json", import.meta.url),
            "utf8",
        ),
    );
    assert.deepEqual(bundle, loadingMessagesFromXml(xml));
});
test("eager loading extraction rejects absent or empty English fallback keys", () => {
    assert.throws(() => loadingMessagesFromXml(""), /Missing translation/);
    assert.throws(
        () =>
            loadingMessagesFromXml(
                xml.replace(
                    /(<string name="ui.reuse.loading_joke_1">)[^<]*/,
                    "$1 ",
                ),
            ),
        /Missing translation/,
    );
});
