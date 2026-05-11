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
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS study_classes (
        id TEXT PRIMARY KEY,
        language_code VARCHAR(32) NOT NULL,
        teacher_account_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS teacher_requests (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        language_code VARCHAR(32) NOT NULL,
        reason TEXT,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        reviewed_by TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (account_id, language_code)
      )`,
        );

        await this.db
            .execute("ALTER TABLE teacher_requests ADD COLUMN reason TEXT")
            .catch(() => undefined);

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS teacher_assignments (
        account_id TEXT NOT NULL,
        language_code VARCHAR(32) NOT NULL,
        class_id TEXT NOT NULL,
        assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (account_id, language_code)
      )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS study_user_preferences (
        account_id TEXT PRIMARY KEY,
        learning_languages TEXT NOT NULL DEFAULT '[]',
        teaching_languages TEXT NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
        );

        await this.ensureStudyLanguagesSchema();
    }

    async ensureStudyLanguagesSchema(): Promise<void> {
        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS study_languages (
        code VARCHAR(32) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        flag VARCHAR(8) NOT NULL DEFAULT '',
        available INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
        );

        const countResult = await this.db.executeCommand({
            option: "SELECT",
            table: "study_languages",
            count: true,
        });
        const existingLanguageCount = Number(countResult.rows?.[0]?.cnt ?? 0);
        if (existingLanguageCount === 0) {
            await this.seedStudyLanguages();
        }
    }

    private async seedStudyLanguages(): Promise<void> {
        const seeds = [
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
        for (const seed of seeds) {
            await this.db
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
        );
        return (result.rows ?? []).map((row) =>
            this.rowToStudyLanguage(row as Record<string, unknown>),
        );
    }

    async upsertStudyLanguage(
        row: Partial<StudyLanguageRow> & { code: string },
    ): Promise<StudyLanguageRow> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "study_languages",
            values: {
                code: row.code,
                name: row.name ?? "",
                flag: row.flag ?? "",
                available: row.available !== false ? 1 : 0,
                active: row.active === true ? 1 : 0,
                sort_order: row.sortOrder ?? 0,
            },
            conflict: {
                action: "update",
                target: ["code"],
            },
        });
        const result = await this.db.execute(
            `SELECT code, name, flag, available, active, sort_order
       FROM study_languages WHERE code = ?`,
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
       WHERE account_id = ?`,
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
        await this.db.executeCommand({
            option: "INSERT",
            table: "study_user_preferences",
            values: {
                account_id: accountId,
                learning_languages: learningJson,
                teaching_languages: teachingJson,
                updated_at: new Date().toISOString(),
            },
            conflict: {
                action: "update",
                target: ["account_id"],
            },
        });
        return this.getStudyPreferences(accountId);
    }

    async getClassesForTeacher(teacherAccountId: string): Promise<ClassRow[]> {
        const result = await this.db.execute(
            `SELECT id, language_code, teacher_account_id, created_at
       FROM study_classes
       WHERE teacher_account_id = ?
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
       WHERE account_id = ? AND language_code = ?`,
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
       VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
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
       WHERE id = ? AND status = 'pending'`,
            [requestId],
        );
        if (!requestResult.rows.length) return null;

        const row = requestResult.rows[0];
        const accountId = String(row.account_id);
        const languageCode = String(row.language_code);

        await this.db.execute(
            `UPDATE teacher_requests
       SET status = 'approved', reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [reviewerAccountId, requestId],
        );

        const classId = randomUUID();
        await this.db.execute(
            `INSERT INTO study_classes (id, language_code, teacher_account_id, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
            [classId, languageCode, accountId],
        );

        await this.db.executeCommand({
            option: "INSERT",
            table: "teacher_assignments",
            values: {
                account_id: accountId,
                language_code: languageCode,
                class_id: classId,
                assigned_at: new Date().toISOString(),
            },
            conflict: {
                action: "update",
                target: ["account_id", "language_code"],
                update: { class_id: classId },
            },
        });

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
       SET status = 'rejected', reviewed_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
            [reviewerAccountId, requestId],
        );
    }
}
