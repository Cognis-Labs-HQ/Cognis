import type { BootstrapLog } from "@cognis/core";
import { readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface ComponentState {
    get(key: string): Promise<string | undefined>;
    set(key: string, channel: string): Promise<void>;
}

/** Component-owned release choices; writes are serialized and atomically replace the file. */
export function createComponentState(
    filename: string,
    log: BootstrapLog = () => {},
): ComponentState {
    let pending = Promise.resolve();
    async function read(): Promise<Record<string, string>> {
        try {
            return JSON.parse(await readFile(filename, "utf8")) as Record<
                string,
                string
            >;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
            throw error;
        }
    }
    return {
        async get(key: string) {
            await pending;
            return (await read())[key];
        },
        set(key: string, channel: string) {
            const next = pending.then(async () => {
                const state = await read();
                state[key] = channel;
                await mkdir(path.dirname(filename), { recursive: true });
                const temporary = `${filename}.${randomUUID()}.tmp`;
                try {
                    await writeFile(temporary, JSON.stringify(state), {
                        mode: 0o600,
                    });
                    await rename(temporary, filename);
                } finally {
                    await rm(temporary, { force: true });
                }
            });
            pending = next.catch((error) => {
                log("error", "Component state write failed.", {
                    component: "api",
                    operation: "persistComponentChannel",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
            });
            return next;
        },
    };
}
