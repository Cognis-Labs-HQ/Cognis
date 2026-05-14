import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import { LanguageLibraryStore } from "../library-store.js";

async function createTempModuleRoot(): Promise<{
    moduleRoot: string;
    cleanup: () => Promise<void>;
}> {
    const moduleRoot = await mkdtemp(path.join(os.tmpdir(), "library-store-"));
    const dataRoot = path.join(moduleRoot, "data");
    await mkdir(path.join(dataRoot, "characters"), { recursive: true });
    await mkdir(path.join(dataRoot, "alt-characters"), { recursive: true });
    await mkdir(path.join(dataRoot, "definitions"), { recursive: true });
    await mkdir(path.join(dataRoot, "words"), { recursive: true });
    await mkdir(path.join(dataRoot, "sentences"), { recursive: true });

    const charData = [
        { id: "test:char:a", symbol: "A", romanization: "a" },
        { id: "test:char:b", symbol: "B", romanization: "b" },
    ];
    await writeFile(
        path.join(dataRoot, "characters", "latin.json"),
        JSON.stringify(charData, null, 2),
        "utf8",
    );
    await writeFile(
        path.join(dataRoot, "alt-characters", "common.json"),
        "[]",
        "utf8",
    );

    const defData = [
        { id: "def:hello", text: "a common English greeting", language: "en" },
    ];
    await writeFile(
        path.join(dataRoot, "definitions", "common.json"),
        JSON.stringify(defData, null, 2),
        "utf8",
    );
    await writeFile(path.join(dataRoot, "words", "common.json"), "[]", "utf8");
    await writeFile(
        path.join(dataRoot, "sentences", "common.json"),
        "[]",
        "utf8",
    );

    return {
        moduleRoot,
        cleanup: () => rm(moduleRoot, { recursive: true, force: true }),
    };
}

test("LanguageLibraryStore: initialise loads characters", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const snapshot = store.snapshot();
        assert.equal(snapshot.characters.length, 2);
        assert.equal(snapshot.characters[0].id, "test:char:a");
        assert.equal(snapshot.characters[1].id, "test:char:b");
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: initialise builds characterClasses index", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const snapshot = store.snapshot();
        assert.equal(snapshot.characterClasses.length, 1);
        assert.equal(snapshot.characterClasses[0].id, "latin");
        assert.deepEqual(snapshot.characterClasses[0].characterIds, [
            "test:char:a",
            "test:char:b",
        ]);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: snapshot returns a deep clone", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const snapshot = store.snapshot();
        snapshot.characters.push({
            id: "mutated",
            symbol: "X",
            romanization: "x",
            characterClass: "latin",
        });
        const snapshotAfterMutation = store.snapshot();
        assert.equal(snapshotAfterMutation.characters.length, 2);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: queryLayer with no filter returns all records", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const rows = store.queryLayer("characters");
        assert.equal(rows.length, 2);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: queryLayer with filter returns matching records", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const rows = store.queryLayer("characters", {
            characterClass: "latin",
        } as any);
        assert.equal(rows.length, 2);
        const rowsNoMatch = store.queryLayer("characters", {
            characterClass: "kanji",
        } as any);
        assert.equal(rowsNoMatch.length, 0);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: queryLayer filters definitions by language code", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const enRows = store.queryLayer("definitions", {
            language: "en",
        } as any);
        assert.equal(enRows.length, 1);
        const jaRows = store.queryLayer("definitions", {
            language: "ja",
        } as any);
        assert.equal(jaRows.length, 0);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: addRecord adds and persists a new character", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        await store.addRecord("characters", {
            id: "test:char:c",
            symbol: "C",
            romanization: "c",
            characterClass: "latin",
        });
        const rows = store.queryLayer("characters");
        assert.equal(rows.length, 3);
        const raw = JSON.parse(
            await readFile(
                path.join(moduleRoot, "data", "characters", "latin.json"),
                "utf8",
            ),
        );
        assert.equal(raw.length, 3);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: addRecord rejects duplicate id", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        await assert.rejects(
            () =>
                store.addRecord("characters", {
                    id: "test:char:a",
                    symbol: "A",
                    romanization: "a",
                    characterClass: "latin",
                }),
            /already exists/,
        );
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: updateRecord updates an existing record", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        const updated = await store.updateRecord("characters", "test:char:a", {
            symbol: "Ā",
        });
        assert.equal(updated.symbol, "Ā");
        const rows = store.queryLayer("characters");
        const updatedRow = rows.find((row) => row.id === "test:char:a");
        assert.equal(updatedRow?.symbol, "Ā");
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: updateRecord rejects missing id", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        await assert.rejects(
            () =>
                store.updateRecord("characters", "nonexistent", {
                    symbol: "X",
                }),
            /not found/,
        );
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: removeRecord removes an existing record", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        await store.removeRecord("definitions", "def:hello");
        const rows = store.queryLayer("definitions");
        assert.equal(rows.length, 0);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: removeRecord rejects missing id", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await store.initialise();
        await assert.rejects(
            () => store.removeRecord("definitions", "nonexistent"),
            /not found/,
        );
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: validateGraph rejects duplicate ids", async () => {
    const { moduleRoot, cleanup } = await createTempModuleRoot();
    try {
        const duplicateData = [
            { id: "test:char:a", symbol: "A", romanization: "a" },
            { id: "test:char:a", symbol: "A2", romanization: "a" },
        ];
        await writeFile(
            path.join(moduleRoot, "data", "characters", "latin.json"),
            JSON.stringify(duplicateData, null, 2),
            "utf8",
        );
        const store = new LanguageLibraryStore({
            moduleRoot,
            languageCode: "test",
        });
        await assert.rejects(() => store.initialise(), /Duplicate id/);
    } finally {
        await cleanup();
    }
});

test("LanguageLibraryStore: dataRoot getter returns correct path", () => {
    const store = new LanguageLibraryStore({
        moduleRoot: "/some/module/root",
        languageCode: "test",
    });
    assert.equal(store.dataRoot, path.join("/some/module/root", "data"));
});
