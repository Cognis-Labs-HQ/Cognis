import type { DocView } from "./sources.js";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveLangs as resolveLanguages } from "../../reuse/preferred-languages.js";
import {
    initializeDocsStore as initializeDocumentsStore,
    readStoredMarkdown,
    type StoredDoc,
} from "./store.js";

const SOURCE_ROOT = join(process.cwd(), "src");
const EXTERNAL_MODULES_ROOT =
    process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
    join(process.cwd(), "external-modules");
function resolveDocumentsArchiveRoot(
    environment: NodeJS.ProcessEnv = process.env,
    userHome = homedir(),
): string {
    if (environment.COGNIS_DOCS_ARCHIVE_DIR) {
        return environment.COGNIS_DOCS_ARCHIVE_DIR;
    }
    if (environment.COGNIS_CLI_TOKEN_PATH) {
        return join(dirname(environment.COGNIS_CLI_TOKEN_PATH), "docs-archive");
    }
    return join(userHome, ".cognis", "docs-archive");
}
export { resolveDocumentsArchiveRoot as resolveDocsArchiveRoot };

interface DocEntry extends StoredDoc {
    slug: string;
    path: string;
    group: string;
    title: string;
    generatedMarkdown?: string;
    sourceName: string;
}

function changelogBranchFromSlug(slug: string): string {
    return slug.replace(/^changelog\//, "");
}

function withChangelogBranch(markdown: string, slug: string): string {
    if (!slug.startsWith("changelog/") || slug === "changelog/index") {
        return markdown;
    }
    if (
        /^\*\*(?:Feature Branch|Feature-Zweig|Cabang Fitur|機能ブランチ):\*\*\s+.+$/m.test(
            markdown,
        )
    ) {
        return markdown;
    }
    const branch = changelogBranchFromSlug(slug);
    const branchLine = `\n\n**Feature Branch:** ${branch}\n`;
    if (markdown.match(/^#\s+.+$/m)) {
        return markdown.replace(/^(#\s+.+)$/m, `$1${branchLine}`);
    }
    return `# ${branch}\n${branchLine}\n${markdown}`;
}

function buildChangelogIndexMarkdown(
    entries: DocEntry[],
    title: string,
): string {
    const groupedEntries = new Map<string, DocEntry[]>();
    for (const entry of entries
        .filter((entry) => entry.slug.startsWith("changelog/"))
        .sort((first, second) => first.slug.localeCompare(second.slug))) {
        groupedEntries.set(entry.sourceName, [
            ...(groupedEntries.get(entry.sourceName) ?? []),
            entry,
        ]);
    }
    const sections = [...groupedEntries.entries()].flatMap(
        ([sourceName, sourceEntries]) => [
            `## ${sourceName}`,
            "",
            ...sourceEntries.map((entry) => {
                const branch = changelogBranchFromSlug(entry.slug);
                const label = entry.title || branch;
                return `- [${label}](/changelogs/${branch})`;
            }),
            "",
        ],
    );

    return [`# ${title}`, "", ...sections].join("\n");
}

async function collectDocumentIndex(
    storedDocumentsPromise: Promise<Map<string, StoredDoc>>,
): Promise<Map<string, DocEntry>> {
    const storedDocuments = await storedDocumentsPromise;
    const bySlug = new Map<string, DocEntry>();
    for (const [slug, document] of storedDocuments) {
        bySlug.set(slug, {
            ...document,
            path: `/api/v1/docs/latest/${slug}`,
            sourceName: document.sourceName,
        });
    }

    const changelogEntries = [...bySlug.values()].filter((entry) =>
        entry.slug.startsWith("changelog/"),
    );
    if (changelogEntries.length > 0) {
        const title = bySlug.get("changelog/index")?.title ?? "Changelogs";
        bySlug.set("changelog", {
            slug: "changelog",
            path: "/api/v1/docs/changelog",
            group: "changelog",
            title,
            views: ["info"],
            version: "latest",
            versions: ["latest"],
            generatedMarkdown: buildChangelogIndexMarkdown(
                changelogEntries,
                title,
            ),
            sourceName: "Cognis Core",
        });
    }

    return bySlug;
}

const NOT_FOUND_BODY = JSON.stringify({
    error: { code: "not_found", message: "Documentation not found" },
});

function createDocumentsRoutes(
    options: {
        sourceRoot?: string | string[];
        archiveRoot?: string;
    } = {},
) {
    const archiveRoot = options.archiveRoot ?? resolveDocumentsArchiveRoot();
    const loadStoredDocuments = (languages: string[]) =>
        initializeDocumentsStore(
            options.sourceRoot ?? [SOURCE_ROOT, EXTERNAL_MODULES_ROOT],
            archiveRoot,
            languages,
        );
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (request.method !== "GET") return false;
        const languages = resolveLanguages(url);

        if (url.pathname === "/api/v1/docs") {
            const index = await collectDocumentIndex(
                loadStoredDocuments(languages),
            );
            const data = [...index.values()].map(
                ({
                    slug,
                    path,
                    group,
                    title,
                    version,
                    versions,
                    sourceName,
                    views,
                }) => ({
                    slug,
                    path,
                    group,
                    title,
                    version,
                    versions,
                    sourceName,
                    views,
                }),
            );
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/docs\/(latest|\d+\.\d+\.\d+)\/([a-z0-9/_.-]+)$/i,
        );
        const legacyMatch = url.pathname.match(
            /^\/api\/v1\/docs\/([a-z0-9][a-z0-9/_.-]*)$/i,
        );
        if (!match && !legacyMatch) return false;

        const requestedVersion = match?.[1] ?? "latest";
        const rawSlug = (match?.[2] ?? legacyMatch?.[1] ?? "")
            .replace(/\.\./g, "")
            .replace(/\/+/g, "/");
        const index = await collectDocumentIndex(
            loadStoredDocuments(languages),
        );
        let slug = rawSlug;
        let view: DocView = "info";
        if (!index.has(slug)) {
            const parts = slug.split("/");
            const candidate = parts.pop();
            if (
                candidate === "info" ||
                candidate === "usage" ||
                candidate === "technical"
            ) {
                view = candidate;
                slug = parts.join("/");
            }
        }
        const entry = index.get(slug);

        if (!entry || !entry.views.includes(view)) {
            response.writeHead(404, { "content-type": "application/json" });
            response.end(NOT_FOUND_BODY);
            return true;
        }

        const content =
            entry.generatedMarkdown ??
            (await readStoredMarkdown(
                archiveRoot,
                entry,
                requestedVersion,
                languages,
                view,
            ));

        if (content === undefined) {
            response.writeHead(404, { "content-type": "application/json" });
            response.end(NOT_FOUND_BODY);
            return true;
        }

        const markdown = withChangelogBranch(content, rawSlug);

        response.writeHead(200, { "content-type": "application/json" });
        response.end(
            JSON.stringify({
                data: {
                    slug,
                    view,
                    version:
                        requestedVersion === "latest"
                            ? entry.version
                            : requestedVersion,
                    markdown,
                },
            }),
        );
        return true;
    };
}
export { createDocumentsRoutes as createDocsRoutes };
