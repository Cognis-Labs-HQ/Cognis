import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";

import test from "node:test";

const userPageSource = await readFile(
    new URL("../page.js", import.meta.url),
    "utf8",
);

test("share popup owns user recipient search and selection", () => {
    assert.match(userPageSource, /data-share-page="user"/);
    assert.match(userPageSource, /share-links-user-search/);
    assert.match(userPageSource, /share-links-user-permission/);
    assert.match(userPageSource, /type="datetime-local"/);
    assert.match(userPageSource, /gatewayFields\.password/);
    assert.match(userPageSource, /defaultGrantedCapabilities/);
    assert.match(userPageSource, /endsWith\(":write"\)/);
    assert.doesNotMatch(userPageSource, /share-links-label/);
});

test("share history supports email delivery and form-based update mode", () => {
    assert.match(userPageSource, /state\.recipients\.length/);
    assert.match(userPageSource, /Update User Share/);
});

test("selected users retain lookup-card placement without visible handles", () => {
    assert.match(
        userPageSource,
        /share-links-user-results[\s\S]*share-links-selected-users/,
    );
});

test("user share permissions constrain granted capabilities", async () => {
    const baseInput = {
        recipients: [{ type: "user", id: "bob" }],
        defaultGrantedCapabilities: ["calendar:read", "calendar:write"],
    };
    const existingShare = {
        id: "share-1",
        label: "Planning",
        expiresAt: "2030-01-01T00:00:00.000Z",
        accessControls: {
            permissions: ["read"],
            recipients: [{ type: "user", id: "bob" }],
        },
    };
    const userPageModule = await import(new URL("../page.js", import.meta.url));
    assert.deepEqual(
        userPageModule.buildCreateOptions({
            ...baseInput,
            permission: "read",
        }).grantedCapabilities,
        ["calendar:read"],
    );
    assert.deepEqual(
        userPageModule.buildCreateOptions({
            ...baseInput,
            permission: "write",
        }).grantedCapabilities,
        ["calendar:read", "calendar:write"],
    );
    assert.equal(
        userPageModule.findExistingShare([existingShare], baseInput),
        existingShare,
    );
    assert.equal(
        userPageModule.hasShareChanges(existingShare, {
            label: "Planning",
            expiresAt: "2030-01-01T00:00:00.000Z",
            accessControls: { permissions: ["read"] },
        }),
        false,
    );
    assert.equal(
        userPageModule.hasShareChanges(existingShare, {
            label: "Updated Planning",
            expiresAt: "2030-01-01T00:00:00.000Z",
            accessControls: { permissions: ["read"] },
        }),
        true,
    );
});

test("share origins can suppress read-only choices", async () => {
    assert.match(userPageSource, /state\.supportsReadOnly \?/);
});

test("share method adapters own localized display metadata", async () => {
    assert.match(userPageSource, /getMetadata/);
    assert.match(userPageSource, /adapter\.share\.user\.name/);
    const adapterSource = await readFile(
        new URL("../index.ts", import.meta.url),
        "utf8",
    );
    assert.match(adapterSource, /nameKey: "adapter\.share\.user\.name"/);
});
