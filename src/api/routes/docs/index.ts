import type { DocView } from "./sources.js";
import type { BootstrapLog } from "@cognis/core";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolveLangs } from "../../reuse/preferred-languages.js";
import {
    initializeDocsStore,
    readStoredMarkdown,
    type StoredDoc,
} from "./store.js";

const SRC_ROOT = join(process.cwd(), "src");
const EXTERNAL_MODULES_ROOT =
    process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
    join(process.cwd(), "external-modules");
export function resolveDocsArchiveRoot(
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

async function collectDocIndex(
    storedDocsPromise: Promise<Map<string, StoredDoc>>,
): Promise<Map<string, DocEntry>> {
    const storedDocs = await storedDocsPromise;
    const bySlug = new Map<string, DocEntry>();
    for (const [slug, doc] of storedDocs) {
        bySlug.set(slug, {
            ...doc,
            path: `/api/v1/docs/latest/${slug}`,
            sourceName: doc.sourceName,
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

export function createDocsRoutes(
    options: {
        sourceRoot?: string | string[];
        archiveRoot?: string;
        log?: BootstrapLog;
    } = {},
) {
    const archiveRoot = options.archiveRoot ?? resolveDocsArchiveRoot();
    const loadStoredDocs = (languages: string[]) =>
        initializeDocsStore(
            options.sourceRoot ?? [SRC_ROOT, EXTERNAL_MODULES_ROOT],
            archiveRoot,
            languages,
            options.log,
        );
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET") return false;
        const langs = resolveLangs(url);

        if (url.pathname === "/api/v1/docs") {
            const index = await collectDocIndex(loadStoredDocs(langs));
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
                    groupPresentation,
                }) => ({
                    slug,
                    path,
                    group,
                    title,
                    version,
                    versions,
                    sourceName,
                    views,
                    groupPresentation,
                }),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
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
        const index = await collectDocIndex(loadStoredDocs(langs));
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
            res.writeHead(404, { "content-type": "application/json" });
            res.end(NOT_FOUND_BODY);
            return true;
        }

        const content =
            entry.generatedMarkdown ??
            (await readStoredMarkdown(
                archiveRoot,
                entry,
                requestedVersion,
                langs,
                view,
            ));

        if (content === undefined) {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(NOT_FOUND_BODY);
            return true;
        }

        const markdown = withChangelogBranch(content, rawSlug);

        res.writeHead(200, { "content-type": "application/json" });
        res.end(
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
