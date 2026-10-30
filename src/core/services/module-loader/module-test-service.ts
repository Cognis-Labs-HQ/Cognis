import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TEST_FILE_PATTERN = /\.test\.(?:[cm]?[jt]s)$/;
const TSX_IMPORT_URL = import.meta.resolve("tsx");

async function findFiles(
    root: string,
    predicate: (filePath: string) => boolean,
): Promise<string[]> {
    let entries: Awaited<ReturnType<typeof readdir>>;
    try {
        entries = await readdir(root, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }
    const files: string[] = [];
    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const entryPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await findFiles(entryPath, predicate)));
        } else if (entry.isFile() && predicate(entryPath)) {
            files.push(entryPath);
        }
    }
    return files;
}

export async function discoverTestFiles(root: string): Promise<string[]> {
    return (
        await findFiles(root, (filePath) => TEST_FILE_PATTERN.test(filePath))
    ).sort((left, right) => left.localeCompare(right));
}

export class ModuleTestService {
    constructor(private readonly moduleRoots: string[]) {}

    async run(moduleId: string): Promise<void> {
        const moduleRoot = await this.findModuleRoot(moduleId);
        if (!moduleRoot) return;
        const testFiles = await discoverTestFiles(moduleRoot);
        if (testFiles.length === 0) return;
        try {
            await execFileAsync(
                process.execPath,
                ["--import", TSX_IMPORT_URL, "--test", ...testFiles],
                {
                    cwd: moduleRoot,
                    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
                    maxBuffer: 10 * 1024 * 1024,
                    timeout: 2 * 60 * 1000,
                },
            );
        } catch (error) {
            const result = error as Error & {
                stderr?: string;
                stdout?: string;
            };
            const output = [result.stdout, result.stderr]
                .filter(Boolean)
                .join("\n")
                .trim();
            throw new Error(
                `module_tests_failed:${moduleId}${output ? `\n${output}` : ""}`,
                { cause: error },
            );
        }
    }

    private async findModuleRoot(moduleId: string): Promise<string | null> {
        for (const root of this.moduleRoots) {
            const manifests = await findFiles(
                root,
                (filePath) => path.basename(filePath) === "manifest.json",
            );
            for (const manifestPath of manifests) {
                try {
                    const manifest = JSON.parse(
                        await readFile(manifestPath, "utf8"),
                    ) as { id?: unknown };
                    if (manifest.id === moduleId)
                        return path.dirname(manifestPath);
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code === "ENOENT")
                        continue;
                    throw error;
                }
            }
        }
        return null;
    }
}
