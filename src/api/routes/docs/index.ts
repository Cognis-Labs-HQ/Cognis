import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const SRC_ROOT = join(process.cwd(), "src");
const ROOT_DOCS_DIR = join(SRC_ROOT, "docs");
const DEFAULT_LANG = "en";
const SAFE_LANG_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

function resolveLang(url: URL): string {
    const queryLang = (url.searchParams.get("lang") || "").toLowerCase();
    if (SAFE_LANG_PATTERN.test(queryLang)) return queryLang;
    return DEFAULT_LANG;
}

interface DocEntry {
    slug: string;
    path: string;
    group: string;
    title: string;
    fileStem: string;
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
    if (isRootDocs) return "";
    const parts = slug.split("/");
    const first = parts[0];
    if (parts.length === 1) return first;
    if (first === "adapters" && parts.length >= 3) {
        return `${parts[0]}/${parts[1]}`;
    }
    return first;
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
            const relFromSrc = relative(SRC_ROOT, fileStem).replace(
                /\\/g,
                "/",
            );
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
        const lang = resolveLang(url);

        const index = await collectDocIndex();
        const entry = index.get(rawSlug);

        if (!entry) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(NOT_FOUND_BODY);
            return true;
        }

        let content: string | undefined;
        for (const suffix of [`.${lang}.md`, `.${DEFAULT_LANG}.md`, ".md"]) {
            try {
                content = await readFile(`${entry.fileStem}${suffix}`, "utf-8");
                break;
            } catch {
                continue;
            }
        }

        if (content === undefined) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(NOT_FOUND_BODY);
            return true;
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { slug: rawSlug, markdown: content } }));
        return true;
    };
}
