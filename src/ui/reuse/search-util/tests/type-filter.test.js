import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchUrl, filterSearchGroupsForType } from "../matching.js";

test("singular user filter requests the users API result type", () => {
    assert.equal(
        buildSearchUrl("/api/v1/search", "ali", "user"),
        "/api/v1/search?q=ali&type=users",
    );
});

test("user filter excludes unrelated registered result categories", () => {
    const groups = [
        {
            category: "Users",
            items: [{ id: "alice", label: "Alice", resultClass: "text" }],
        },
        {
            category: "Pages",
            items: [{ id: "settings", label: "Settings", resultClass: "page" }],
        },
        {
            category: "Results",
            items: [{ id: "bob", label: "Bob", resultClass: "user" }],
        },
    ];

    assert.deepEqual(filterSearchGroupsForType(groups, "user"), [
        groups[0],
        { ...groups[2], items: [groups[2].items[0]] },
    ]);
});
