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
        const tsType =
            this.dbType === "postgresql" ? "TIMESTAMPTZ" : "DATETIME";
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
                status ${statusType} NOT NULL DEFAULT 'pending',
                reviewed_by ${idType},
                created_at ${tsDefault},
                updated_at ${tsDefault},
                UNIQUE (account_id, language_code)
            )`,
            [],
        );

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

        const tsType2 = tsType;
        void tsType2;
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
            id: String(row[0]),
            languageCode: String(row[1]),
            teacherAccountId: String(row[2]),
            createdAt: String(row[3]),
        }));
    }

    async getTeacherRequest(
        accountId: string,
        languageCode: string,
    ): Promise<TeacherRequestRow | null> {
        const result = await this.db.execute(
            `SELECT id, account_id, language_code, status, reviewed_by, created_at, updated_at
             FROM teacher_requests
             WHERE account_id = ${this.placeholder(1)} AND language_code = ${this.placeholder(2)}`,
            [accountId, languageCode],
        );
        if (!result.rows.length) return null;
        const row = result.rows[0];
        return {
            id: String(row[0]),
            accountId: String(row[1]),
            languageCode: String(row[2]),
            status: String(row[3]) as TeacherRequestStatus,
            reviewedBy: row[4] != null ? String(row[4]) : null,
            createdAt: String(row[5]),
            updatedAt: String(row[6]),
        };
    }

    async listPendingRequests(): Promise<TeacherRequestRow[]> {
        const result = await this.db.execute(
            `SELECT id, account_id, language_code, status, reviewed_by, created_at, updated_at
             FROM teacher_requests
             WHERE status = 'pending'
             ORDER BY created_at`,
            [],
        );
        return result.rows.map((row) => ({
            id: String(row[0]),
            accountId: String(row[1]),
            languageCode: String(row[2]),
            status: String(row[3]) as TeacherRequestStatus,
            reviewedBy: row[4] != null ? String(row[4]) : null,
            createdAt: String(row[5]),
            updatedAt: String(row[6]),
        }));
    }

    async submitTeacherRequest(
        accountId: string,
        languageCode: string,
    ): Promise<TeacherRequestRow> {
        const requestId = randomUUID();
        await this.db.execute(
            `INSERT INTO teacher_requests
             (id, account_id, language_code, status, created_at, updated_at)
             VALUES (
                 ${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)},
                 'pending', ${this.tsNow()}, ${this.tsNow()}
             )`,
            [requestId, accountId, languageCode],
        );
        return {
            id: requestId,
            accountId,
            languageCode,
            status: "pending",
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
        const accountId = String(row[1]);
        const languageCode = String(row[2]);

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
