import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("messages asset registrations do not use query-string versioning", () => {
    const adapterSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );
    const htmlSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/index.html"),
        "utf8",
    );

    assert.doesNotMatch(adapterSource, /\?v=/);
    assert.doesNotMatch(htmlSource, /\?v=/);
});

test("meeting-linked chat reuse does not rename existing group chats", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/index.ts"),
        "utf8",
    );

    assert.match(source, /const existing =[\s\S]*findGroupByExactMembers/);
    assert.doesNotMatch(source, /updateRoomTitle\(existing\.id, title\)/);
});
