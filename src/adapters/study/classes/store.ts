/**
 * DbClassesStore — persistence layer for the classes adapter.
 *
 * Responsibilities:
 *   - Schema initialisation for study_classes, teacher_requests, and
 *     teacher_assignments tables.
 *   - CRUD operations for class records, teacher requests, and assignments.
 *
 * Public exports:
 *   DbClassesStore — the store class.
 *   TeacherRequestStatus, ClassRow, TeacherRequestRow — types.
 *
 * @module adapters/study/classes/store
 */

import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { SupportedDbType } from "../../../gateways/db/executor.js";

export type TeacherRequestStatus = "pending" | "approved" | "rejected";

export interface StudyLanguageRow {
    code: string;
    name: string;
    flag: string;
    available: boolean;
    active: boolean;
    sortOrder: number;
}

export interface ClassRow {
    id: string;
    languageCode: string;
    teacherAccountId: string;
    createdAt: string;
}

export interface TeacherRequestRow {
    id: string;
    accountId: string;
    languageCode: string;
    status: TeacherRequestStatus;
    reason: string | null;
    reviewedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TeacherAssignmentRow {
    accountId: string;
    languageCode: string;
    classId: string;
    assignedAt: string;
}

export interface StudyPreferencesRow {
    accountId: string;
    learningLanguages: string[];
    teachingLanguages: string[];
    updatedAt: string;
}

export class DbClassesStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private placeholder(n: number): string {
        return this.dbType === "postgresql" ? `$${n}` : "?";
    }

    private tsNow(): string {
        return this.dbType === "postgresql" ? "NOW()" : "CURRENT_TIMESTAMP";
    }

