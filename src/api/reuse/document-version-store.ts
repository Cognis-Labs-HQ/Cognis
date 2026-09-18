import { randomUUID } from "node:crypto";

interface DocumentDatabase {
    ensureTable(definition: {
        name: string;
        columns: Array<Record<string, unknown>>;
        indexes?: Array<{ columns: string[] }>;
    }): Promise<void>;
    executeCommand(command: Record<string, unknown>): Promise<{
        rows?: Array<Record<string, unknown>>;
    }>;
}

const TABLE_NAME = "core_document_versions";
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
let lastPublishedAt = 0;

export interface DocumentVersionRow {
    id: string;
    namespace: string;
    slug: string;
    version: string;
    markdown: string;
    actor_id: string;
    published_at: string;
}

export type DocumentDiffLine =
    | {
          type: "unchanged" | "added" | "removed";
          content: string;
          oldLine: number | null;
          newLine: number | null;
      }
    | {
          type: "changed";
          oldContent: string;
          newContent: string;
          oldLine: number;
          newLine: number;
      };

export interface DocumentVersionDiff {
    slug: string;
    fromVersion: string;
    toVersion: string;
    lines: DocumentDiffLine[];
}

type PrimitiveDiffLine = Exclude<DocumentDiffLine, { type: "changed" }>;

export function createDocumentLineDiff(
    previousMarkdown: string,
    nextMarkdown: string,
): DocumentDiffLine[] {
    const previousLines = String(previousMarkdown).split("\n");
    const nextLines = String(nextMarkdown).split("\n");
    const matrix = Array.from(
        { length: previousLines.length + 1 },
        () => new Uint32Array(nextLines.length + 1),
    );
    for (
        let previousIndex = previousLines.length - 1;
        previousIndex >= 0;
        previousIndex -= 1
    ) {
        for (
            let nextIndex = nextLines.length - 1;
            nextIndex >= 0;
            nextIndex -= 1
        ) {
            matrix[previousIndex][nextIndex] =
                previousLines[previousIndex] === nextLines[nextIndex]
                    ? matrix[previousIndex + 1][nextIndex + 1] + 1
                    : Math.max(
                          matrix[previousIndex + 1][nextIndex],
                          matrix[previousIndex][nextIndex + 1],
                      );
        }
    }

    const primitiveLines: PrimitiveDiffLine[] = [];
    let previousIndex = 0;
    let nextIndex = 0;
    while (
        previousIndex < previousLines.length ||
        nextIndex < nextLines.length
    ) {
        if (
            previousIndex < previousLines.length &&
            nextIndex < nextLines.length &&
            previousLines[previousIndex] === nextLines[nextIndex]
        ) {
            primitiveLines.push({
                type: "unchanged",
                content: previousLines[previousIndex],
                oldLine: previousIndex + 1,
                newLine: nextIndex + 1,
            });
            previousIndex += 1;
            nextIndex += 1;
        } else if (
            nextIndex >= nextLines.length ||
            (previousIndex < previousLines.length &&
                matrix[previousIndex + 1][nextIndex] >=
                    matrix[previousIndex][nextIndex + 1])
        ) {
            primitiveLines.push({
                type: "removed",
                content: previousLines[previousIndex],
                oldLine: previousIndex + 1,
                newLine: null,
            });
            previousIndex += 1;
        } else {
            primitiveLines.push({
                type: "added",
                content: nextLines[nextIndex],
                oldLine: null,
                newLine: nextIndex + 1,
            });
            nextIndex += 1;
        }
    }

    const lines: DocumentDiffLine[] = [];
    for (let index = 0; index < primitiveLines.length; ) {
        if (primitiveLines[index].type === "unchanged") {
            lines.push(primitiveLines[index]);
            index += 1;
            continue;
        }
        const changeBlock: PrimitiveDiffLine[] = [];
        while (
            index < primitiveLines.length &&
            primitiveLines[index].type !== "unchanged"
        ) {
            changeBlock.push(primitiveLines[index]);
            index += 1;
        }
        const removed = changeBlock.filter((line) => line.type === "removed");
        const added = changeBlock.filter((line) => line.type === "added");
        const changedCount = Math.min(removed.length, added.length);
        for (
            let changedIndex = 0;
            changedIndex < changedCount;
            changedIndex += 1
        ) {
            lines.push({
                type: "changed",
                oldContent: removed[changedIndex].content,
                newContent: added[changedIndex].content,
                oldLine: removed[changedIndex].oldLine as number,
                newLine: added[changedIndex].newLine as number,
            });
        }
        lines.push(
            ...removed.slice(changedCount),
            ...added.slice(changedCount),
        );
    }
    return lines;
}

function publicationTime(value: unknown): number {
    const milliseconds =
        value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(milliseconds) ? milliseconds : 0;
}

function normalizeVersionRow(row: Record<string, unknown>): DocumentVersionRow {
    return {
        id: String(row.id),
        namespace: String(row.namespace),
        slug: String(row.slug),
        version: String(row.version),
        markdown: String(row.markdown),
        actor_id: String(row.actor_id),
        published_at: new Date(publicationTime(row.published_at)).toISOString(),
    };
}

