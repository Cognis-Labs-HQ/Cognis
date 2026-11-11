import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface CoreComponentDependency {
    id: string;
    uuid: string;
    name: string;
    gatewayId?: string;
    version?: string;
    required?: boolean;
    locked?: boolean;
    adapterId?: string;
}

export async function discoverCoreComponentDependencies(
    roots: readonly string[],
    options: { adaptersRoot?: string } = {},
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
                locked?: boolean;
                adapterId?: string;
            };
            if (
                typeof manifest.id !== "string" ||
                typeof manifest.uuid !== "string" ||
                typeof manifest.name !== "string"
            )
                continue;
            const relativeAdapter = options.adaptersRoot
                ? path
                      .relative(
                          path.resolve(options.adaptersRoot),
                          path.resolve(root),
                      )
                      .split(path.sep)
                : [];
            const gatewayId =
                typeof manifest.gateway === "string"
                    ? manifest.gateway
                    : relativeAdapter.length === 2 &&
                        relativeAdapter.every((segment) =>
                            /^[a-z][a-z0-9-]*$/.test(segment),
                        )
                      ? relativeAdapter[0]
                      : undefined;
            components.push({
                id: manifest.id,
                uuid: manifest.uuid,
                name: manifest.name,
                ...(manifest.version ? { version: manifest.version } : {}),
                ...(manifest.required !== undefined
                    ? { required: manifest.required }
                    : {}),
                ...(manifest.locked !== undefined
                    ? { locked: manifest.locked }
                    : {}),

                ...(gatewayId
                    ? {
                          gatewayId,
                          adapterId: path.basename(root),
                      }
                    : {}),
            });
        }
    };
    for (const root of roots) await visit(root);
    return components;
}
