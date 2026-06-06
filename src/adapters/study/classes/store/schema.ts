import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../../../gateways/db/reuse/provider-id.js";
import { DEFAULT_STUDENT_LIMIT } from "./constants.js";

const STUDY_LANGUAGE_SEEDS = [
    {
        code: "ja",
        name: "Japanese",
        flag: "🇯🇵",
        sortOrder: 1,
    },
    {
        code: "zh",
        name: "Chinese",
        flag: "🇨🇳",
        sortOrder: 2,
    },
    {
        code: "ko",
        name: "Korean",
        flag: "🇰🇷",
        sortOrder: 3,
    },
    {
        code: "es",
        name: "Spanish",
        flag: "🇪🇸",
        sortOrder: 4,
    },
    {
        code: "fr",
        name: "French",
        flag: "🇫🇷",
        sortOrder: 5,
    },
    {
        code: "de",
        name: "German",
        flag: "🇩🇪",
        sortOrder: 6,
    },
    {
        code: "pt",
        name: "Portuguese",
        flag: "🇵🇹",
        sortOrder: 7,
    },
    {
        code: "ar",
        name: "Arabic",
        flag: "🇸🇦",
        sortOrder: 8,
    },
    {
        code: "ru",
        name: "Russian",
        flag: "🇷🇺",
        sortOrder: 9,
    },
    {
        code: "it",
        name: "Italian",
        flag: "🇮🇹",
        sortOrder: 10,
    },
];

type RawDbExecutor = DbExecutor & {
    execute: (
        sql: string,
        params?: unknown[],
    ) => Promise<{ rows?: unknown[]; rowCount?: number }>;
};

function canExecuteRaw(db: DbExecutor): db is RawDbExecutor {
    return typeof (db as RawDbExecutor).execute === "function";
}

const POSTGRES_DB_PROVIDER: DbProviderId = "postgresql";

/**
 * Create study/classes tables via PostgreSQL-native DDL.
 *
 * This path avoids adapter-level schema helpers that can issue SQLite-specific
 * introspection statements, and ensures PostgreSQL startup remains dialect-safe.
 *
 * @param db - Raw DB executor with SQL execution capability.
 */
async function ensureSchemaForPostgres(db: RawDbExecutor): Promise<void> {
    await db.execute(`CREATE TABLE IF NOT EXISTS study_classes (
  id TEXT PRIMARY KEY,
  language_code TEXT NOT NULL,
  teacher_account_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS teacher_requests (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, language_code)
)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS teacher_assignments (
  account_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  class_id TEXT NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, language_code)
)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS study_user_preferences (
  account_id TEXT PRIMARY KEY,
  learning_languages TEXT NOT NULL DEFAULT '[]',
  teaching_languages TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS class_memberships (
  class_id TEXT NOT NULL,
  student_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by TEXT,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, student_account_id)
)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS classroom_state (
  class_id TEXT PRIMARY KEY,
  student_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STUDENT_LIMIT},
  seat_assignments TEXT NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
    await ensureStudyLanguagesSchema(db);
}

export async function ensureSchema(
    db: DbExecutor,
    dbType?: DbProviderId,
): Promise<void> {
    if (dbType === POSTGRES_DB_PROVIDER && canExecuteRaw(db)) {
        await ensureSchemaForPostgres(db);
        return;
    }
    await db.ensureTable({
        name: "study_classes",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "language_code", type: "text", notNull: true },
            { name: "teacher_account_id", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });

    await db.ensureTable({
        name: "teacher_requests",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "account_id", type: "text", notNull: true },
            { name: "language_code", type: "text", notNull: true },
            { name: "reason", type: "text" },
            {
                name: "status",
                type: "text",
                notNull: true,
                default: "pending",
            },
            { name: "reviewed_by", type: "text" },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        uniqueKeys: [["account_id", "language_code"]],
    });

    await db.ensureTable({
        name: "teacher_assignments",
        columns: [
            { name: "account_id", type: "text", notNull: true },
            { name: "language_code", type: "text", notNull: true },
            { name: "class_id", type: "text", notNull: true },
            {
                name: "assigned_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["account_id", "language_code"],
    });

    await db.ensureTable({
        name: "study_user_preferences",
        columns: [
            { name: "account_id", type: "text", primaryKey: true },
            {
                name: "learning_languages",
                type: "text",
                notNull: true,
                default: "[]",
            },
            {
                name: "teaching_languages",
                type: "text",
                notNull: true,
                default: "[]",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });

    await db.ensureTable({
        name: "class_memberships",
        columns: [
            { name: "class_id", type: "text", notNull: true },
            { name: "student_account_id", type: "text", notNull: true },
            {
                name: "status",
                type: "text",
                notNull: true,
                default: "pending",
            },
            { name: "invited_by", type: "text" },
            {
                name: "joined_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["class_id", "student_account_id"],
    });

    await db.ensureTable({
        name: "classroom_state",
        columns: [
            { name: "class_id", type: "text", primaryKey: true },
            {
                name: "student_limit",
                type: "integer",
                notNull: true,
                default: DEFAULT_STUDENT_LIMIT,
            },
            {
                name: "seat_assignments",
                type: "text",
                notNull: true,
                default: "{}",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });

    await ensureStudyLanguagesSchema(db);
}

export async function ensureStudyLanguagesSchema(
    db: DbExecutor,
): Promise<void> {
    await db.ensureTable({
        name: "study_languages",
        columns: [
            { name: "code", type: "text", primaryKey: true },
            { name: "name", type: "text", notNull: true },
            { name: "flag", type: "text", notNull: true, default: "" },
            {
                name: "available",
                type: "integer",
                notNull: true,
                default: 1,
            },
            { name: "active", type: "integer", notNull: true, default: 0 },
            {
                name: "sort_order",
                type: "integer",
                notNull: true,
                default: 0,
            },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });

    const countResult = await db.executeCommand({
        option: "SELECT",
        table: "study_languages",
        count: true,
    });
    const existingLanguageCount = Number(countResult.rows?.[0]?.cnt ?? 0);
    if (existingLanguageCount === 0) {
        await seedStudyLanguages(db);
    }
}

async function seedStudyLanguages(db: DbExecutor): Promise<void> {
    for (const seed of STUDY_LANGUAGE_SEEDS) {
        await db
            .executeCommand({
                option: "INSERT",
                table: "study_languages",
                values: {
                    code: seed.code,
                    name: seed.name,
                    flag: seed.flag,
                    available: 1,
                    active: 0,
                    sort_order: seed.sortOrder,
                },
                conflict: { action: "ignore" },
            })
            .catch(() => undefined);
    }
}
