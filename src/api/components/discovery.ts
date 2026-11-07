import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface CoreComponentDependency {
    id: string;
    uuid: string;
    name: string;
    gatewayId?: string;
    version?: string;
    required?: boolean;
    adapterId?: string;
}

export async function discoverCoreComponentDependencies(
    roots: readonly string[],
): Promise<CoreComponentDependency[]> {
    const components: CoreComponentDependency[] = [];
    const visit = async (root: string): Promise<void> => {
        let entries;
        try {
            entries = await readdir(root, { withFileTypes: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
            throw error;
        }
        for (const entry of entries) {
            const entryPath = path.join(root, entry.name);
            if (entry.isDirectory()) {
                await visit(entryPath);
                continue;
            }
            if (entry.name !== "manifest.json") continue;
            const manifest = JSON.parse(await readFile(entryPath, "utf8")) as {
                id?: unknown;
                uuid?: unknown;
                name?: unknown;
                gateway?: unknown;
                version?: string;
                required?: boolean;
                adapterId?: string;
            };
            if (
                typeof manifest.id !== "string" ||
                typeof manifest.uuid !== "string" ||
                typeof manifest.name !== "string"
            )
                continue;
            components.push({
                id: manifest.id,
                uuid: manifest.uuid,
                name: manifest.name,
                ...(manifest.version ? { version: manifest.version } : {}),
                ...(manifest.required !== undefined
                    ? { required: manifest.required }
                    : {}),

                ...(typeof manifest.gateway === "string"
                    ? {
                          gatewayId: manifest.gateway,
                          adapterId: path.basename(root),
                      }
                    : {}),
            });
        }
    };
    for (const root of roots) await visit(root);
    return components;
}
