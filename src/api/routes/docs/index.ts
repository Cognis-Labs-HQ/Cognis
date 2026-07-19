import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveLangs } from "../../reuse/preferred-languages.js";

const SRC_ROOT = join(process.cwd(), "src");
const ROOT_DOCS_DIR = join(SRC_ROOT, "docs");
const DEFAULT_LANG = "en";

interface DocEntry {
    slug: string;
    path: string;
    group: string;
    title: string;
    fileStem: string;
    generatedMarkdown?: string;
}

async function findDocsDirs(
    dir: string,
    results: string[] = [],
): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === "node_modules" || entry.name === "dist") continue;
        const fullPath = join(dir, entry.name);
        if (entry.name === "docs") {
            results.push(fullPath);
        } else {
            await findDocsDirs(fullPath, results);
        }
    }
    return results;
}

async function collectMdFiles(
    dir: string,
    results: string[] = [],
): Promise<string[]> {
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            await collectMdFiles(fullPath, results);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            results.push(fullPath);
        }
    }
    return results;
}

async function extractTitle(fileStem: string): Promise<string> {
    for (const suffix of [`.${DEFAULT_LANG}.md`, ".md"]) {
        try {
            const text = await readFile(`${fileStem}${suffix}`, "utf-8");
            const match = text.match(/^#\s+(.+)$/m);
            if (match) return match[1].trim();
        } catch {
            continue;
        }
    }
    return "";
}

function buildLogicalSlug(relFromSrc: string): string {
    let slug = relFromSrc
        .replace(/^docs\//, "")
        .replace(/\/docs\//g, "/")
        .replace(/\/docs$/, "");
    slug = slug.replace(/\/index$/, "") || slug;
    return slug || "index";
}

function computeGroup(slug: string, isRootDocs: boolean): string {
    if (isRootDocs) {
        const rootSegments = slug.split("/");
        // Root docs with nested paths stay grouped under their top-level segment
        // so related docs remain together in one section. Top-level root docs use
        // platform to avoid creating singleton groups for each standalone page.
        // Changelog rendering is handled separately by the changelogs UI route.
        if (rootSegments.length > 1) return rootSegments[0];
        return "platform";
    }
    const parts = slug.split("/");
    const first = parts[0];
    if (parts.length === 1) return first;
    if (first === "adapters" && parts.length >= 3) {
        return `${parts[0]}/${parts[1]}`;
    }
    return first;
}

function changelogBranchFromSlug(slug: string): string {
    return slug.replace(/^changelog\//, "");
}

function withChangelogBranch(markdown: string, slug: string): string {
    if (!slug.startsWith("changelog/") || slug === "changelog/index") {
        return markdown;
    }
    const branch = changelogBranchFromSlug(slug);
    const branchLine = `\n\n**Feature Branch:** ${branch}\n`;
    if (markdown.match(/^#\s+.+$/m)) {
        return markdown.replace(/^(#\s+.+)$/m, `$1${branchLine}`);
    }
    return `# ${branch}\n${branchLine}\n${markdown}`;
}

function buildChangelogIndexMarkdown(entries: DocEntry[]): string {
    const links = entries
        .filter((entry) => entry.slug.startsWith("changelog/"))
        .sort((first, second) => first.slug.localeCompare(second.slug))
        .map((entry) => {
            const branch = changelogBranchFromSlug(entry.slug);
            const label = entry.title || branch;
            return `- [${label}](/changelogs/${branch})`;
        });

    return ["# Changelogs", "", ...links].join("\n");
}

async function collectDocIndex(): Promise<Map<string, DocEntry>> {
    const docsDirs = await findDocsDirs(SRC_ROOT);
    const bySlug = new Map<string, DocEntry>();

    for (const dir of docsDirs) {
        const isRootDocs = dir === ROOT_DOCS_DIR;
        const files = await collectMdFiles(dir);

        for (const absPath of files) {
            const fileStem = absPath
                .replace(/\.[a-z]{2}(?:-[a-z]{2})?\.md$/i, "")
                .replace(/\.md$/, "");
            const relFromSrc = relative(SRC_ROOT, fileStem).replace(/\\/g, "/");
            const slug = buildLogicalSlug(relFromSrc);

            if (bySlug.has(slug)) continue;

            if (!resolve(fileStem).startsWith(SRC_ROOT)) continue;

            const title = await extractTitle(fileStem);
            const group = computeGroup(slug, isRootDocs);

            bySlug.set(slug, {
                slug,
                path: `/api/v1/docs/${slug}`,
                group,
                title,
                fileStem,
            });
        }
    }

    const changelogEntries = [...bySlug.values()].filter((entry) =>
        entry.slug.startsWith("changelog/"),
    );
    if (changelogEntries.length > 0) {
        bySlug.set("changelog", {
            slug: "changelog",
            path: "/api/v1/docs/changelog",
            group: "changelog",
            title: "Changelogs",
            fileStem: "",
            generatedMarkdown: buildChangelogIndexMarkdown(changelogEntries),
        });
    }

    return bySlug;
}

const NOT_FOUND_BODY = JSON.stringify({
    error: { code: "not_found", message: "Documentation not found" },
});

export function createDocsRoutes() {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET") return false;

        if (url.pathname === "/api/v1/docs") {
            const index = await collectDocIndex();
            const data = [...index.values()].map(
                ({ slug, path, group, title }) => ({
                    slug,
                    path,
                    group,
                    title,
                }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }

        const match = url.pathname.match(/^\/api\/v1\/docs\/([a-z0-9/_-]+)$/i);
        if (!match) return false;

        const rawSlug = match[1].replace(/\.\./g, "").replace(/\/+/g, "/");
        const langs = resolveLangs(url);

        const index = await collectDocIndex();
        const entry = index.get(rawSlug);

        if (!entry) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(NOT_FOUND_BODY);
            return true;
        }

        let content: string | undefined = entry.generatedMarkdown;
        for (const lang of langs) {
            try {
                content = await readFile(
                    `${entry.fileStem}.${lang}.md`,
                    "utf-8",
                );
                break;
            } catch {
                continue;
            }
        }
        if (content === undefined) {
            try {
                content = await readFile(`${entry.fileStem}.md`, "utf-8");
            } catch {}
        }

        if (content === undefined) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(NOT_FOUND_BODY);
            return true;
        }

        const markdown = withChangelogBranch(content, rawSlug);

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { slug: rawSlug, markdown } }));
        return true;
    };
}
