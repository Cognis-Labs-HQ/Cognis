import assert from "node:assert/strict";
import test from "node:test";
import { readSharePassphrase } from "../reuse/share-auth.js";

test("readSharePassphrase prefers explicit header over query", () => {
    const passphrase = readSharePassphrase(
        {
            headers: {
                "x-cognis-calendar-passphrase": "header-secret",
            },
        },
        new URL("http://localhost/calendar.ics?passphrase=query-secret"),
    );
    assert.equal(passphrase, "header-secret");
});

test("readSharePassphrase prefers basic auth over query", () => {
    const encoded = Buffer.from("user:basic-secret", "utf8").toString("base64");
    const passphrase = readSharePassphrase(
        {
            headers: {
                authorization: `Basic ${encoded}`,
            },
        },
        new URL("http://localhost/calendar.ics?passphrase=query-secret"),
    );
    assert.equal(passphrase, "basic-secret");
});
