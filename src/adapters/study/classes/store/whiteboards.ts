import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { getClassById } from "./classes.js";
import type { ClassroomWhiteboardRow } from "./types.js";

async function assertClassAccess(
    db: DbExecutor,
    classId: string,
    accountId: string,
): Promise<{ isTeacher: boolean }> {
    const classRow = await getClassById(db, classId);
    if (!classRow) throw new Error("not_authorized");
    if (classRow.teacherAccountId === accountId) {
        return { isTeacher: true };
    }
    const result = await db.executeCommand({
        option: "SELECT",
        table: "class_memberships",
        columns: ["status"],
        where: [
            { column: "class_id", value: classId },
            { column: "student_account_id", value: accountId },
        ],
    });
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row || String(row.status ?? "") !== "member") {
        throw new Error("not_authorized");
    }
    return { isTeacher: false };
}

export async function listClassroomWhiteboards(
    db: DbExecutor,
    classId: string,
    accountId: string,
): Promise<ClassroomWhiteboardRow[]> {
    await assertClassAccess(db, classId, accountId);
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_whiteboards",
        columns: [
            "id",
            "class_id",
            "name",
            "file_key",
            "created_by",
            "created_at",
        ],
        where: [{ column: "class_id", value: classId }],
        orderBy: [{ column: "created_at", direction: "ASC" }],
    });
    return (result.rows ?? []).map((raw) => {
        const row = raw as Record<string, unknown>;
        return {
            id: String(row.id),
            classId: String(row.class_id),
            name: String(row.name ?? ""),
            fileKey: row.file_key == null ? null : String(row.file_key),
            createdBy: String(row.created_by),
            createdAt: String(row.created_at),
        };
    });
}

export async function createClassroomWhiteboard(
    db: DbExecutor,
    classId: string,
    teacherAccountId: string,
    name: string,
): Promise<ClassroomWhiteboardRow> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_whiteboards",
        values: {
            id,
            class_id: classId,
            name: String(name).trim() || "Whiteboard",
            file_key: null,
            created_by: teacherAccountId,
            created_at: createdAt,
        },
    });
    return {
        id,
        classId,
        name: String(name).trim() || "Whiteboard",
        fileKey: null,
        createdBy: teacherAccountId,
        createdAt,
    };
}

export async function deleteClassroomWhiteboard(
    db: DbExecutor,
    classId: string,
    boardId: string,
    teacherAccountId: string,
): Promise<void> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    await db.executeCommand({
        option: "DELETE",
        table: "classroom_whiteboards",
        where: [
            { column: "id", value: boardId },
            { column: "class_id", value: classId },
        ],
    });
}

export async function getClassroomWhiteboard(
    db: DbExecutor,
    classId: string,
    boardId: string,
    accountId: string,
): Promise<ClassroomWhiteboardRow | null> {
    await assertClassAccess(db, classId, accountId);
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_whiteboards",
        columns: [
            "id",
            "class_id",
            "name",
            "file_key",
            "created_by",
            "created_at",
        ],
        where: [
            { column: "id", value: boardId },
            { column: "class_id", value: classId },
        ],
    });
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
        id: String(row.id),
        classId: String(row.class_id),
        name: String(row.name ?? ""),
        fileKey: row.file_key == null ? null : String(row.file_key),
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
    };
}

export async function setWhiteboardFileKey(
    db: DbExecutor,
    classId: string,
    boardId: string,
    fileKey: string,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "classroom_whiteboards",
        values: { file_key: fileKey },
        where: { id: boardId, class_id: classId },
    });
}
