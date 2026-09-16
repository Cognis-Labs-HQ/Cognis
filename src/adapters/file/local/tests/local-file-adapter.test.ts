import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalFileGateway } from "../index.js";

test("local file gateway put/get/delete", async () => {
    const root = await mkdtemp(join(tmpdir(), "cognis-files-"));
    try {
        const gateway = new LocalFileGateway(root);
        await gateway.put("profile", "avatars/u1.txt", Buffer.from("abc"));
        const content = await gateway.get("profile", "avatars/u1.txt");
        assert.equal(Buffer.from(content ?? []).toString("utf8"), "abc");
        const removed = await gateway.delete("profile", "avatars/u1.txt");
        assert.equal(removed, true);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("local file gateway store generates unique actor-scoped keys", async () => {
    const root = await mkdtemp(join(tmpdir(), "cognis-files-"));
    try {
        const gateway = new LocalFileGateway(root);
        const result = await gateway.store(
            "profile",
            "user1",
            Buffer.from("img data"),
            "image/png",
        );
        assert.match(result.key, /^user1\/[0-9a-f-]+\.png$/);
        const content = await gateway.get("profile", result.key);
        assert.equal(Buffer.from(content ?? []).toString("utf8"), "img data");

        const result2 = await gateway.store(
            "profile",
            "user1",
            Buffer.from("more data"),
            "image/png",
        );
        assert.notEqual(result.key, result2.key);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("local file gateway isolates namespaces on disk", async () => {
    const root = await mkdtemp(join(tmpdir(), "cognis-files-"));
    try {
        const gateway = new LocalFileGateway(root);
        await gateway.put("user", "shared.txt", Buffer.from("user-ns"));
        await gateway.put("profile", "shared.txt", Buffer.from("profile-ns"));
        const userContent = await gateway.get("user", "shared.txt");
        const profileContent = await gateway.get("profile", "shared.txt");
        assert.equal(
            Buffer.from(userContent ?? []).toString("utf8"),
            "user-ns",
        );
        assert.equal(
            Buffer.from(profileContent ?? []).toString("utf8"),
            "profile-ns",
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

test("local file gateway rejects path traversal outside namespace root", async () => {
    const root = await mkdtemp(join(tmpdir(), "cognis-files-"));
    try {
        const gateway = new LocalFileGateway(root);
        await assert.rejects(
            gateway.put("profile", "../escape.txt", Buffer.from("abc")),
            /invalid_file_storage_path/,
        );
        await assert.rejects(
            gateway.put("../profile", "avatar.txt", Buffer.from("abc")),
            /invalid_file_storage_path/,
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});
