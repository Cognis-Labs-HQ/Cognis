import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_DOC_LANGUAGE = "en";
const CHANGELOG_DOCS_DIR = resolve(process.cwd(), "src", "docs", "changelog");
const API_PACKAGE_JSON_FILE = resolve(
    process.cwd(),
    "src",
    "api",
    "package.json",
);
const RELEASE_NOTES_SUMMARY_MAX_LENGTH = 260;
const MAX_RELEASE_CHANGE_BULLETS = 8;

export type ChangelogEntrySummary = {
    slug: string;
    title: string;
    changes: string[];
    path: string;
};

let cachedReleaseVersion: string | null = null;

function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function truncateHeading(headingText: string): string {
    if (headingText.length <= RELEASE_NOTES_SUMMARY_MAX_LENGTH) {
        return headingText;
    }
    return `${headingText.slice(0, RELEASE_NOTES_SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}

function extractChangelogChanges(markdown: string): string[] {
    const headingMatches = [...markdown.matchAll(/^##\s+(.+)$/gm)];
    const headings = headingMatches
        .map((match) => truncateHeading(collapseWhitespace(match[1] ?? "")))
        .filter((headingText) => headingText.length > 0);
    return headings.slice(0, MAX_RELEASE_CHANGE_BULLETS);
}

function extractChangelogTitle(markdown: string, fallbackSlug: string): string {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) return headingMatch[1].trim();
    return fallbackSlug
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

export async function readReleaseVersion(): Promise<string> {
    if (cachedReleaseVersion) return cachedReleaseVersion;
    try {
        const rawPackage = await readFile(API_PACKAGE_JSON_FILE, "utf-8");
        const parsedPackage = JSON.parse(rawPackage);
        const normalizedVersion = String(parsedPackage?.version ?? "").trim();
        cachedReleaseVersion = normalizedVersion || "0.0.0";
    } catch {
        cachedReleaseVersion = "0.0.0";
    }
    return cachedReleaseVersion;
}

export async function loadReleaseChangelogEntries(): Promise<
    ChangelogEntrySummary[]
> {
    let changelogFiles;
    try {
        changelogFiles = await readdir(CHANGELOG_DOCS_DIR, {
            withFileTypes: true,
        });
    } catch {
        return [];
    }
    const entryFiles = changelogFiles.filter(
        (entry) =>
            entry.isFile() &&
            entry.name.endsWith(`.${DEFAULT_DOC_LANGUAGE}.md`) &&
            entry.name !== `index.${DEFAULT_DOC_LANGUAGE}.md`,
    );
    const entries = await Promise.all(
        entryFiles.map(async (entry) => {
            const filePath = join(CHANGELOG_DOCS_DIR, entry.name);
            const slug = entry.name.replace(`.${DEFAULT_DOC_LANGUAGE}.md`, "");
            try {
                const [markdown, metadata] = await Promise.all([
                    readFile(filePath, "utf8"),
                    stat(filePath),
                ]);
                return {
                    slug,
                    title: extractChangelogTitle(markdown, slug),
                    changes: extractChangelogChanges(markdown),
                    path: `/changelogs/${slug}`,
                    mtimeMs: metadata.mtimeMs,
                };
            } catch {
                return null;
            }
        }),
    );
    return entries
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((entryA, entryB) => entryB.mtimeMs - entryA.mtimeMs)
        .map(({ mtimeMs: _mtimeMs, ...entry }) => entry);
}
