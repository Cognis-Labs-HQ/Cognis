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

async function collectDocIndex(
    storedDocsPromise: Promise<Map<string, StoredDoc>>,
): Promise<Map<string, DocEntry>> {
    const storedDocs = await storedDocsPromise;
    const bySlug = new Map<string, DocEntry>();
    for (const [slug, doc] of storedDocs) {
        bySlug.set(slug, {
            ...doc,
            path: `/api/v1/docs/latest/${slug}`,
        });
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
            version: "latest",
            versions: ["latest"],
            generatedMarkdown: buildChangelogIndexMarkdown(changelogEntries),
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
    } = {},
) {
    const archiveRoot = options.archiveRoot ?? resolveDocsArchiveRoot();
    const loadStoredDocs = () =>
        initializeDocsStore(
            options.sourceRoot ?? [SRC_ROOT, EXTERNAL_MODULES_ROOT],
            archiveRoot,
        );
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET") return false;

        if (url.pathname === "/api/v1/docs") {
            const index = await collectDocIndex(loadStoredDocs());
            const data = [...index.values()].map(
                ({ slug, path, group, title, version, versions }) => ({
                    slug,
                    path,
                    group,
                    title,
                    version,
                    versions,
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
        const langs = resolveLangs(url);

        const index = await collectDocIndex(loadStoredDocs());
        const entry = index.get(rawSlug);

        if (!entry) {
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
                    slug: rawSlug,
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
