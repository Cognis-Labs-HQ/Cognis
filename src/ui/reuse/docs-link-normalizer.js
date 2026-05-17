/**
 * Normalizes intra-document markdown links for the docs reader.
 *
 * Public exports:
 * - normalizeDocSlug(href, currentDoc, docs) — resolves a markdown link to a docs API slug.
 *
 * Usage example:
 *   const slug = normalizeDocSlug(
 *     "../gateways/db/docs/index.en.md?langs=en",
 *     { slug: "index", sourcePath: "docs/index" },
 *     docs,
 *   );
 *
 * @param {string} href Link href copied from a rendered markdown anchor.
 * @param {{ slug?: string, sourcePath?: string } | undefined} currentDoc Active docs index entry.
 * @param {Array<{ slug: string, sourcePath?: string }>} docs Docs index entries.
 * @returns {string} Normalized docs slug, or an empty string for unsupported links.
 */
function stripDocDecorators(path) {
    return path
        .replace(/[?#].*$/, "")
        .replace(/\.[a-z]{2}(?:-[a-z]{2})?\.md$/i, "")
        .replace(/\.md$/i, "");
}

function normalizePathSegments(path) {
    const segments = [];
    for (const part of path.split("/")) {
        if (!part || part === ".") continue;
        if (part === "..") {
            segments.pop();
            continue;
        }
        segments.push(part);
    }
    return segments.join("/");
}

function buildSourceSlugMap(docs) {
    const sourceSlugMap = new Map();
    for (const doc of docs) {
        if (doc.sourcePath) sourceSlugMap.set(doc.sourcePath, doc.slug);
        sourceSlugMap.set(doc.slug, doc.slug);
    }
    return sourceSlugMap;
}

function resolveMarkdownSourcePath(href, currentDoc, sourceSlugMap) {
    const cleanHref = stripDocDecorators(href);
    if (cleanHref.startsWith("/")) return cleanHref.replace(/^\/+/u, "");
    if (!cleanHref.startsWith(".") && !cleanHref.includes("/")) {
        return cleanHref;
    }

    const sourcePath = currentDoc?.sourcePath ?? currentDoc?.slug ?? "";
    const basePath = sourcePath.includes("/")
        ? sourcePath.slice(0, sourcePath.lastIndexOf("/"))
        : "";
    const resolvedPath = normalizePathSegments(`${basePath}/${cleanHref}`);
    if (sourceSlugMap.has(resolvedPath)) return resolvedPath;
    return normalizePathSegments(cleanHref);
}

export function normalizeDocSlug(href, currentDoc, docs = []) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return "";

    const cleanHref = stripDocDecorators(href)
        .replace(/^\/+/, "")
        .replace(/^api\/v1\/docs\/?/, "")
        .replace(/^docs\/?/, "");
    if (!cleanHref) return "";

    const sourceSlugMap = buildSourceSlugMap(docs);
    if (sourceSlugMap.has(cleanHref)) return sourceSlugMap.get(cleanHref);

    const sourcePath = resolveMarkdownSourcePath(
        href,
        currentDoc,
        sourceSlugMap,
    );
    if (sourceSlugMap.has(sourcePath)) return sourceSlugMap.get(sourcePath);

    const normalized = normalizePathSegments(cleanHref)
        .replace(/^src\//, "")
        .replace(/^docs\//, "")
        .replace(/\/docs\/index$/g, "")
        .replace(/\/docs$/g, "")
        .replace(/\/index$/g, "");
    return normalized || "index";
}