    async ensureSchema(): Promise<void> {
        const idType = this.dbType === "postgresql" ? "TEXT" : "VARCHAR(64)";
        const tsDefault =
            this.dbType === "postgresql"
                ? `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
                : `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`;
        const statusType =
            this.dbType === "mariadb"
                ? "ENUM('pending','approved','rejected')"
                : "VARCHAR(16)";

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS study_classes (
                id ${idType} PRIMARY KEY,
                language_code VARCHAR(32) NOT NULL,
                teacher_account_id ${idType} NOT NULL,
                created_at ${tsDefault}
            )`,
            [],
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS teacher_requests (
                id ${idType} PRIMARY KEY,
                account_id ${idType} NOT NULL,
                language_code VARCHAR(32) NOT NULL,
                reason TEXT,
                status ${statusType} NOT NULL DEFAULT 'pending',
                reviewed_by ${idType},
                created_at ${tsDefault},
                updated_at ${tsDefault},
                UNIQUE (account_id, language_code)
            )`,
            [],
        );

        if (this.dbType === "postgresql" || this.dbType === "mariadb") {
            await this.db.execute(
                "ALTER TABLE teacher_requests ADD COLUMN IF NOT EXISTS reason TEXT",
            );
        } else {
            await this.db
                .execute("ALTER TABLE teacher_requests ADD COLUMN reason TEXT")
                .catch(() => undefined);
        }

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS teacher_assignments (
                account_id ${idType} NOT NULL,
                language_code VARCHAR(32) NOT NULL,
                class_id ${idType} NOT NULL,
                assigned_at ${tsDefault},
                PRIMARY KEY (account_id, language_code)
            )`,
            [],
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS study_user_preferences (
                account_id ${idType} PRIMARY KEY,
                learning_languages TEXT NOT NULL DEFAULT '[]',
                teaching_languages TEXT NOT NULL DEFAULT '[]',
                updated_at ${tsDefault}
            )`,
            [],
        );

        await this.ensureStudyLanguagesSchema();
    }

    async ensureStudyLanguagesSchema(): Promise<void> {
        const tsDefault =
            this.dbType === "postgresql"
                ? `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
                : `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`;
        const boolType =
            this.dbType === "postgresql"
                ? "BOOLEAN NOT NULL DEFAULT TRUE"
                : "TINYINT(1) NOT NULL DEFAULT 1";
        const boolTypeFalse =
            this.dbType === "postgresql"
                ? "BOOLEAN NOT NULL DEFAULT FALSE"
                : "TINYINT(1) NOT NULL DEFAULT 0";

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS study_languages (
                code VARCHAR(32) PRIMARY KEY,
                name VARCHAR(128) NOT NULL,
                flag VARCHAR(8) NOT NULL DEFAULT '',
                available ${boolType},
                active ${boolTypeFalse},
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at ${tsDefault}
            )`,
            [],
        );

        const countResult = await this.db.execute(
            `SELECT COUNT(*) AS total FROM study_languages`,
            [],
        );
        const existingLanguageCount = Number(
            (countResult.rows?.[0] as Record<string, unknown>)?.total ?? 0,
        );
        if (existingLanguageCount === 0) {
            await this.seedStudyLanguages();
        }
    }

    private async seedStudyLanguages(): Promise<void> {
        const availableValue = this.dbType === "postgresql" ? true : 1;
        const activeValue = this.dbType === "postgresql" ? false : 0;
        const seeds = [
            { code: "ja", name: "Japanese", flag: "🇯🇵", sortOrder: 1 },
            { code: "zh", name: "Chinese", flag: "🇨🇳", sortOrder: 2 },
            { code: "ko", name: "Korean", flag: "🇰🇷", sortOrder: 3 },
            { code: "es", name: "Spanish", flag: "🇪🇸", sortOrder: 4 },
            { code: "fr", name: "French", flag: "🇫🇷", sortOrder: 5 },
            { code: "de", name: "German", flag: "🇩🇪", sortOrder: 6 },
            { code: "pt", name: "Portuguese", flag: "🇵🇹", sortOrder: 7 },
            { code: "ar", name: "Arabic", flag: "🇸🇦", sortOrder: 8 },
            { code: "ru", name: "Russian", flag: "🇷🇺", sortOrder: 9 },
            { code: "it", name: "Italian", flag: "🇮🇹", sortOrder: 10 },
        ];
        for (const seed of seeds) {
            await this.db
                .execute(
                    `INSERT INTO study_languages (code, name, flag, available, active, sort_order)
                     VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)}, ${this.placeholder(5)}, ${this.placeholder(6)})`,
                    [
                        seed.code,
                        seed.name,
                        seed.flag,
                        availableValue,
                        activeValue,
                        seed.sortOrder,
                    ],
                )
                .catch(() => undefined);
        }
    }

    private rowToStudyLanguage(row: Record<string, unknown>): StudyLanguageRow {
        return {
            code: String(row.code),
            name: String(row.name),
            flag: String(row.flag ?? ""),
            available: Boolean(row.available),
            active: Boolean(row.active),
            sortOrder: Number(row.sort_order ?? 0),
        };
    }

    async listStudyLanguages(
        onlyAvailable = false,
    ): Promise<StudyLanguageRow[]> {
        const where = onlyAvailable ? " WHERE available = 1" : "";
        const result = await this.db.execute(
            `SELECT code, name, flag, available, active, sort_order
             FROM study_languages${where}
             ORDER BY sort_order, code`,
            [],
        );
        return (result.rows ?? []).map((row) =>
            this.rowToStudyLanguage(row as Record<string, unknown>),
        );
    }

    async upsertStudyLanguage(
        row: Partial<StudyLanguageRow> & { code: string },
    ): Promise<StudyLanguageRow> {
        if (this.dbType === "mariadb") {
            await this.db.execute(
                `INSERT INTO study_languages (code, name, flag, available, active, sort_order)
                 VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)}, ${this.placeholder(5)}, ${this.placeholder(6)})
                 ON DUPLICATE KEY UPDATE
                   name = VALUES(name),
                   flag = VALUES(flag),
                   available = VALUES(available),
                   active = VALUES(active),
                   sort_order = VALUES(sort_order)`,
                [
                    row.code,
                    row.name ?? "",
                    row.flag ?? "",
                    row.available !== false,
                    row.active === true,
                    row.sortOrder ?? 0,
                ],
            );
        } else {
            await this.db.execute(
                `INSERT INTO study_languages (code, name, flag, available, active, sort_order)
                 VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)}, ${this.placeholder(5)}, ${this.placeholder(6)})
                 ON CONFLICT (code) DO UPDATE SET
                   name = EXCLUDED.name,
                   flag = EXCLUDED.flag,
                   available = EXCLUDED.available,
                   active = EXCLUDED.active,
                   sort_order = EXCLUDED.sort_order`,
                [
                    row.code,
                    row.name ?? "",
                    row.flag ?? "",
                    row.available !== false ? 1 : 0,
                    row.active ? 1 : 0,
                    row.sortOrder ?? 0,
                ],
            );
        }
        const result = await this.db.execute(
            `SELECT code, name, flag, available, active, sort_order
             FROM study_languages WHERE code = ${this.placeholder(1)}`,
            [row.code],
        );
        const found = result.rows?.[0];
        if (!found) {
            return {
                code: row.code,
                name: row.name ?? "",
                flag: row.flag ?? "",
                available: row.available !== false,
                active: row.active ?? false,
                sortOrder: row.sortOrder ?? 0,
            };
        }
        return this.rowToStudyLanguage(found as Record<string, unknown>);
    }

    private rowToTeacherRequest(
        row: Record<string, unknown>,
    ): TeacherRequestRow {
        return {
            id: String(row.id),
            accountId: String(row.account_id),
            languageCode: String(row.language_code),
            status: String(row.status) as TeacherRequestStatus,
            reason: row.reason != null ? String(row.reason) : null,
            reviewedBy:
                row.reviewed_by != null ? String(row.reviewed_by) : null,
            createdAt: String(row.created_at),
            updatedAt: String(row.updated_at),
        };
    }

    private parseLanguageList(value: unknown): string[] {
        try {
            const parsed = JSON.parse(String(value ?? "[]"));
            return Array.isArray(parsed)
                ? parsed.filter(
                      (entry): entry is string => typeof entry === "string",
                  )
                : [];
        } catch {
            return [];
        }
    }

    async getStudyPreferences(accountId: string): Promise<StudyPreferencesRow> {
        const result = await this.db.execute(
            `SELECT account_id, learning_languages, teaching_languages, updated_at
             FROM study_user_preferences
             WHERE account_id = ${this.placeholder(1)}`,
            [accountId],
        );
        const row = result.rows?.[0];
        if (!row) {
            return {
                accountId,
                learningLanguages: [],
                teachingLanguages: [],
                updatedAt: new Date().toISOString(),
            };
        }
        return {
            accountId: String(row.account_id),
            learningLanguages: this.parseLanguageList(row.learning_languages),
            teachingLanguages: this.parseLanguageList(row.teaching_languages),
            updatedAt: String(row.updated_at),
        };
    }

    async saveStudyPreferences(
        accountId: string,
        learningLanguages: string[],
        teachingLanguages: string[],
    ): Promise<StudyPreferencesRow> {
        const learningJson = JSON.stringify(learningLanguages);
        const teachingJson = JSON.stringify(teachingLanguages);
        if (this.dbType === "mariadb") {
            await this.db.execute(
                `INSERT INTO study_user_preferences (account_id, learning_languages, teaching_languages, updated_at)
                 VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.tsNow()})
                 ON DUPLICATE KEY UPDATE learning_languages = VALUES(learning_languages), teaching_languages = VALUES(teaching_languages), updated_at = ${this.tsNow()}`,
                [accountId, learningJson, teachingJson],
            );
        } else {
            await this.db.execute(
                `INSERT INTO study_user_preferences (account_id, learning_languages, teaching_languages, updated_at)
                 VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.tsNow()})
                 ON CONFLICT (account_id) DO UPDATE SET learning_languages = EXCLUDED.learning_languages, teaching_languages = EXCLUDED.teaching_languages, updated_at = ${this.tsNow()}`,
                [accountId, learningJson, teachingJson],
            );
        }
        return this.getStudyPreferences(accountId);
    }

    async getClassesForTeacher(teacherAccountId: string): Promise<ClassRow[]> {
        const result = await this.db.execute(
            `SELECT id, language_code, teacher_account_id, created_at
             FROM study_classes
             WHERE teacher_account_id = ${this.placeholder(1)}
             ORDER BY language_code`,
            [teacherAccountId],
        );
        return result.rows.map((row) => ({
            id: String(row.id),
            languageCode: String(row.language_code),
            teacherAccountId: String(row.teacher_account_id),
            createdAt: String(row.created_at),
        }));
    }

    async getTeacherRequest(
        accountId: string,
        languageCode: string,
    ): Promise<TeacherRequestRow | null> {
        const result = await this.db.execute(
            `SELECT id, account_id, language_code, reason, status, reviewed_by, created_at, updated_at
             FROM teacher_requests
             WHERE account_id = ${this.placeholder(1)} AND language_code = ${this.placeholder(2)}`,
            [accountId, languageCode],
        );
        if (!result.rows.length) return null;
        return this.rowToTeacherRequest(result.rows[0]);
    }

    async listPendingRequests(): Promise<TeacherRequestRow[]> {
        const result = await this.db.execute(
            `SELECT id, account_id, language_code, reason, status, reviewed_by, created_at, updated_at
             FROM teacher_requests
             WHERE status = 'pending'
             ORDER BY created_at`,
            [],
        );
        return result.rows.map((row) => this.rowToTeacherRequest(row));
    }

    async submitTeacherRequest(
        accountId: string,
        languageCode: string,
        reason: string | null,
    ): Promise<TeacherRequestRow> {
        const requestId = randomUUID();
        await this.db.execute(
            `INSERT INTO teacher_requests
             (id, account_id, language_code, reason, status, created_at, updated_at)
             VALUES (
                 ${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)},
                 ${this.placeholder(4)}, 'pending', ${this.tsNow()}, ${this.tsNow()}
             )`,
            [requestId, accountId, languageCode, reason],
        );
        return {
            id: requestId,
            accountId,
            languageCode,
            status: "pending",
            reason,
            reviewedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    async approveTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<ClassRow | null> {
        const requestResult = await this.db.execute(
            `SELECT id, account_id, language_code FROM teacher_requests
             WHERE id = ${this.placeholder(1)} AND status = 'pending'`,
            [requestId],
        );
        if (!requestResult.rows.length) return null;

        const row = requestResult.rows[0];
        const accountId = String(row.account_id);
        const languageCode = String(row.language_code);

        await this.db.execute(
            `UPDATE teacher_requests
             SET status = 'approved', reviewed_by = ${this.placeholder(1)}, updated_at = ${this.tsNow()}
             WHERE id = ${this.placeholder(2)}`,
            [reviewerAccountId, requestId],
        );

        const classId = randomUUID();
        await this.db.execute(
            `INSERT INTO study_classes (id, language_code, teacher_account_id, created_at)
             VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.tsNow()})`,
            [classId, languageCode, accountId],
        );

        await this.db
            .execute(
                `INSERT INTO teacher_assignments (account_id, language_code, class_id, assigned_at)
             VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.tsNow()})
             ON CONFLICT (account_id, language_code) DO UPDATE SET class_id = ${this.placeholder(3)}`,
                [accountId, languageCode, classId],
            )
            .catch(() =>
                this.db.execute(
                    `UPDATE teacher_assignments SET class_id = ${this.placeholder(1)}
                 WHERE account_id = ${this.placeholder(2)} AND language_code = ${this.placeholder(3)}`,
                    [classId, accountId, languageCode],
                ),
            );

        return {
            id: classId,
            languageCode,
            teacherAccountId: accountId,
            createdAt: new Date().toISOString(),
        };
    }

    async rejectTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<void> {
        await this.db.execute(
            `UPDATE teacher_requests
             SET status = 'rejected', reviewed_by = ${this.placeholder(1)}, updated_at = ${this.tsNow()}
             WHERE id = ${this.placeholder(2)} AND status = 'pending'`,
            [reviewerAccountId, requestId],
        );
    }
}
