import assert from "node:assert/strict";
import test from "node:test";
import type { NamespaceFileService } from "../reuse/namespace-file-service.js";
import { FileLibraryService } from "../reuse/library-service.js";

function createService() {
    const files = {
        list: async (namespaceId: string) => [
            {
                key: `${namespaceId}.txt`,
                size: 4,
                lastModified: new Date("2026-01-01T00:00:00Z"),
            },
        ],
    } as NamespaceFileService;
    return new FileLibraryService(files, async () => [
        { id: "class-a", languageCode: "ja" },
    ]);
}

test("library decorates provider-neutral storage objects", async () => {
    const library = createService();
    const entries = await library.list("teacher", "teacher", ["user"]);
    assert.equal(entries[0]?.namespaceId, "user");
    assert.equal(entries[0]?.providerId, "local");
    assert.equal(entries[0]?.favorite, false);
});

test("teacher folders synchronize once per classroom", async () => {
    const library = createService();
    await library.listFolders("teacher", "teacher");
    const folders = await library.listFolders("teacher", "teacher");
    assert.equal(folders.length, 1);
    assert.equal(folders[0]?.classId, "class-a");
    assert.equal(folders[0]?.namespaceId, "classes");
});

test("virtual organization never changes the physical object key", async () => {
    const library = createService();
    library.updateEntry("teacher", "user", "user.txt", {
        favorite: true,
        folderId: "folder-a",
    });
    const [entry] = await library.list("teacher", "teacher", ["user"]);
    assert.equal(entry?.key, "user.txt");
    assert.equal(entry?.folderId, "folder-a");
    assert.equal(entry?.favorite, true);
});
