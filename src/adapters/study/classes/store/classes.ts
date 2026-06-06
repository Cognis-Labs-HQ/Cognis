import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { DEFAULT_STUDENT_LIMIT } from "./constants.js";
import { parseSeatAssignments, rowToClassRow } from "./rows.js";
import type { ClassRow, ClassroomStateRow } from "./types.js";

export async function getClassesForTeacher(
    db: DbExecutor,
    teacherAccountId: string,
): Promise<ClassRow[]> {
    const result = await db.executeCommand({
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
        where: [{ column: "teacher_account_id", value: teacherAccountId }],
        orderBy: [{ column: "language_code", direction: "ASC" }],
    });
    return (result.rows ?? []).map((row) =>
        rowToClassRow(row as Record<string, unknown>),
    );
}

export async function getClassById(
    db: DbExecutor,
    classId: string,
): Promise<ClassRow | null> {
    const result = await db.executeCommand({
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
        where: [{ column: "id", value: classId }],
    });
    if (!result.rows?.length) {
        return null;
    }
    return rowToClassRow(result.rows[0] as Record<string, unknown>);
}

export async function getTeacherClassForLanguage(
    db: DbExecutor,
    teacherAccountId: string,
    languageCode: string,
): Promise<ClassRow | null> {
    const result = await db.executeCommand({
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
            { column: "teacher_account_id", value: teacherAccountId },
            { column: "language_code", value: languageCode },
        ],
        limit: 1,
    });
    if (!result.rows?.length) {
        return null;
    }
    return rowToClassRow(result.rows[0] as Record<string, unknown>);
}

export async function getClassroomState(
    db: DbExecutor,
    classId: string,
): Promise<ClassroomStateRow> {
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_state",
        values: {
            class_id: classId,
            student_limit: DEFAULT_STUDENT_LIMIT,
            seat_assignments: "{}",
            updated_at: new Date().toISOString(),
        },
        conflict: { action: "ignore" },
    });
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_state",
        columns: [
            "class_id",
            "student_limit",
            "seat_assignments",
            "updated_at",
        ],
        where: [{ column: "class_id", value: classId }],
    });
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
        return {
            classId,
            studentLimit: DEFAULT_STUDENT_LIMIT,
            seatAssignments: {},
            updatedAt: new Date().toISOString(),
        };
    }
    const normalizedStudentLimit = Number(
        row.student_limit ?? DEFAULT_STUDENT_LIMIT,
    );
    return {
        classId: String(row.class_id),
        studentLimit:
            Number.isInteger(normalizedStudentLimit) &&
            normalizedStudentLimit > 0
                ? normalizedStudentLimit
                : DEFAULT_STUDENT_LIMIT,
        seatAssignments: parseSeatAssignments(row.seat_assignments),
        updatedAt: String(row.updated_at),
    };
}

export async function updateClassroomStateForTeacher(
    db: DbExecutor,
    classId: string,
    teacherAccountId: string,
    options: {
        studentLimit?: number;
        seatAssignments?: Record<string, number>;
    },
): Promise<ClassroomStateRow> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    const currentState = await getClassroomState(db, classId);
    const hasStudentLimit = Number.isInteger(options.studentLimit);
    const normalizedStudentLimit = hasStudentLimit
        ? Number(options.studentLimit)
        : currentState.studentLimit;
    if (normalizedStudentLimit < 1 || normalizedStudentLimit > 300) {
        throw new Error("invalid_student_limit");
    }
    const normalizedSeatAssignments =
        options.seatAssignments != null
            ? parseSeatAssignments(JSON.stringify(options.seatAssignments))
            : currentState.seatAssignments;
    const updatedAt = new Date().toISOString();
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_state",
        values: {
            class_id: classId,
            student_limit: normalizedStudentLimit,
            seat_assignments: JSON.stringify(normalizedSeatAssignments),
            updated_at: updatedAt,
        },
        conflict: {
            action: "update",
            target: ["class_id"],
            update: {
                student_limit: normalizedStudentLimit,
                seat_assignments: JSON.stringify(normalizedSeatAssignments),
                updated_at: updatedAt,
            },
        },
    });
    return getClassroomState(db, classId);
}

export async function getEnrolledClasses(
    db: DbExecutor,
    studentAccountId: string,
): Promise<ClassRow[]> {
    const membershipsResult = await db.executeCommand({
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
    if (!classIds.length) {
        return [];
    }
    const classRows = await Promise.allSettled(
        classIds.map((classId) => getClassById(db, classId)),
    );
    return classRows
        .filter(
            (result): result is PromiseFulfilledResult<ClassRow | null> =>
                result.status === "fulfilled",
        )
        .map((result) => result.value)
        .filter((row): row is ClassRow => row !== null);
}

export async function getAvailableClasses(
    db: DbExecutor,
    languageCode?: string,
    excludeAccountId?: string,
): Promise<ClassRow[]> {
    const whereClause: Array<{ column: string; value: unknown }> = [
        { column: "is_listed", value: 1 },
    ];
    if (languageCode) {
        whereClause.push({ column: "language_code", value: languageCode });
    }
    const result = await db.executeCommand({
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
        ...(whereClause.length ? { where: whereClause } : {}),
        orderBy: [{ column: "language_code", direction: "ASC" }],
    });
    const allClasses = (result.rows ?? []).map((row) =>
        rowToClassRow(row as Record<string, unknown>),
    );
    if (!excludeAccountId) {
        return allClasses;
    }
    const membershipResult = await db.executeCommand({
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
    return allClasses.filter(
        (classRow) =>
            !excludedIds.has(classRow.id) &&
            classRow.teacherAccountId !== excludeAccountId,
    );
}

export async function getClassesForTeacherWithFilter(
    db: DbExecutor,
    teacherAccountId: string,
    languageCode?: string,
): Promise<(ClassRow & { memberCount: number })[]> {
    const whereClause: Array<{ column: string; value: unknown }> = [
        { column: "teacher_account_id", value: teacherAccountId },
    ];
    if (languageCode) {
        whereClause.push({ column: "language_code", value: languageCode });
    }
    const result = await db.executeCommand({
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
        where: whereClause,
        orderBy: [{ column: "language_code", direction: "ASC" }],
    });
    const classes = (result.rows ?? []).map((row) =>
        rowToClassRow(row as Record<string, unknown>),
    );
    const countResults = await Promise.allSettled(
        classes.map(async (classRow) => {
            const countResult = await db.executeCommand({
                option: "SELECT",
                table: "class_memberships",
                count: true,
                where: [
                    { column: "class_id", value: classRow.id },
                    { column: "status", value: "member" },
                ],
            });
            const memberCount = Number(
                (countResult.rows?.[0] as Record<string, unknown> | undefined)
                    ?.cnt ?? 0,
            );
            return { ...classRow, memberCount };
        }),
    );
    return countResults.map((result, index) =>
        result.status === "fulfilled"
            ? result.value
            : { ...classes[index], memberCount: 0 },
    );
}
