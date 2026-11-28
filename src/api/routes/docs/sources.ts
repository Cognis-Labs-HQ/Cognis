import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

export type DocumentView = "info" | "usage" | "technical";
export interface DocumentSource {
    slug: string;
    group: string;
    sourceName: string;
    version: string;
    files: Partial<Record<DocumentView, Record<string, string>>>;
}

export async function optionalText(path: string): Promise<string | undefined> {
    try {
        return await readFile(path, "utf8");
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
            return undefined;
        throw error;
    }
}

async function filesWithin(directory: string): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }
    const lists = await Promise.all(
        entries
            .filter(
                (entry) =>
                    ![
                        "node_modules",
                        "dist",
                        ".git",
                        "tests",
                        "fixtures",
                    ].includes(entry.name) && !entry.isSymbolicLink(),
            )
            .map(async (entry) => {
                const path = join(directory, entry.name);
                return entry.isDirectory() ? filesWithin(path) : [path];
            }),
    );
    return lists.flat();
}

async function manifestMetadata(
    root: string,
): Promise<Record<string, unknown> | undefined> {
    for (const name of ["manifest.json", "package.json"]) {
        const content = await optionalText(join(root, name));
        if (content) return JSON.parse(content);
    }
    return undefined;
}

async function versionFor(
    directory: string,
    boundary: string,
): Promise<string> {
    while (directory.startsWith(boundary)) {
        const manifest = await manifestMetadata(directory);
        if (manifest) {
            if (
                typeof manifest.version !== "string" ||
                !/^\d+\.\d+\.\d+$/.test(manifest.version)
            )
                throw new Error(`docs_manifest_version_invalid:${directory}`);
            return manifest.version;
        }
        if (directory === boundary) break;
        directory = dirname(directory);
    }
    throw new Error(`docs_manifest_version_missing:${directory}`);
}

async function sourceNameFor(root: string): Promise<string> {
    const manifest = await manifestMetadata(root);
    const name = manifest?.name ?? manifest?.id;
    if (typeof name !== "string" || !name)
        throw new Error(`docs_source_name_missing:${root}`);
    return name;
}

function groupFor(slug: string): string {
    const parts = slug.split("/");
    if (parts[0] === "adapters") return parts.slice(0, 2).join("/");
    return parts.length === 1 ? "platform" : parts[0];
}

async function localizedFiles(
    englishPath: string,
): Promise<Record<string, string>> {
    if ((await optionalText(englishPath)) === undefined)
        throw new Error(`docs_english_source_missing:${englishPath}`);
    const result: Record<string, string> = { en: englishPath };
    for (const language of ["de", "id", "ja"]) {
        const path = englishPath.replace(/\.en\.md$/, `.${language}.md`);
        if ((await optionalText(path)) !== undefined) result[language] = path;
    }
    return result;
}

async function bundleFiles(
    paths: Record<DocumentView, string>,
): Promise<DocumentSource["files"]> {
    const files: DocumentSource["files"] = {};
    for (const view of ["info", "usage", "technical"] as const)
        files[view] = await localizedFiles(paths[view]);
    const languages = Object.keys(files.info!);
    if (
        [files.usage, files.technical].some(
            (view) =>
                JSON.stringify(Object.keys(view!)) !==
                JSON.stringify(languages),
        )
    )
        throw new Error("docs_bundle_language_mismatch");
    return files;
}

async function discoverDocumentSources(
    sourceRoot: string,
): Promise<DocumentSource[]> {
    sourceRoot = resolve(sourceRoot);
    const boundary = dirname(sourceRoot);
    const paths = await filesWithin(sourceRoot);
    const sources: DocumentSource[] = [];
    const manifests = paths.filter(
        (path) =>
            path.endsWith(`${sep}manifest.json`) ||
            path.endsWith(`${sep}package.json`),
    );
    const owners = new Set<string>();
    for (const path of manifests.sort((first, second) =>
        first.localeCompare(second),
    )) {
        const root = dirname(path);
        if (owners.has(root)) continue;
        const manifest = JSON.parse((await optionalText(path))!);
        if (!manifest.documentation) continue;
        owners.add(root);
        const pointers = manifest.documentation;
        const declared = {} as Record<DocumentView, string>;
        for (const [view, key] of [
            ["info", "readme"],
            ["usage", "usage"],
            ["technical", "technical"],
        ] as const) {
            const pointer = pointers[key];
            const expected = {
                readme: "README",
                usage: "USAGE",
                technical: "TECHNICAL",
            }[key];
            if (pointer !== `docs/${expected}.en.md`)
                throw new Error(`docs_manifest_pointer_invalid:${path}:${key}`);
            declared[view] = resolve(root, pointer);
        }
        const relativeRoot = relative(sourceRoot, root).split(sep).join("/");
        const slug =
            path.endsWith("package.json") &&
            manifest.name?.startsWith("@cognis/")
                ? `components/${relativeRoot}`
                : relativeRoot;
        sources.push({
            slug,
            group: groupFor(slug),
            sourceName: manifest.name ?? manifest.id,
            version: await versionFor(root, boundary),
            files: await bundleFiles(declared),
        });
    }
    const coreRoot = join(sourceRoot, "docs");
    for (const path of paths.filter(
        (path) =>
            path.startsWith(coreRoot + sep) &&
            path.endsWith(`${sep}INFO.en.md`) &&
            !path.includes(`${sep}changelog${sep}`),
    )) {
        const directory = dirname(path);
        const slug =
            relative(coreRoot, directory).split(sep).join("/") || "index";
        sources.push({
            slug,
            group: "platform",
            sourceName: "Cognis Core",
            version: await versionFor(directory, boundary),
            files: await bundleFiles({
                info: path,
                usage: join(directory, "USAGE.en.md"),
                technical: join(directory, "TECHNICAL.en.md"),
            }),
        });
    }
    const changelogs = new Map<string, Record<string, string>>();
    for (const path of paths.filter(
        (path) =>
            path.includes(`${sep}docs${sep}changelog${sep}`) &&
            /\.(en|de|id|ja)\.md$/.test(path),
    )) {
        const stem = path.replace(/\.(en|de|id|ja)\.md$/, "");
        const language = path.match(/\.(en|de|id|ja)\.md$/)![1];
        changelogs.set(stem, { ...changelogs.get(stem), [language]: path });
    }
    for (const [stem, files] of changelogs) {
        const relativeStem = relative(sourceRoot, stem).split(sep).join("/");
        const [owner, branch] = relativeStem.split("docs/changelog/");
        const slug = `changelog/${owner ? owner.replace(/\/$/, "").split("/").pop() + "/" : ""}${branch}`;
        sources.push({
            slug,
            group: "changelog",
            sourceName: owner
                ? await sourceNameFor(dirname(dirname(dirname(stem))))
                : "Cognis Core",
            version: await versionFor(dirname(stem), boundary),
            files: { info: files },
        });
    }
    return sources;
}
export { discoverDocumentSources };
