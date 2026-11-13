import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Publish a complete JSON snapshot without exposing partial writes to concurrent readers. */
export async function writeMarketplaceSnapshot(
    file: string,
    value: unknown,
): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, JSON.stringify(value, null, 2), {
            mode: 0o600,
            flag: "wx",
        });
        await rename(temporary, file);
    } finally {
        await rm(temporary, { force: true });
    }
}
