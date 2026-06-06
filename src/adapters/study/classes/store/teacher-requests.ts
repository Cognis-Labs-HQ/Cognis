import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { DEFAULT_STUDENT_LIMIT, MAX_STUDENT_LIMIT } from "./constants.js";
import { getTeacherClassForLanguage } from "./classes.js";
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
            "class_name",
            "student_limit",
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
            "class_name",
            "student_limit",
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
    className: string,
    studentLimit: number,
    reason: string | null,
    joinMode: ClassRow["joinMode"],
    isListed: boolean,
): Promise<TeacherRequestRow> {
    const requestId = randomUUID();
    const nowIso = new Date().toISOString();
    const normalizedStudentLimit =
        Number.isInteger(studentLimit) &&
        studentLimit > 0 &&
        studentLimit <= MAX_STUDENT_LIMIT
            ? Number(studentLimit)
            : DEFAULT_STUDENT_LIMIT;
    await db.executeCommand({
        option: "INSERT",
        table: "teacher_requests",
        values: {
            id: requestId,
            account_id: accountId,
            language_code: languageCode,
            class_name: className,
            student_limit: normalizedStudentLimit,
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
        className,
        studentLimit: normalizedStudentLimit,
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
                "class_name",
                "student_limit",
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
        const className = String(requestRow.class_name ?? "").trim();
        const studentLimitRaw = Number(
            requestRow.student_limit ?? DEFAULT_STUDENT_LIMIT,
        );
        const studentLimit =
            Number.isInteger(studentLimitRaw) &&
            studentLimitRaw > 0 &&
            studentLimitRaw <= MAX_STUDENT_LIMIT
                ? studentLimitRaw
                : DEFAULT_STUDENT_LIMIT;
        const joinMode = String(requestRow.join_mode ?? "on_request")
            .trim()
            .toLowerCase();
        const isListed = Boolean(requestRow.is_listed);
        const nowIso = new Date().toISOString();

        const existingClassRow = await getTeacherClassForLanguage(
            executor,
            accountId,
            languageCode,
        );

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

        const classId = existingClassRow ? existingClassRow.id : randomUUID();
        if (!existingClassRow) {
            await executor.executeCommand({
                option: "INSERT",
                table: "study_classes",
                values: {
                    id: classId,
                    name: className,
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
            await executor.executeCommand({
                option: "INSERT",
                table: "classroom_state",
                values: {
                    class_id: classId,
                    student_limit: studentLimit,
                    seat_assignments: "{}",
                    updated_at: nowIso,
                },
                conflict: {
                    action: "update",
                    target: ["class_id"],
                    update: {
                        student_limit: studentLimit,
                        updated_at: nowIso,
                    },
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
            name: existingClassRow?.name ?? className,
            languageCode,
            teacherAccountId: accountId,
            joinMode: existingClassRow?.joinMode
                ? existingClassRow.joinMode
                : joinMode === "invite_only" || joinMode === "open"
                  ? (joinMode as ClassRow["joinMode"])
                  : "on_request",
            isListed:
                typeof existingClassRow?.isListed === "boolean"
                    ? existingClassRow.isListed
                    : isListed,
            createdAt: existingClassRow ? existingClassRow.createdAt : nowIso,
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
