import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import protectedCoreClasses from "../../../ui/styles/protected-classes.json" with { type: "json" };
import protectedReuseClasses from "../../../ui/styles/protected-reuse-classes.json" with { type: "json" };

const execFileAsync = promisify(execFile);
const TEST_FILE_PATTERN = /\.test\.(?:[cm]?[jt]s)$/;
const TSX_IMPORT_URL = import.meta.resolve("tsx");
const MODULE_SOURCE_PATTERN = /\.(?:[cm]?[jt]s|css)$/;
const IMPORT_SPECIFIER_PATTERN =
    /\b(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;
const COGNIS_INTERNAL_URL_PATTERN =
    /["'`](?:\/static\/(?:reuse|gateways|adapters)|\/api\/v1\/)[^"'`]*/g;
const ABSOLUTE_FONT_SIZE_PATTERN =
    /font-size\s*:\s*[-+]?(?:\d*\.)?\d+(?:px|pt|pc|cm|mm|in)\b/gi;
const PROTECTED_STYLE_CLASSES = new Set([
    ...protectedCoreClasses,
    ...protectedReuseClasses,
]);

function protectedStyleClass(source: string): string | undefined {
    const withoutComments = source.replaceAll(/\/\*[\s\S]*?\*\//g, "");
    let blockStart = 0;
    for (let index = 0; index < withoutComments.length; index += 1) {
        if (withoutComments[index] === "}") blockStart = index + 1;
        if (withoutComments[index] !== "{") continue;
        const selectorList = withoutComments.slice(blockStart, index).trim();
        blockStart = index + 1;
        if (!selectorList || selectorList.startsWith("@")) continue;
        for (const selector of selectorList.split(",")) {
            const subject =
                selector
                    .trim()
                    .split(/[\s>+~]+/)
                    .at(-1) ?? "";
            for (const [, className] of subject.matchAll(
                /\.([a-zA-Z0-9_-]+)/g,
            )) {
                if (PROTECTED_STYLE_CLASSES.has(className)) return className;
            }
        }
    }
    return undefined;
}

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

export async function validateModuleBoundaries(root: string): Promise<void> {
    const violations: string[] = [];
    const sourceFiles = await findFiles(root, (filePath) =>
        MODULE_SOURCE_PATTERN.test(filePath),
    );
    for (const filePath of sourceFiles) {
        const relativePath = path.relative(root, filePath);
        const source = await readFile(filePath, "utf8");
        if (filePath.endsWith(".css")) {
            const className = protectedStyleClass(source);
            if (className)
                violations.push(
                    `${relativePath}:protected_style_class:${className}`,
                );
            for (const match of source.matchAll(ABSOLUTE_FONT_SIZE_PATTERN))
                violations.push(
                    `${relativePath}:absolute_font_size:${match[0]}`,
                );
            continue;
        }
        for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
            const specifier = match[1] ?? match[2] ?? "";
            const resolvedRelativeImport = specifier.startsWith(".")
                ? path.relative(
                      root,
                      path.resolve(path.dirname(filePath), specifier),
                  )
                : "";
            if (
                specifier.startsWith("@cognis/") ||
                specifier.startsWith("/static/") ||
                specifier.startsWith("src/") ||
                resolvedRelativeImport.startsWith("..") ||
                path.isAbsolute(resolvedRelativeImport)
            ) {
                violations.push(`${relativePath}:internal_import:${specifier}`);
            }
        }
        if (COGNIS_INTERNAL_URL_PATTERN.test(source))
            violations.push(`${relativePath}:internal_url`);
        COGNIS_INTERNAL_URL_PATTERN.lastIndex = 0;
    }
    if (violations.length > 0) {
        throw new Error(`module_boundary_violation\n${violations.join("\n")}`);
    }
}

export class ModuleTestService {
    constructor(private readonly moduleRoots: string[]) {}

    async run(moduleId: string): Promise<void> {
        const moduleRoot = await this.findModuleRoot(moduleId);
        if (!moduleRoot) return;
        await validateModuleBoundaries(moduleRoot);
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
