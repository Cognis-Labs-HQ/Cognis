import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { serveBrowserFixture } from "./fixture-server.js";

const directory = fileURLToPath(
    new URL("../page-composer/fixtures/", import.meta.url),
);

test("responsive fixture serves unchanged owning-component modules, styles, templates and locales", async (context) => {
    const server = await serveBrowserFixture(directory);
    context.after(() => server.close());
    for (const [url, filename] of [
        [
            "/static/reuse/page-composer/index.js",
            "../../reuse/page-composer/index.js",
        ],
        ["/static/styles/page-builder.css", "../../styles/page-builder.css"],
        [
            "/static/templates/dashboard-layout.html",
            "../../public/templates/dashboard-layout.html",
        ],
        ["/static/languages/en/strings.xml", "../../languages/en/strings.xml"],
    ]) {
        const response = await fetch(server.url + url);
        assert.equal(response.status, 200);
        assert.equal(
            await response.text(),
            await readFile(new URL(filename, import.meta.url), "utf8"),
        );
    }
});

test("fixture preference boundary round-trips profiles without accepting unrelated API writes", async (context) => {
    const server = await serveBrowserFixture(directory);
    context.after(() => server.close());
    const endpoint = "/api/v1/social/users/fixture/preferences/responsive-grid";
    const layout = {
        layoutsByGrid: {
            "cols-12": {
                placements: [{ id: "card", col: 1, row: 2, w: 3, h: 4 }],
                hidden: [],
            },
        },
    };
    const saved = await fetch(server.url + endpoint, {
        method: "PUT",
        body: JSON.stringify({ layout }),
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(
        JSON.parse(
            (await (await fetch(server.url + endpoint)).json()).data.layoutJson,
        ),
        layout,
    );
    const unexpected = await fetch(
        server.url + "/api/v1/social/users/other/preferences/responsive-grid",
        { method: "PUT", body: "{}" },
    );
    assert.equal(unexpected.status, 404);
    assert.equal(server.layouts.size, 1);
});

test("fixture translation keys resolve from the real English catalog", async () => {
    const catalog = await readFile(
        new URL("../../languages/en/strings.xml", import.meta.url),
        "utf8",
    );
    const keys = new Set(
        [...catalog.matchAll(/<string name="([^"]+)"/g)].map(
            (match) => match[1],
        ),
    );
    for (const filename of ["index.html", "fixture.js"]) {
        const source = await readFile(
            new URL(`../page-composer/fixtures/${filename}`, import.meta.url),
            "utf8",
        );
        for (const [key] of source.matchAll(
            /ui\.(?:reuse|layout)\.[a-z_.]+/g,
        )) {
            assert.ok(
                keys.has(key),
                `${filename}: ${key} has an English translation`,
            );
        }
    }
});