export interface DocumentVersionStore {
    ensureSchema(): Promise<void>;
    getLatest(slug: string): Promise<DocumentVersionRow | null>;
    getVersion(version: string): Promise<DocumentVersionRow | null>;
    diff(fromVersion: string, toVersion: string): Promise<DocumentVersionDiff>;
    publish(input: {
        slug: string;
        content: string;
        actorId: string;
    }): Promise<DocumentVersionRow>;
    deleteAll(): Promise<void>;
}

export interface DocumentVersionStoreCapability {
    createStore(input: {
        namespace: string;
        database: DocumentDatabase;
        documents: Readonly<Record<string, string>>;
    }): DocumentVersionStore;
}

function requireIdentifier(value: unknown, label: string): string {
    const normalized = String(value ?? "").trim();
    if (!IDENTIFIER_PATTERN.test(normalized)) {
        throw new TypeError(`invalid_document_${label}`);
    }
    return normalized;
}

export function createDocumentVersionStoreCapability(): DocumentVersionStoreCapability {
    return Object.freeze({
        createStore({ namespace, database, documents }) {
            const scopedNamespace = requireIdentifier(namespace, "namespace");
            const supportedSlugs = new Set(Object.keys(documents));
            const requireSlug = (slug: unknown): string => {
                const normalized = requireIdentifier(slug, "slug");
                if (!supportedSlugs.has(normalized)) {
                    throw new TypeError("unsupported_document_slug");
                }
                return normalized;
            };
            const getVersion = async (
                version: string,
            ): Promise<DocumentVersionRow | null> => {
                const result = await database.executeCommand({
                    option: "SELECT",
                    table: TABLE_NAME,
                    where: [
                        { column: "namespace", value: scopedNamespace },
                        {
                            column: "version",
                            value: requireIdentifier(version, "version"),
                        },
                    ],
                });
                return result.rows?.[0]
                    ? normalizeVersionRow(result.rows[0])
                    : null;
            };

            return Object.freeze({
                async ensureSchema() {
                    await database.ensureTable({
                        name: TABLE_NAME,
                        columns: [
                            { name: "id", type: "text", primaryKey: true },
                            { name: "namespace", type: "text", notNull: true },
                            { name: "slug", type: "text", notNull: true },
                            {
                                name: "version",
                                type: "text",
                                notNull: true,
                                unique: true,
                            },
                            { name: "markdown", type: "text", notNull: true },
                            { name: "actor_id", type: "text", notNull: true },
                            {
                                name: "published_at",
                                type: "text",
                                notNull: true,
                            },
                        ],
                        indexes: [
                            { columns: ["namespace", "slug", "published_at"] },
                        ],
                    });
                },
                async getLatest(slug) {
                    const result = await database.executeCommand({
                        option: "SELECT",
                        table: TABLE_NAME,
                        where: [
                            { column: "namespace", value: scopedNamespace },
                            { column: "slug", value: requireSlug(slug) },
                        ],
                        orderBy: [
                            { column: "published_at", direction: "DESC" },
                            { column: "id", direction: "DESC" },
                        ],
                    });
                    const rows = (result.rows ?? []).map(normalizeVersionRow);
                    return (
                        rows.sort((left, right) => {
                            const timeDifference =
                                publicationTime(right.published_at) -
                                publicationTime(left.published_at);
                            return (
                                timeDifference ||
                                right.id.localeCompare(left.id)
                            );
                        })[0] ?? null
                    );
                },
                getVersion,
                async diff(fromVersion, toVersion) {
                    const [previous, next] = await Promise.all([
                        getVersion(fromVersion),
                        getVersion(toVersion),
                    ]);
                    if (!previous || !next) {
                        throw new TypeError("document_version_not_found");
                    }
                    if (previous.slug !== next.slug) {
                        throw new TypeError("document_versions_do_not_match");
                    }
                    return {
                        slug: previous.slug,
                        fromVersion: previous.version,
                        toVersion: next.version,
                        lines: createDocumentLineDiff(
                            previous.markdown,
                            next.markdown,
                        ),
                    };
                },
                async publish({ slug, content, actorId }) {
                    const version = randomUUID();
                    const publishedAt = Math.max(
                        Date.now(),
                        lastPublishedAt + 1,
                    );
                    lastPublishedAt = publishedAt;
                    const row: DocumentVersionRow = {
                        id: randomUUID(),
                        namespace: scopedNamespace,
                        slug: requireSlug(slug),
                        version,
                        markdown: String(content),
                        actor_id: String(actorId),
                        published_at: new Date(publishedAt).toISOString(),
                    };
                    await database.executeCommand({
                        option: "INSERT",
                        table: TABLE_NAME,
                        values: row,
                    });
                    return row;
                },
                async deleteAll() {
                    await database.executeCommand({
                        option: "DELETE",
                        table: TABLE_NAME,
                        where: [
                            { column: "namespace", value: scopedNamespace },
                        ],
                    });
                },
            });
        },
    });
}
