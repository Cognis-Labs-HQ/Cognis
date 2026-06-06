import type {
    DbExecutor,
    RawDbExecutor,
} from "../../../../gateways/db/reuse/db-executor.js";
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

export async function ensureSchema(db: DbExecutor): Promise<void> {
    await db.ensureTable({
        name: "study_classes",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "language_code", type: "text", notNull: true },
            { name: "teacher_account_id", type: "text", notNull: true },
            {
                name: "join_mode",
                type: "text",
                notNull: true,
                default: "on_request",
            },
            {
                name: "is_listed",
                type: "integer",
                notNull: true,
                default: 1,
            },
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
            {
                name: "join_mode",
                type: "text",
                notNull: true,
                default: "on_request",
            },
            {
                name: "is_listed",
                type: "integer",
                notNull: true,
                default: 1,
            },
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

    await db.ensureTable({
        name: "classroom_resources",
        columns: [
            { name: "class_id", type: "text", primaryKey: true },
            {
                name: "materials",
                type: "text",
                notNull: true,
                default: "",
            },
            {
                name: "homework",
                type: "text",
                notNull: true,
                default: "",
            },
            { name: "updated_by", type: "text" },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    });

    await db.ensureTable({
        name: "classroom_notebooks",
        columns: [
            { name: "class_id", type: "text", notNull: true },
            { name: "student_account_id", type: "text", notNull: true },
            {
                name: "note_text",
                type: "text",
                notNull: true,
                default: "",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["class_id", "student_account_id"],
    });

    await db.ensureTable({
        name: "classroom_note_access_requests",
        columns: [
            { name: "class_id", type: "text", notNull: true },
            { name: "owner_student_account_id", type: "text", notNull: true },
            { name: "viewer_student_account_id", type: "text", notNull: true },
            {
                name: "status",
                type: "text",
                notNull: true,
                default: "pending",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: [
            "class_id",
            "owner_student_account_id",
            "viewer_student_account_id",
        ],
    });

    await ensureStudyClassesColumns(db);
    await ensureTeacherRequestColumns(db);
    await ensureStudyLanguagesSchema(db);
}

async function ensureStudyClassesColumns(db: DbExecutor): Promise<void> {
    const rawDb = db as Partial<RawDbExecutor>;
    if (typeof rawDb.execute !== "function") return;
    await rawDb.execute(
        "ALTER TABLE study_classes ADD COLUMN IF NOT EXISTS join_mode TEXT NOT NULL DEFAULT 'on_request'",
    );
    await rawDb.execute(
        "ALTER TABLE study_classes ADD COLUMN IF NOT EXISTS is_listed INTEGER NOT NULL DEFAULT 1",
    );
}

async function ensureTeacherRequestColumns(db: DbExecutor): Promise<void> {
    const rawDb = db as Partial<RawDbExecutor>;
    if (typeof rawDb.execute !== "function") return;
    await rawDb.execute(
        "ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS join_mode TEXT NOT NULL DEFAULT 'on_request'",
    );
    await rawDb.execute(
        "ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS is_listed INTEGER NOT NULL DEFAULT 1",
    );
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
