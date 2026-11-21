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
import { discoverDocSources, optionalText, type DocView } from "./sources.js";

export interface StoredDoc {
    slug: string;
    title: string;
    group: string;
    version: string;
    versions: string[];
    sourceName: string;
    views: DocView[];
}

interface Snapshot extends Omit<StoredDoc, "versions"> {
    documents: Partial<Record<DocView, Record<string, string>>>;
}

function validateSnapshot(snapshot: Snapshot): void {
    const expected = snapshot.slug.startsWith("changelog/")
        ? ["info"]
        : ["info", "usage", "technical"];
    if (
        JSON.stringify(snapshot.views) !== JSON.stringify(expected) ||
        expected.some((view) => !snapshot.documents[view as DocView]?.en)
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

export async function initializeDocsStore(
    sourceRoot: string | string[],
    archiveRoot: string,
): Promise<Map<string, StoredDoc>> {
    const live = new Map<string, Snapshot>();
    for (const root of Array.isArray(sourceRoot) ? sourceRoot : [sourceRoot]) {
        for (const source of await discoverDocSources(root)) {
            if (live.has(source.slug))
                throw new Error(`docs_duplicate_slug:${source.slug}`);
            const documents: Snapshot["documents"] = {};
            for (const [view, files] of Object.entries(source.files)) {
                const contents: Record<string, string> = {};
                for (const [language, path] of Object.entries(files))
                    contents[language] = await readFile(path, "utf8");
                documents[view as DocView] = contents;
            }
            const snapshot: Snapshot = {
                slug: source.slug,
                group: source.group,
                sourceName: source.sourceName,
                version: source.version,
                views: Object.keys(source.files) as DocView[],
                title:
                    documents.info?.en.match(/^#\s+(.+)$/m)?.[1].trim() ??
                    source.slug,
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
    const stored = new Map<string, StoredDoc>();
    for (const [slug, versions] of grouped) {
        versions.sort((first, second) =>
            second.version.localeCompare(first.version, undefined, {
                numeric: true,
            }),
        );
        const snapshot = live.get(slug) ?? versions[0];
        stored.set(slug, {
            slug,
            title: snapshot.title,
            group: snapshot.group,
            sourceName: snapshot.sourceName,
            version: snapshot.version,
            versions: versions.map((entry) => entry.version),
            views: snapshot.views,
        });
    }
    return stored;
}

export async function readStoredMarkdown(
    archiveRoot: string,
    doc: StoredDoc,
    requestedVersion: string,
    languages: string[],
    view: DocView = "info",
): Promise<string | undefined> {
    const version =
        requestedVersion === "latest" ? doc.version : requestedVersion;
    if (!doc.versions.includes(version)) return undefined;
    const snapshot = await readSnapshot(
        join(archiveRoot, doc.slug, version, "bundle.json"),
    );
    const translations = snapshot?.documents[view];
    if (!translations) return undefined;
    for (const language of [...languages, "en"])
        if (translations[language] !== undefined) return translations[language];
    return undefined;
}
