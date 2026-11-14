import path from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const BOOTSTRAP_MODULE_EXTENSIONS = new Set([".js", ".mjs", ".ts", ".mts"]);

interface BootstrapDirectoryHookOptions<TContext> {
    context: TContext;
    directoryUrl: URL;
    exportName: string;
}

export async function runBootstrapDirectoryHooks<TContext>({
    context,
    directoryUrl,
    exportName,
}: BootstrapDirectoryHookOptions<TContext>): Promise<void> {
    const directoryPath = fileURLToPath(directoryUrl);
    const entries = await readdir(directoryPath, {
        withFileTypes: true,
    });
    const hookFileNames = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((fileName) => {
            if (fileName.startsWith("index.")) {
                return false;
            }
            return BOOTSTRAP_MODULE_EXTENSIONS.has(path.extname(fileName));
        })
        .sort((left, right) => left.localeCompare(right));

    for (const hookFileName of hookFileNames) {
        const hookModuleUrl = pathToFileURL(
            path.join(directoryPath, hookFileName),
        );
        const hookModule = await import(hookModuleUrl.href);
        const registerHook = hookModule[exportName];
        if (typeof registerHook === "function") {
            await registerHook(context);
        }
    }
}
