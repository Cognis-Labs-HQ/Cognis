/**
 * DbClassesStore — persistence layer for the classes adapter.
 *
 * Responsibilities:
 *   - Schema initialisation for study_classes, teacher_requests,
 *     teacher_assignments, and class_memberships tables.
 *   - CRUD operations for class records, teacher requests, assignments,
 *     and student class memberships.
 *
 * Public exports:
 *   DbClassesStore — the store class.
 *   TeacherRequestStatus, ClassRow, TeacherRequestRow — types.
 *   ClassMembershipStatus, ClassMembershipRow — membership types.
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

export type ClassMembershipStatus = "pending" | "member" | "rejected" | "left";

export interface ClassMembershipRow {
    classId: string;
    studentAccountId: string;
    status: ClassMembershipStatus;
    invitedBy: string | null;
    joinedAt: string;
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
        await this.db.ensureTable({
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

        await this.db.ensureTable({
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

        await this.db.ensureTable({
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

        await this.db.ensureTable({
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

        await this.db.ensureTable({
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

        await this.ensureStudyLanguagesSchema();
    }

    async ensureStudyLanguagesSchema(): Promise<void> {
        await this.db.ensureTable({
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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_languages",
            columns: [
                "code",
                "name",
                "flag",
                "available",
                "active",
                "sort_order",
            ],
            ...(onlyAvailable
                ? { where: [{ column: "available", value: 1 }] }
                : {}),
            orderBy: [
                { column: "sort_order", direction: "ASC" },
                { column: "code", direction: "ASC" },
            ],
        });
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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_languages",
            columns: [
                "code",
                "name",
                "flag",
                "available",
                "active",
                "sort_order",
            ],
            where: [{ column: "code", value: row.code }],
        });
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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_user_preferences",
            columns: [
                "account_id",
                "learning_languages",
                "teaching_languages",
                "updated_at",
            ],
            where: [{ column: "account_id", value: accountId }],
        });
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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_classes",
            columns: [
                "id",
                "language_code",
                "teacher_account_id",
                "created_at",
            ],
            where: [{ column: "teacher_account_id", value: teacherAccountId }],
            orderBy: [{ column: "language_code", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => ({
            id: String(row.id),
            languageCode: String(row.language_code),
            teacherAccountId: String(row.teacher_account_id),
            createdAt: String(row.created_at),
        }));
    }

    private rowToClassMembership(
        row: Record<string, unknown>,
    ): ClassMembershipRow {
        return {
            classId: String(row.class_id),
            studentAccountId: String(row.student_account_id),
            status: String(row.status) as ClassMembershipStatus,
            invitedBy: row.invited_by != null ? String(row.invited_by) : null,
            joinedAt: String(row.joined_at),
        };
    }

    async getClassById(classId: string): Promise<ClassRow | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_classes",
            columns: [
                "id",
                "language_code",
                "teacher_account_id",
                "created_at",
            ],
            where: [{ column: "id", value: classId }],
        });
        if (!result.rows?.length) return null;
        const row = result.rows[0] as Record<string, unknown>;
        return {
            id: String(row.id),
            languageCode: String(row.language_code),
            teacherAccountId: String(row.teacher_account_id),
            createdAt: String(row.created_at),
        };
    }

    async getEnrolledClasses(studentAccountId: string): Promise<ClassRow[]> {
        const membershipsResult = await this.db.executeCommand({
            option: "SELECT",
            table: "class_memberships",
            columns: ["class_id"],
            where: [
                { column: "student_account_id", value: studentAccountId },
                { column: "status", value: "member" },
            ],
        });
        const classIds = (membershipsResult.rows ?? []).map((row) =>
            String((row as Record<string, unknown>).class_id),
        );
        if (!classIds.length) return [];
        const classRows = await Promise.all(
            classIds.map((id) => this.getClassById(id)),
        );
        return classRows.filter((row): row is ClassRow => row !== null);
    }

    async getAvailableClasses(
        languageCode?: string,
        excludeAccountId?: string,
    ): Promise<ClassRow[]> {
        const whereClause: Array<{ column: string; value: unknown }> = [];
        if (languageCode) {
            whereClause.push({ column: "language_code", value: languageCode });
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_classes",
            columns: [
                "id",
                "language_code",
                "teacher_account_id",
                "created_at",
            ],
            ...(whereClause.length ? { where: whereClause } : {}),
            orderBy: [{ column: "language_code", direction: "ASC" }],
        });
        const allClasses = (result.rows ?? []).map((row) => ({
            id: String((row as Record<string, unknown>).id),
            languageCode: String(
                (row as Record<string, unknown>).language_code,
            ),
            teacherAccountId: String(
                (row as Record<string, unknown>).teacher_account_id,
            ),
            createdAt: String((row as Record<string, unknown>).created_at),
        }));
        if (!excludeAccountId) return allClasses;
        const membershipResult = await this.db.executeCommand({
            option: "SELECT",
            table: "class_memberships",
            columns: ["class_id"],
            where: [{ column: "student_account_id", value: excludeAccountId }],
        });
        const excludedIds = new Set(
            (membershipResult.rows ?? []).map((row) =>
                String((row as Record<string, unknown>).class_id),
            ),
        );
        return allClasses.filter((cls) => !excludedIds.has(cls.id));
    }

    async requestJoinClass(
        classId: string,
        studentAccountId: string,
    ): Promise<ClassMembershipRow> {
        const nowIso = new Date().toISOString();
        const existing = await this.getMembership(classId, studentAccountId);
        if (
            existing &&
            (existing.status === "pending" || existing.status === "member")
        ) {
            return existing;
        }
        await this.db.executeCommand({
            option: "INSERT",
            table: "class_memberships",
            values: {
                class_id: classId,
                student_account_id: studentAccountId,
                status: "pending",
                joined_at: nowIso,
            },
            conflict: {
                action: "update",
                target: ["class_id", "student_account_id"],
                update: { status: "pending", joined_at: nowIso },
            },
        });
        return {
            classId,
            studentAccountId,
            status: "pending",
            invitedBy: null,
            joinedAt: nowIso,
        };
    }

    async leaveClass(classId: string, studentAccountId: string): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "class_memberships",
            set: { status: "left" },
            where: [
                { column: "class_id", value: classId },
                { column: "student_account_id", value: studentAccountId },
                { column: "status", value: "member" },
            ],
        });
    }

    async inviteToClass(
        classId: string,
        studentAccountId: string,
        teacherAccountId: string,
    ): Promise<ClassMembershipRow> {
        const classRow = await this.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
            throw new Error("not_authorized");
        }
        const nowIso = new Date().toISOString();
        await this.db.executeCommand({
            option: "INSERT",
            table: "class_memberships",
            values: {
                class_id: classId,
                student_account_id: studentAccountId,
                status: "member",
                invited_by: teacherAccountId,
                joined_at: nowIso,
            },
            conflict: {
                action: "update",
                target: ["class_id", "student_account_id"],
                update: {
                    status: "member",
                    invited_by: teacherAccountId,
                },
            },
        });
        const membership = await this.getMembership(classId, studentAccountId);
        return (
            membership ?? {
                classId,
                studentAccountId,
                status: "member",
                invitedBy: teacherAccountId,
                joinedAt: nowIso,
            }
        );
    }

    async getClassMembers(
        classId: string,
        teacherAccountId: string,
        search?: string,
    ): Promise<ClassMembershipRow[]> {
        const classRow = await this.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
            throw new Error("not_authorized");
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "class_memberships",
            columns: [
                "class_id",
                "student_account_id",
                "status",
                "invited_by",
                "joined_at",
            ],
            where: [
                { column: "class_id", value: classId },
                { column: "status", value: "member" },
            ],
            orderBy: [{ column: "joined_at", direction: "ASC" }],
        });
        const members = (result.rows ?? []).map((row) =>
            this.rowToClassMembership(row as Record<string, unknown>),
        );
        if (!search) return members;
        const searchLower = search.toLowerCase();
        return members.filter((member) =>
            member.studentAccountId.toLowerCase().includes(searchLower),
        );
    }

    async getPendingJoinRequests(
        classId: string,
        teacherAccountId: string,
    ): Promise<ClassMembershipRow[]> {
        const classRow = await this.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
            throw new Error("not_authorized");
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "class_memberships",
            columns: [
                "class_id",
                "student_account_id",
                "status",
                "invited_by",
                "joined_at",
            ],
            where: [
                { column: "class_id", value: classId },
                { column: "status", value: "pending" },
            ],
            orderBy: [{ column: "joined_at", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) =>
            this.rowToClassMembership(row as Record<string, unknown>),
        );
    }

    async reviewJoinRequest(
        classId: string,
        studentAccountId: string,
        teacherAccountId: string,
        approve: boolean,
    ): Promise<void> {
        const classRow = await this.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
            throw new Error("not_authorized");
        }
        await this.db.executeCommand({
            option: "UPDATE",
            table: "class_memberships",
            set: { status: approve ? "member" : "rejected" },
            where: [
                { column: "class_id", value: classId },
                { column: "student_account_id", value: studentAccountId },
                { column: "status", value: "pending" },
            ],
        });
    }

    async getClassesForTeacherWithFilter(
        teacherAccountId: string,
        languageCode?: string,
    ): Promise<(ClassRow & { memberCount: number })[]> {
        const whereClause: Array<{ column: string; value: unknown }> = [
            { column: "teacher_account_id", value: teacherAccountId },
        ];
        if (languageCode) {
            whereClause.push({ column: "language_code", value: languageCode });
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_classes",
            columns: [
                "id",
                "language_code",
                "teacher_account_id",
                "created_at",
            ],
            where: whereClause,
            orderBy: [{ column: "language_code", direction: "ASC" }],
        });
        const classes = (result.rows ?? []).map((row) => ({
            id: String((row as Record<string, unknown>).id),
            languageCode: String(
                (row as Record<string, unknown>).language_code,
            ),
            teacherAccountId: String(
                (row as Record<string, unknown>).teacher_account_id,
            ),
            createdAt: String((row as Record<string, unknown>).created_at),
        }));
        const withCounts = await Promise.all(
            classes.map(async (cls) => {
                const countResult = await this.db.executeCommand({
                    option: "SELECT",
                    table: "class_memberships",
                    count: true,
                    where: [
                        { column: "class_id", value: cls.id },
                        { column: "status", value: "member" },
                    ],
                });
                const memberCount = Number(
                    (
                        countResult.rows?.[0] as
                            | Record<string, unknown>
                            | undefined
                    )?.cnt ?? 0,
                );
                return { ...cls, memberCount };
            }),
        );
        return withCounts;
    }

    private async getMembership(
        classId: string,
        studentAccountId: string,
    ): Promise<ClassMembershipRow | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "class_memberships",
            columns: [
                "class_id",
                "student_account_id",
                "status",
                "invited_by",
                "joined_at",
            ],
            where: [
                { column: "class_id", value: classId },
                { column: "student_account_id", value: studentAccountId },
            ],
        });
        if (!result.rows?.length) return null;
        return this.rowToClassMembership(
            result.rows[0] as Record<string, unknown>,
        );
    }

    async getTeacherRequest(
        accountId: string,
        languageCode: string,
    ): Promise<TeacherRequestRow | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "teacher_requests",
            columns: [
                "id",
                "account_id",
                "language_code",
                "reason",
                "status",
                "reviewed_by",
                "created_at",
                "updated_at",
            ],
            where: [
                { column: "account_id", value: accountId },
                { column: "language_code", value: languageCode },
            ],
        });
        if (!result.rows?.length) return null;
        return this.rowToTeacherRequest(result.rows[0]);
    }

    async listPendingRequests(): Promise<TeacherRequestRow[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "teacher_requests",
            columns: [
                "id",
                "account_id",
                "language_code",
                "reason",
                "status",
                "reviewed_by",
                "created_at",
                "updated_at",
            ],
            where: [{ column: "status", value: "pending" }],
            orderBy: [{ column: "created_at", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => this.rowToTeacherRequest(row));
    }

    async submitTeacherRequest(
        accountId: string,
        languageCode: string,
        reason: string | null,
    ): Promise<TeacherRequestRow> {
        const requestId = randomUUID();
        const nowIso = new Date().toISOString();
        await this.db.executeCommand({
            option: "INSERT",
            table: "teacher_requests",
            values: {
                id: requestId,
                account_id: accountId,
                language_code: languageCode,
                reason,
                status: "pending",
                created_at: nowIso,
                updated_at: nowIso,
            },
        });
        return {
            id: requestId,
            accountId,
            languageCode,
            status: "pending",
            reason,
            reviewedBy: null,
            createdAt: nowIso,
            updatedAt: nowIso,
        };
    }

    async approveTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<ClassRow | null> {
        return this.db.transaction(async (executor) => {
            const requestResult = await executor.executeCommand({
                option: "SELECT",
                table: "teacher_requests",
                columns: ["id", "account_id", "language_code"],
                where: [
                    { column: "id", value: requestId },
                    { column: "status", value: "pending" },
                ],
            });
            if (!requestResult.rows?.length) return null;

            const requestRow = requestResult.rows[0];
            const accountId = String(requestRow.account_id);
            const languageCode = String(requestRow.language_code);
            const nowIso = new Date().toISOString();

            await executor.executeCommand({
                option: "UPDATE",
                table: "teacher_requests",
                set: {
                    status: "approved",
                    reviewed_by: reviewerAccountId,
                    updated_at: nowIso,
                },
                where: [{ column: "id", value: requestId }],
            });

            const classId = randomUUID();
            await executor.executeCommand({
                option: "INSERT",
                table: "study_classes",
                values: {
                    id: classId,
                    language_code: languageCode,
                    teacher_account_id: accountId,
                    created_at: nowIso,
                },
            });

            await executor.executeCommand({
                option: "INSERT",
                table: "teacher_assignments",
                values: {
                    account_id: accountId,
                    language_code: languageCode,
                    class_id: classId,
                    assigned_at: nowIso,
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
                createdAt: nowIso,
            };
        });
    }

    async rejectTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "teacher_requests",
            set: {
                status: "rejected",
                reviewed_by: reviewerAccountId,
                updated_at: new Date().toISOString(),
            },
            where: [
                { column: "id", value: requestId },
                { column: "status", value: "pending" },
            ],
        });
    }
}
