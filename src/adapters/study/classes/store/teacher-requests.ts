import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToTeacherRequest } from "./rows.js";
import type { ClassRow, TeacherRequestRow } from "./types.js";

export async function getTeacherRequest(
    db: DbExecutor,
    accountId: string,
    languageCode: string,
): Promise<TeacherRequestRow | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "teacher_requests",
        columns: [
            "id",
            "account_id",
            "language_code",
            "join_mode",
            "is_listed",
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
    if (!result.rows?.length) {
        return null;
    }
    return rowToTeacherRequest(result.rows[0] as Record<string, unknown>);
}

export async function listPendingRequests(
    db: DbExecutor,
): Promise<TeacherRequestRow[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "teacher_requests",
        columns: [
            "id",
            "account_id",
            "language_code",
            "join_mode",
            "is_listed",
            "reason",
            "status",
            "reviewed_by",
            "created_at",
            "updated_at",
        ],
        where: [{ column: "status", value: "pending" }],
        orderBy: [{ column: "created_at", direction: "ASC" }],
    });
    return (result.rows ?? []).map((row) =>
        rowToTeacherRequest(row as Record<string, unknown>),
    );
}

export async function submitTeacherRequest(
    db: DbExecutor,
    accountId: string,
    languageCode: string,
    reason: string | null,
    joinMode: ClassRow["joinMode"],
    isListed: boolean,
): Promise<TeacherRequestRow> {
    const requestId = randomUUID();
    const nowIso = new Date().toISOString();
    await db.executeCommand({
        option: "INSERT",
        table: "teacher_requests",
        values: {
            id: requestId,
            account_id: accountId,
            language_code: languageCode,
            join_mode: joinMode,
            is_listed: isListed ? 1 : 0,
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
        joinMode,
        isListed,
        status: "pending",
        reason,
        reviewedBy: null,
        createdAt: nowIso,
        updatedAt: nowIso,
    };
}

export async function approveTeacherRequest(
    db: DbExecutor,
    requestId: string,
    reviewerAccountId: string,
): Promise<ClassRow | null> {
    return db.transaction(async (executor) => {
        const requestResult = await executor.executeCommand({
            option: "SELECT",
            table: "teacher_requests",
            columns: [
                "id",
                "account_id",
                "language_code",
                "join_mode",
                "is_listed",
            ],
            where: [
                { column: "id", value: requestId },
                { column: "status", value: "pending" },
            ],
        });
        if (!requestResult.rows?.length) {
            return null;
        }

        const requestRow = requestResult.rows[0];
        const accountId = String(requestRow.account_id);
        const languageCode = String(requestRow.language_code);
        const joinMode = String(requestRow.join_mode ?? "on_request")
            .trim()
            .toLowerCase();
        const isListed = Boolean(requestRow.is_listed);
        const nowIso = new Date().toISOString();

        const existingClassResult = await executor.executeCommand({
            option: "SELECT",
            table: "study_classes",
            columns: [
                "id",
                "language_code",
                "teacher_account_id",
                "join_mode",
                "is_listed",
                "created_at",
            ],
            where: [
                { column: "teacher_account_id", value: accountId },
                { column: "language_code", value: languageCode },
            ],
            limit: 1,
        });
        const existingClassRow = existingClassResult.rows?.[0];

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

        const classId = existingClassRow
            ? String(existingClassRow.id)
            : randomUUID();
        if (!existingClassRow) {
            await executor.executeCommand({
                option: "INSERT",
                table: "study_classes",
                values: {
                    id: classId,
                    language_code: languageCode,
                    teacher_account_id: accountId,
                    join_mode:
                        joinMode === "invite_only" || joinMode === "open"
                            ? joinMode
                            : "on_request",
                    is_listed: isListed ? 1 : 0,
                    created_at: nowIso,
                },
            });
        }

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
            joinMode:
                existingClassRow && typeof existingClassRow.join_mode === "string"
                    ? (String(existingClassRow.join_mode) as ClassRow["joinMode"])
                    : joinMode === "invite_only" || joinMode === "open"
                      ? (joinMode as ClassRow["joinMode"])
                      : "on_request",
            isListed:
                existingClassRow && existingClassRow.is_listed != null
                    ? Boolean(existingClassRow.is_listed)
                    : isListed,
            createdAt: existingClassRow
                ? String(existingClassRow.created_at ?? nowIso)
                : nowIso,
        };
    });
}

export async function rejectTeacherRequest(
    db: DbExecutor,
    requestId: string,
    reviewerAccountId: string,
): Promise<void> {
    await db.executeCommand({
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
