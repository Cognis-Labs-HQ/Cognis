import { mkdir, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";

export async function writeAdapterFixture(
    root: string,
    definition: {
        id: string;
        uuid?: string;
        requires?: string[];
        bootstrapRequires?: string[];
    },
    fixture: "configured" | "dependent",
): Promise<void> {
    const directory = path.join(root, definition.id);
    await mkdir(directory);
    await writeFile(
        path.join(directory, "package.json"),
        JSON.stringify({
            name: definition.id,
            main: "index.mjs",
            version: "1.0.0",
        }),
    );
    await writeFile(
        path.join(directory, "manifest.json"),
        JSON.stringify({
            uuid: definition.id,
            publisher: "Test",
            requires: [],
            ...definition,
        }),
    );
    await copyFile(
        new URL(`../fixtures/${fixture}-adapter.mjs`, import.meta.url),
        path.join(directory, "index.mjs"),
    );
}
