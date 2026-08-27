import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

export interface StoredDoc {
    fileStem: string;
    slug: string;
    title: string;
    group: string;
    version: string;
    versions: string[];
    sourceName: string;
}

interface SourceDoc extends Omit<StoredDoc, "version" | "versions"> {
    files: string[];
    componentRoot: string;
}

const DEFAULT_LANG = "en";
const SEMANTIC_VERSION = /^\d+\.\d+\.\d+$/;

async function directoriesNamedDocs(
    directory: string,
    results: string[] = [],
): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        const fullPath = join(directory, entry.name);
        if (entry.name === "docs") results.push(fullPath);
        else await directoriesNamedDocs(fullPath, results);
    }
    return results;
}

async function markdownFiles(
    directory: string,
    results: string[] = [],
): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory()) await markdownFiles(fullPath, results);
        else if (entry.isFile() && entry.name.endsWith(".md")) {
            results.push(fullPath);
        }
    }
    return results;
}

function logicalSlug(sourceRoot: string, fileStem: string): string {
    let slug = relative(sourceRoot, fileStem)
        .replaceAll(sep, "/")
        .replace(/^docs\//, "")
        .replace(/\/docs\//g, "/")
        .replace(/\/docs$/, "");
    slug = slug.replace(/\/index$/, "") || slug;
    slug = slug.replace(/^([^/]+)\/changelog\//, "changelog/$1/");
    return slug || "index";
}

function groupFor(slug: string, rootDocs: boolean): string {
    const segments = slug.split("/");
    if (rootDocs) return segments.length > 1 ? segments[0] : "platform";
    if (segments[0] === "adapters" && segments.length >= 3) {
        return `${segments[0]}/${segments[1]}`;
    }
    return segments[0];
}

async function titleFor(fileStem: string): Promise<string> {
    for (const suffix of [`.${DEFAULT_LANG}.md`, ".md"]) {
        try {
            const markdown = await readFile(`${fileStem}${suffix}`, "utf8");
            return markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? "";
        } catch {
            // Try the next language source in the loop at line 80.
        }
    }
    return "";
}

async function sourceNameFor(
    slug: string,
    componentRoot: string,
): Promise<string> {
    if (!slug.startsWith("changelog/") || slug.split("/").length === 2) {
        return "Cognis Core";
    }
    for (const manifestName of ["package.json", "manifest.json"]) {
        try {
            const manifest = JSON.parse(
                await readFile(join(componentRoot, manifestName), "utf8"),
            );
            const name = String(
                manifest.displayName ?? manifest.name ?? "",
            ).trim();
            if (name) return name;
        } catch {
            // Try the next manifest in the loop above.
        }
    }
    return slug.split("/")[1];
}

async function componentVersion(
    componentRoot: string,
    repositoryRoot: string,
): Promise<string> {
    let directory = componentRoot;
    while (resolve(directory).startsWith(resolve(repositoryRoot))) {
        for (const manifestName of ["package.json", "manifest.json"]) {
            try {
                const manifest = JSON.parse(
                    await readFile(join(directory, manifestName), "utf8"),
                );
                if (typeof manifest.version === "string") {
                    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
                        throw new Error(
                            `docs_manifest_version_invalid:${join(directory, manifestName)}`,
                        );
                    }
                    return manifest.version;
                }
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message.startsWith("docs_manifest_version_invalid:")
                ) {
                    throw error;
                }
                // Continue with the manifest loop at line 97, then the parent block at lines 120-121.
            }
        }
        if (directory === repositoryRoot) break;
        directory = dirname(directory);
    }
    throw new Error(`docs_manifest_version_missing:${componentRoot}`);
}

function languageFromPath(filePath: string): string {
    return filePath.match(/\.([a-z]{2}(?:-[a-z]{2})?)\.md$/i)?.[1] ?? "base";
}

async function sourceDocs(sourceRoot: string): Promise<SourceDoc[]> {
    const docsDirectories = await directoriesNamedDocs(sourceRoot);
    const docs = new Map<string, SourceDoc>();
    for (const docsDirectory of docsDirectories) {
        const files = await markdownFiles(docsDirectory);
        const stems = new Map<string, string[]>();
        for (const filePath of files) {
            const stem = filePath
                .replace(/\.[a-z]{2}(?:-[a-z]{2})?\.md$/i, "")
                .replace(/\.md$/, "");
            stems.set(stem, [...(stems.get(stem) ?? []), filePath]);
        }
        for (const [fileStem, localizedFiles] of stems) {
            const slug = logicalSlug(sourceRoot, fileStem);
            if (docs.has(slug) || !resolve(fileStem).startsWith(sourceRoot)) {
                continue;
            }
            docs.set(slug, {
                slug,
                fileStem,
                files: localizedFiles,
                componentRoot: dirname(docsDirectory),
                title: await titleFor(fileStem),
                sourceName: await sourceNameFor(slug, dirname(docsDirectory)),
                group: groupFor(
                    slug,
                    docsDirectory === join(sourceRoot, "docs"),
                ),
            });
        }
    }
    return [...docs.values()];
}

async function availableVersions(
    archiveRoot: string,
    slug: string,
): Promise<string[]> {
    try {
        return (await readdir(join(archiveRoot, slug), { withFileTypes: true }))
            .filter(
                (entry) =>
                    entry.isDirectory() && SEMANTIC_VERSION.test(entry.name),
            )
            .map((entry) => entry.name)
            .sort((first, second) =>
                second.localeCompare(first, undefined, {
                    numeric: true,
                }),
            );
    } catch {
        return [];
    }
}

async function archivedTitle(
    archiveRoot: string,
    slug: string,
    version: string,
): Promise<string> {
    for (const language of [DEFAULT_LANG, "base"]) {
        try {
            const markdown = await readFile(
                join(archiveRoot, slug, version, `${language}.md`),
                "utf8",
            );
            return markdown.match(/^#\s+(.+)$/m)?.[1].trim() ?? "";
        } catch {
            // Try the next archived language source in the loop above.
        }
    }
    return "";
}

async function archivedDocs(
    archiveRoot: string,
    directory = archiveRoot,
): Promise<StoredDoc[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch {
        return [];
    }

    const slug = relative(archiveRoot, directory).replaceAll(sep, "/");
    const versions = slug ? await availableVersions(archiveRoot, slug) : [];
    if (versions.length > 0) {
        const version = versions[0];
        return [
            {
                fileStem: "",
                slug,
                title: await archivedTitle(archiveRoot, slug, version),
                group: groupFor(slug, false),
                version,
                versions,
                sourceName:
                    slug.startsWith("changelog/") && slug.split("/").length > 2
                        ? slug.split("/")[1]
                        : "Cognis Core",
            },
        ];
    }

    const docs: StoredDoc[] = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            docs.push(
                ...(await archivedDocs(
                    archiveRoot,
                    join(directory, entry.name),
                )),
            );
        }
    }
    return docs;
}

