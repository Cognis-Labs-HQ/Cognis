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
const SAFE_LANG_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;
const LOCALIZED_DOC_SUFFIX_PATTERN = /\.([a-z]{2}(?:-[a-z]{2})?)\.md$/i;

export type ChangelogEntrySummary = {
    slug: string;
    title: string;
    changes: string[];
    path: string;
};

let cachedReleaseVersion: string | null = null;

type ChangelogFileVariant = {
    filePath: string;
    language: string | null;
    mtimeMs: number;
};

function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function truncateHeading(headingText: string): string {
    if (headingText.length <= RELEASE_NOTES_SUMMARY_MAX_LENGTH) {
        return headingText;
    }
    return `${headingText
        .slice(0, RELEASE_NOTES_SUMMARY_MAX_LENGTH - 1)
        .trimEnd()}…`;
}

function extractChangeHeadings(markdown: string): string[] {
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

function normalizePreferredLanguages(preferredLanguages: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const language of preferredLanguages) {
        const normalizedLanguage = String(language).trim().toLowerCase();
        if (!SAFE_LANG_PATTERN.test(normalizedLanguage)) continue;
        if (seen.has(normalizedLanguage)) continue;
        seen.add(normalizedLanguage);
        normalized.push(normalizedLanguage);
    }
    if (!seen.has(DEFAULT_DOC_LANGUAGE)) normalized.push(DEFAULT_DOC_LANGUAGE);
    return normalized;
}

function parseChangelogFileName(fileName: string): {
    slug: string;
    language: string | null;
} | null {
    if (!fileName.endsWith(".md")) return null;

    const localizedSuffixMatch = fileName.match(LOCALIZED_DOC_SUFFIX_PATTERN);
    if (localizedSuffixMatch) {
        const slug = fileName.slice(0, -localizedSuffixMatch[0].length).trim();
        if (!slug || slug === "index") return null;
        return { slug, language: localizedSuffixMatch[1].toLowerCase() };
    }

    const slug = fileName.replace(/\.md$/i, "").trim();
    if (!slug || slug === "index") return null;
    return { slug, language: null };
}

function selectPreferredVariant(
    variants: ChangelogFileVariant[],
    preferredLanguages: string[],
): ChangelogFileVariant | null {
    for (const language of preferredLanguages) {
        const localizedVariant = variants.find(
            (variant) => variant.language === language,
        );
        if (localizedVariant) return localizedVariant;
    }
    const fallbackPlainVariant = variants.find(
        (variant) => variant.language === null,
    );
    if (fallbackPlainVariant) return fallbackPlainVariant;
    return (
        [...variants].sort(
            (variantA, variantB) =>
                (variantA.language ?? "").localeCompare(
                    variantB.language ?? "",
                ) || variantA.filePath.localeCompare(variantB.filePath),
        )[0] ?? null
    );
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

export async function loadReleaseChangelogEntries(
    preferredLanguagesInput: string[] = [],
): Promise<ChangelogEntrySummary[]> {
    let changelogFiles;
    try {
        changelogFiles = await readdir(CHANGELOG_DOCS_DIR, {
            withFileTypes: true,
        });
    } catch {
        return [];
    }
    const preferredLanguages = normalizePreferredLanguages(
        preferredLanguagesInput,
    );
    const variantsBySlug = new Map<string, ChangelogFileVariant[]>();
    for (const entry of changelogFiles) {
        if (!entry.isFile()) continue;
        const parsed = parseChangelogFileName(entry.name);
        if (!parsed) continue;
        const filePath = join(CHANGELOG_DOCS_DIR, entry.name);
        let metadata;
        try {
            metadata = await stat(filePath);
        } catch {
            continue;
        }
        const variants = variantsBySlug.get(parsed.slug) ?? [];
        variants.push({
            filePath,
            language: parsed.language,
            mtimeMs: metadata.mtimeMs,
        });
        variantsBySlug.set(parsed.slug, variants);
    }

    const entries = await Promise.all(
        [...variantsBySlug.entries()].map(async ([slug, variants]) => {
            const selectedVariant = selectPreferredVariant(
                variants,
                preferredLanguages,
            );
            if (!selectedVariant) return null;
            try {
                const markdown = await readFile(
                    selectedVariant.filePath,
                    "utf8",
                );
                return {
                    slug,
                    title: extractChangelogTitle(markdown, slug),
                    changes: extractChangeHeadings(markdown),
                    path: `/changelogs/${slug}`,
                    mtimeMs: Math.max(
                        ...variants.map((variant) => variant.mtimeMs),
                    ),
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
