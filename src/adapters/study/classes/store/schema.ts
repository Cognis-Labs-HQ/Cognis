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
            { name: "name", type: "text", notNull: true, default: "" },
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
            { name: "class_name", type: "text", notNull: true, default: "" },
            {
                name: "student_limit",
                type: "integer",
                notNull: true,
                default: DEFAULT_STUDENT_LIMIT,
            },
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
                name: "board_focus",
                type: "text",
                notNull: true,
                default: "agenda",
            },
            {
                name: "active_whiteboard_id",
                type: "text",
            },
            {
                name: "active_material_key",
                type: "text",
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
            {
                name: "files",
                type: "text",
                notNull: true,
                default: "[]",
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

    await db.ensureTable({
        name: "classroom_whiteboards",
        columns: [
            { name: "id", type: "text", notNull: true },
            { name: "class_id", type: "text", notNull: true },
            { name: "name", type: "text", notNull: true, default: "" },
            { name: "file_key", type: "text" },
            { name: "created_by", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["id"],
    });

    await ensureStudyClassesColumns(db);
    await ensureTeacherRequestColumns(db);
    await ensureClassroomStateColumns(db);
    await ensureStudyLanguagesSchema(db);
}

async function ensureStudyClassesColumns(db: DbExecutor): Promise<void> {
    const rawDb = db as Partial<RawDbExecutor>;
    if (typeof rawDb.execute !== "function") return;
    const dialect = await detectSqlDialect(rawDb);
    await ensureMissingColumn(rawDb, dialect, "study_classes", "join_mode");
    await ensureMissingColumn(rawDb, dialect, "study_classes", "is_listed");
    await ensureMissingColumn(rawDb, dialect, "study_classes", "name");
}

async function ensureTeacherRequestColumns(db: DbExecutor): Promise<void> {
    const rawDb = db as Partial<RawDbExecutor>;
    if (typeof rawDb.execute !== "function") return;
    const dialect = await detectSqlDialect(rawDb);
    await ensureMissingColumn(rawDb, dialect, "teacher_requests", "join_mode");
    await ensureMissingColumn(rawDb, dialect, "teacher_requests", "is_listed");
    await ensureMissingColumn(rawDb, dialect, "teacher_requests", "class_name");
    await ensureMissingColumn(
        rawDb,
        dialect,
        "teacher_requests",
        "student_limit",
    );
}

async function ensureClassroomStateColumns(db: DbExecutor): Promise<void> {
    const rawDb = db as Partial<RawDbExecutor>;
    if (typeof rawDb.execute !== "function") return;
    const dialect = await detectSqlDialect(rawDb);
    await ensureMissingColumn(rawDb, dialect, "classroom_state", "board_focus");
    await ensureMissingColumn(
        rawDb,
        dialect,
        "classroom_state",
        "active_whiteboard_id",
    );
    await ensureMissingColumn(
        rawDb,
        dialect,
        "classroom_state",
        "active_material_key",
    );
}

type SupportedSqlDialect = "sqlite" | "postgres" | "mariadb";

async function detectSqlDialect(
    db: Partial<RawDbExecutor>,
): Promise<SupportedSqlDialect> {
    if (!db.execute) return "postgres";
    try {
        await db.execute("SELECT current_schema()");
        return "postgres";
    } catch {}
    try {
        await db.execute("PRAGMA table_info(study_classes)");
        return "sqlite";
    } catch {}
    return "mariadb";
}

async function ensureMissingColumn(
    db: Partial<RawDbExecutor>,
    dialect: SupportedSqlDialect,
    tableName: "study_classes" | "teacher_requests" | "classroom_state",
    columnName:
        | "join_mode"
        | "is_listed"
        | "name"
        | "class_name"
        | "student_limit"
        | "board_focus"
        | "active_whiteboard_id"
        | "active_material_key",
): Promise<void> {
    if (!db.execute) return;
    if (await hasColumn(db, dialect, tableName, columnName)) {
        return;
    }
    await db.execute(resolveAddColumnStatement(dialect, tableName, columnName));
}

async function hasColumn(
    db: Partial<RawDbExecutor>,
    dialect: SupportedSqlDialect,
    tableName: "study_classes" | "teacher_requests" | "classroom_state",
    columnName:
        | "join_mode"
        | "is_listed"
        | "name"
        | "class_name"
        | "student_limit"
        | "board_focus"
        | "active_whiteboard_id"
        | "active_material_key",
): Promise<boolean> {
    if (!db.execute) return false;
    if (dialect === "sqlite") {
        const result = await db.execute(`PRAGMA table_info(${tableName})`);
        return (result.rows ?? []).some(
            (row) =>
                String((row as Record<string, unknown>).name) === columnName,
        );
    }
    const schemaPredicate =
        dialect === "mariadb"
            ? "table_schema = DATABASE()"
            : "table_schema = current_schema()";
    const result = await db.execute(
        `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}' AND ${schemaPredicate}`,
    );
    return (result.rows?.length ?? 0) > 0;
}

function resolveAddColumnStatement(
    dialect: SupportedSqlDialect,
    tableName: "study_classes" | "teacher_requests" | "classroom_state",
    columnName:
        | "join_mode"
        | "is_listed"
        | "name"
        | "class_name"
        | "student_limit"
        | "board_focus"
        | "active_whiteboard_id"
        | "active_material_key",
): string {
    if (tableName === "study_classes" && columnName === "join_mode") {
        return dialect === "mariadb"
            ? "ALTER TABLE study_classes ADD COLUMN join_mode VARCHAR(32) NOT NULL DEFAULT 'on_request'"
            : "ALTER TABLE study_classes ADD COLUMN join_mode TEXT NOT NULL DEFAULT 'on_request'";
    }
    if (tableName === "study_classes" && columnName === "is_listed") {
        return dialect === "mariadb"
            ? "ALTER TABLE study_classes ADD COLUMN is_listed TINYINT(1) NOT NULL DEFAULT 1"
            : "ALTER TABLE study_classes ADD COLUMN is_listed INTEGER NOT NULL DEFAULT 1";
    }
    if (tableName === "study_classes" && columnName === "name") {
        return dialect === "mariadb"
            ? "ALTER TABLE study_classes ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT ''"
            : "ALTER TABLE study_classes ADD COLUMN name TEXT NOT NULL DEFAULT ''";
    }
    if (tableName === "teacher_requests" && columnName === "join_mode") {
        return dialect === "mariadb"
            ? "ALTER TABLE teacher_requests ADD COLUMN join_mode VARCHAR(32) NOT NULL DEFAULT 'on_request'"
            : "ALTER TABLE teacher_requests ADD COLUMN join_mode TEXT NOT NULL DEFAULT 'on_request'";
    }
    if (tableName === "teacher_requests" && columnName === "class_name") {
        return dialect === "mariadb"
            ? "ALTER TABLE teacher_requests ADD COLUMN class_name VARCHAR(255) NOT NULL DEFAULT ''"
            : "ALTER TABLE teacher_requests ADD COLUMN class_name TEXT NOT NULL DEFAULT ''";
    }
    if (tableName === "teacher_requests" && columnName === "student_limit") {
        return dialect === "mariadb"
            ? `ALTER TABLE teacher_requests ADD COLUMN student_limit INT NOT NULL DEFAULT ${DEFAULT_STUDENT_LIMIT}`
            : `ALTER TABLE teacher_requests ADD COLUMN student_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STUDENT_LIMIT}`;
    }
    if (tableName === "classroom_state" && columnName === "board_focus") {
        return dialect === "mariadb"
            ? "ALTER TABLE classroom_state ADD COLUMN board_focus VARCHAR(32) NOT NULL DEFAULT 'agenda'"
            : "ALTER TABLE classroom_state ADD COLUMN board_focus TEXT NOT NULL DEFAULT 'agenda'";
    }
    if (
        tableName === "classroom_state" &&
        columnName === "active_whiteboard_id"
    ) {
        return dialect === "mariadb"
            ? "ALTER TABLE classroom_state ADD COLUMN active_whiteboard_id VARCHAR(255) NULL"
            : "ALTER TABLE classroom_state ADD COLUMN active_whiteboard_id TEXT";
    }
    if (
        tableName === "classroom_state" &&
        columnName === "active_material_key"
    ) {
        return dialect === "mariadb"
            ? "ALTER TABLE classroom_state ADD COLUMN active_material_key VARCHAR(1024) NULL"
            : "ALTER TABLE classroom_state ADD COLUMN active_material_key TEXT";
    }
    return dialect === "mariadb"
        ? "ALTER TABLE teacher_requests ADD COLUMN is_listed TINYINT(1) NOT NULL DEFAULT 1"
        : "ALTER TABLE teacher_requests ADD COLUMN is_listed INTEGER NOT NULL DEFAULT 1";
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