export async function initializeDocsStore(
    sourceRoot: string | string[],
    archiveRoot: string,
): Promise<Map<string, StoredDoc>> {
    const storedDocs = new Map<string, StoredDoc>();
    for (const root of Array.isArray(sourceRoot) ? sourceRoot : [sourceRoot]) {
        const repositoryRoot = dirname(root);
        const discoveredDocs = await sourceDocs(root);
        for (const doc of discoveredDocs) {
            const version = await componentVersion(
                doc.componentRoot,
                repositoryRoot,
            );
            const versionDirectory = join(archiveRoot, doc.slug, version);
            await mkdir(versionDirectory, { recursive: true });
            for (const sourceFile of doc.files) {
                const destination = join(
                    versionDirectory,
                    `${languageFromPath(sourceFile)}.md`,
                );
                try {
                    await writeFile(destination, await readFile(sourceFile), {
                        flag: "wx",
                    });
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code !== "EEXIST")
                        throw error;
                }
            }
            storedDocs.set(doc.slug, {
                fileStem: doc.fileStem,
                slug: doc.slug,
                title: doc.title,
                group: doc.group,
                version,
                versions: await availableVersions(archiveRoot, doc.slug),
                sourceName: doc.sourceName,
            });
        }
    }
    for (const doc of await archivedDocs(archiveRoot)) {
        if (!storedDocs.has(doc.slug)) storedDocs.set(doc.slug, doc);
    }
    return storedDocs;
}

export async function readStoredMarkdown(
    archiveRoot: string,
    doc: StoredDoc,
    requestedVersion: string,
    languages: string[],
): Promise<string | undefined> {
    const version =
        requestedVersion === "latest" ? doc.version : requestedVersion;
    if (!doc.versions.includes(version)) return undefined;
    for (const language of [...languages, "base"]) {
        try {
            return await readFile(
                join(archiveRoot, doc.slug, version, `${language}.md`),
                "utf8",
            );
        } catch {
            // Try the next preferred language (loop above).
        }
    }
    return undefined;
}
