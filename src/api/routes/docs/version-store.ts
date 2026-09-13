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
