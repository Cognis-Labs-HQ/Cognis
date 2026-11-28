import {
    mkdir,
    readFile,
    readdir,
    rename,
    rm,
    writeFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import {
    discoverDocumentSources,
    optionalText,
    type DocumentView,
} from "./sources.js";

export interface StoredDocument {
    slug: string;
    title: string;
    group: string;
    version: string;
    versions: string[];
    sourceName: string;
    views: DocumentView[];
}

interface Snapshot extends Omit<StoredDocument, "versions" | "title"> {
    documents: Partial<Record<DocumentView, Record<string, string>>>;
}

function localizedMarkdown(
    translations: Record<string, string> | undefined,
    languages: string[],
): string | undefined {
    for (const language of [...languages, "en"]) {
        const locale = language.toLowerCase();
        for (const candidate of new Set([locale, locale.split("-")[0]])) {
            const markdown = translations?.[candidate];
            if (markdown !== undefined) return markdown;
        }
    }
    return undefined;
}

function validateSnapshot(snapshot: Snapshot): void {
    const expected = snapshot.slug.startsWith("changelog/")
        ? ["info"]
        : ["info", "usage", "technical"];
    if (
        JSON.stringify(snapshot.views) !== JSON.stringify(expected) ||
        expected.some((view) => !snapshot.documents[view as DocumentView]?.en)
    )
        throw new Error(
            `docs_incomplete_bundle:${snapshot.slug}:${snapshot.version}`,
        );
}

async function publishSnapshot(
    path: string,
    snapshot: Snapshot,
): Promise<void> {
    validateSnapshot(snapshot);
    const content = JSON.stringify(snapshot);
    if ((await optionalText(path)) === content) return;
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporaryPath, content);
        await rename(temporaryPath, path);
    } finally {
        await rm(temporaryPath, { force: true });
    }
}

async function readSnapshot(path: string): Promise<Snapshot | undefined> {
    const content = await optionalText(path);
    if (content === undefined) return undefined;
    const snapshot = JSON.parse(content) as Snapshot;
    validateSnapshot(snapshot);
    return snapshot;
}

async function archivedSnapshots(directory: string): Promise<Snapshot[]> {
    let entries;
    try {
        entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw error;
    }
    const snapshot = entries.some((entry) => entry.name === "bundle.json")
        ? await readSnapshot(join(directory, "bundle.json"))
        : undefined;
    if (snapshot) return [snapshot];
    const snapshots = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => archivedSnapshots(join(directory, entry.name))),
    );
    return snapshots.flat();
}

async function initializeDocumentsStore(
    sourceRoot: string | string[],
    archiveRoot: string,
    languages: string[] = ["en"],
): Promise<Map<string, StoredDocument>> {
    const live = new Map<string, Snapshot>();
    for (const root of Array.isArray(sourceRoot) ? sourceRoot : [sourceRoot]) {
        for (const source of await discoverDocumentSources(root)) {
            if (live.has(source.slug))
                throw new Error(`docs_duplicate_slug:${source.slug}`);
            const documents: Snapshot["documents"] = {};
            for (const [view, files] of Object.entries(source.files)) {
                const contents: Record<string, string> = {};
                for (const [language, path] of Object.entries(files))
                    contents[language] = await readFile(path, "utf8");
                documents[view as DocumentView] = contents;
            }
            const snapshot: Snapshot = {
                slug: source.slug,
                group: source.group,
                sourceName: source.sourceName,
                version: source.version,
                views: Object.keys(source.files) as DocumentView[],
                documents,
            };
            await publishSnapshot(
                join(archiveRoot, source.slug, source.version, "bundle.json"),
                snapshot,
            );
            live.set(source.slug, snapshot);
        }
    }
    const snapshots = await archivedSnapshots(archiveRoot);
    const grouped = new Map<string, Snapshot[]>();
    for (const snapshot of snapshots)
        grouped.set(snapshot.slug, [
            ...(grouped.get(snapshot.slug) ?? []),
            snapshot,
        ]);
    const stored = new Map<string, StoredDocument>();
    for (const [slug, versions] of grouped) {
        versions.sort((first, second) =>
            second.version.localeCompare(first.version, undefined, {
                numeric: true,
            }),
        );
        const snapshot = live.get(slug) ?? versions[0];
        stored.set(slug, {
            slug,
            title:
                localizedMarkdown(snapshot.documents.info, languages)
                    ?.match(/^#\s+(.+)$/m)?.[1]
                    .trim() ?? slug,
            group: snapshot.group,
            sourceName: snapshot.sourceName,
            version: snapshot.version,
            versions: versions.map((entry) => entry.version),
            views: snapshot.views,
        });
    }
    return stored;
}
export { initializeDocumentsStore };

export async function readStoredMarkdown(
    archiveRoot: string,
    document: StoredDocument,
    requestedVersion: string,
    languages: string[],
    view: DocumentView = "info",
): Promise<string | undefined> {
    const version =
        requestedVersion === "latest" ? document.version : requestedVersion;
    if (!document.versions.includes(version)) return undefined;
    const snapshot = await readSnapshot(
        join(archiveRoot, document.slug, version, "bundle.json"),
    );
    const translations = snapshot?.documents[view];
    if (!translations) return undefined;
    return localizedMarkdown(translations, languages);
}
