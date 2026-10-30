import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

const DEFAULT_DOC_LANGUAGE = "en";
const CHANGELOG_DOCS_DIR = resolve(process.cwd(), "src", "docs", "changelog");
const EXTERNAL_MODULES_ROOT =
    process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
    resolve(process.cwd(), "external-modules");
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
    details: string[];
    path: string;
    sourceName: string;
};

let cachedReleaseVersion: string | null = null;

type ChangelogFileVariant = {
    filePath: string;
    language: string | null;
    mtimeMs: number;
    sourceName: string;
};

async function externalModuleName(moduleRoot: string, fallback: string) {
    for (const manifestName of ["package.json", "manifest.json"]) {
        try {
            const manifest = JSON.parse(
                await readFile(join(moduleRoot, manifestName), "utf8"),
            );
            const name = String(
                manifest.displayName ?? manifest.name ?? "",
            ).trim();
            if (name) return name;
        } catch {
            // Try the next manifest in the loop above.
        }
    }
    return fallback;
}

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

function extractChangeDetails(markdown: string): string[] {
    const sections = markdown.split(/^##\s+.+$/gm).slice(1);
    return sections.slice(0, MAX_RELEASE_CHANGE_BULLETS).map((section) => {
        const summary = collapseWhitespace(section.replace(/^#+\s+/gm, ""));
        return truncateHeading(summary);
    });
}

function extractChangelogTitle(markdown: string, fallbackSlug: string): string {
    const headingMatch = markdown.match(/^#\s+(.+)$/m);
    if (headingMatch?.[1]) return headingMatch[1].trim();
    return fallbackSlug
        .split("-")
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
}

/**
 * Normalizes a preferred-language list for changelog lookup by lowercasing,
 * validating against supported language-code shape, removing duplicates, and
 * always appending the default fallback language when missing.
 */
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

/**
 * Parses a changelog markdown filename into a logical changelog slug and an
 * optional language code.
 *
 * Supported filename formats:
 * - "<slug>.<lang>.md" (localized variant)
 * - "<slug>.md" (plain fallback variant)
 *
 * Invalid names (including index files) return null.
 */
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

/**
 * Selects the best file variant for a changelog slug by trying preferred
 * languages in order, then a plain ".md" fallback, then a deterministic
 * alphabetic fallback if no preferred/plain variant exists.
 */
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
    changelogRoots: string[] = [CHANGELOG_DOCS_DIR, EXTERNAL_MODULES_ROOT],
): Promise<ChangelogEntrySummary[]> {
    const preferredLanguages = normalizePreferredLanguages(
        preferredLanguagesInput,
    );
    const variantsBySlug = new Map<string, ChangelogFileVariant[]>();

    async function collectChangelogFiles(
        directory: string,
        slugPrefix = "",
        discoveryRoot = directory,
        sourceName = "Cognis Core",
    ): Promise<void> {
        let directoryEntries;
        try {
            directoryEntries = await readdir(directory, {
                withFileTypes: true,
            });
        } catch {
            return;
        }
        for (const entry of directoryEntries) {
            const filePath = join(directory, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === "node_modules" || entry.name === "dist") {
                    continue;
                }
                const relativeDirectory = relative(
                    discoveryRoot,
                    filePath,
                ).replaceAll(sep, "/");
                const modulePrefix = relativeDirectory.split("/")[0] ?? "";
                const nextSourceName =
                    entry.name === "changelog" && modulePrefix
                        ? await externalModuleName(
                              join(discoveryRoot, modulePrefix),
                              modulePrefix,
                          )
                        : sourceName;
                await collectChangelogFiles(
                    filePath,
                    entry.name === "changelog" && modulePrefix
                        ? modulePrefix
                        : slugPrefix,
                    discoveryRoot,
                    nextSourceName,
                );
                continue;
            }
            if (!entry.isFile() || basename(directory) !== "changelog") {
                continue;
            }
            const parsed = parseChangelogFileName(entry.name);
            if (!parsed) continue;
            const slug = slugPrefix
                ? `${slugPrefix}/${parsed.slug}`
                : parsed.slug;
            let metadata;
            try {
                metadata = await stat(filePath);
            } catch {
                continue;
            }
            const variants = variantsBySlug.get(slug) ?? [];
            variants.push({
                filePath,
                language: parsed.language,
                mtimeMs: metadata.mtimeMs,
                sourceName,
            });
            variantsBySlug.set(slug, variants);
        }
    }

    for (const root of changelogRoots) {
        await collectChangelogFiles(
            root,
            root === CHANGELOG_DOCS_DIR ? "" : undefined,
            root,
        );
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
                const latestMtimeMs = variants.reduce(
                    (maxMtimeMs, variant) =>
                        Math.max(maxMtimeMs, variant.mtimeMs),
                    0,
                );
                return {
                    slug,
                    title: extractChangelogTitle(markdown, slug),
                    changes: extractChangeHeadings(markdown),
                    details: extractChangeDetails(markdown),
                    path: `/changelogs/${slug}`,
                    sourceName: selectedVariant.sourceName,
                    mtimeMs: latestMtimeMs,
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
