import assert from "node:assert/strict";
import test from "node:test";
import { registerHttpCommand } from "../http-command-plugin.ts";
import { collectWizardFields } from "../wizard.ts";
import type { CommandHandler } from "../types.ts";
import { parseInputValue, validateInputField } from "../reuse/input-fields.ts";

test("required fields require presence, not collection cardinality", () => {
    for (const [type, value] of [
        ["string[]", []],
        ["json", {}],
        ["json", []],
        ["json", null],
        ["boolean", false],
        ["number", 0],
    ] as const) {
        validateInputField({ name: "value", type, required: true }, value);
    }
    assert.throws(
        () => validateInputField({ name: "value", required: true }, undefined),
        /Missing required wizard field: value/,
    );
});

test("declared types reject values that would become malformed JSON", () => {
    for (const [type, values] of [
        ["number", [NaN, Infinity, -Infinity, "1", null]],
        ["boolean", ["false", 0, null]],
        ["string[]", [false, null, "[]", [1], ["one", false]]],
        ["string", [1, false, null, []]],
        ["json", [{ value: Infinity }, [NaN]]],
    ] as const) {
        for (const value of values) {
            assert.throws(
                () => validateInputField({ name: "value", type }, value),
                /Invalid input field: value/,
            );
        }
    }
});

test("typed parsing preserves exact strings, false, zero and empty arrays", () => {
    assert.equal(
        parseInputValue("  secret  ", { name: "password" }),
        "  secret  ",
    );
    assert.equal(parseInputValue("0", { name: "value", type: "number" }), 0);
    for (const value of ["false", "no", "0", "off"]) {
        assert.equal(
            parseInputValue(value, { name: "value", type: "boolean" }),
            false,
        );
    }
    assert.throws(
        () => parseInputValue("maybe", { name: "value", type: "boolean" }),
        /Invalid input field/,
    );
    for (const [input, expected] of [
        ["[]", []],
        ['["one", "two"]', ["one", "two"]],
        ["one, two", ["one", "two"]],
    ] as const) {
        assert.deepEqual(
            parseInputValue(input, { name: "value", type: "string[]" }),
            expected,
        );
    }
    // The owning API, not the generic CLI, decides whether a string is a valid ID.
    validateInputField({ name: "ids", type: "string[]" }, [" "]);
});

test("ambiguous path, query and body fields are rejected before registration", async () => {
    for (const fields of [
        { params: ["target"], bodyFields: [{ name: "target" }] },
        { params: ["target"], queryFields: [{ name: "target" }] },
        { bodyFields: [{ name: "value" }], queryFields: [{ name: "value" }] },
        { params: ["target", "target"] },
    ]) {
        let registered = false;
        assert.throws(
            () =>
                registerHttpCommand(
                    {
                        name: "fixture:ambiguous",
                        method: "POST",
                        path: "/fixture/:target",
                        description: "Fixture",
                        ...fields,
                    },
                    () => {
                        registered = true;
                    },
                ),
            /Duplicate command input field/,
        );
        assert.equal(registered, false);
    }
    await assert.rejects(
        collectWizardFields("fixture:duplicate", [
            { name: "target" },
            { name: "target" },
        ]),
        /Duplicate command input field/,
    );
});

test("accepted query values are serialized without dropping empty or falsy data", async () => {
    let handler: CommandHandler | undefined;
    registerHttpCommand(
        {
            name: "fixture:query-values",
            method: "GET",
            path: "/fixture/query",
            description: "Fixture",
            queryFields: [
                { name: "empty", required: true },
                { name: "nothing", type: "json", required: true },
                { name: "disabled", type: "boolean", required: true },
                { name: "count", type: "number", required: true },
                { name: "list", type: "string[]", required: true },
                { name: "omitted" },
            ],
        },
        (_name, registered) => {
            handler = registered;
        },
    );
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    globalThis.fetch = async (url) => {
        urls.push(String(url));
        return Response.json({ data: { accepted: true } });
    };
    try {
        await handler!({
            args: [
                '{"empty":"","nothing":null,"disabled":false,"count":0,"list":[]}',
            ],
            apiBaseUrl: "https://cli-audit.invalid",
            getApiToken: async () => "fixture-only",
        });
        assert.deepEqual(urls, [
            "https://cli-audit.invalid/fixture/query?empty=&nothing=null&disabled=false&count=0&list=",
        ]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});
