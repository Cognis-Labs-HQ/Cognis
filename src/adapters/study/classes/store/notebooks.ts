import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { getClassById } from "./classes.js";
import type {
    AttachedFileRef,
    ClassroomNotebookAccessRequestRow,
    ClassroomNotebookAccessStatus,
    ClassroomNotebookRow,
    ClassroomResourceRow,
} from "./types.js";

function parseAttachedFiles(value: unknown): AttachedFileRef[] {
    try {
        const parsed = JSON.parse(String(value ?? "[]"));
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (item): item is AttachedFileRef =>
                item !== null &&
                typeof item === "object" &&
                typeof item.key === "string" &&
                typeof item.name === "string",
        );
    } catch {
        return [];
    }
}

async function getMembershipStatus(
    db: DbExecutor,
    classId: string,
    accountId: string,
): Promise<string | null> {
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
    if (!row) return null;
    return String(row.status ?? "");
}

async function assertViewerHasClassAccess(
    db: DbExecutor,
    classId: string,
    viewerAccountId: string,
): Promise<{ teacherAccountId: string; isTeacher: boolean }> {
    const classRow = await getClassById(db, classId);
    if (!classRow) throw new Error("not_authorized");
    const isTeacher = classRow.teacherAccountId === viewerAccountId;
    if (!isTeacher) {
        const status = await getMembershipStatus(db, classId, viewerAccountId);
        if (status !== "member") throw new Error("not_authorized");
    }
    return { teacherAccountId: classRow.teacherAccountId, isTeacher };
}

export async function getClassroomResourcesForViewer(
    db: DbExecutor,
    classId: string,
    viewerAccountId: string,
): Promise<ClassroomResourceRow> {
    await assertViewerHasClassAccess(db, classId, viewerAccountId);
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_resources",
        columns: [
            "class_id",
            "materials",
            "homework",
            "files",
            "updated_by",
            "updated_at",
        ],
        where: [{ column: "class_id", value: classId }],
    });
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
        return {
            classId,
            materials: "",
            homework: "",
            files: [],
            updatedBy: null,
            updatedAt: new Date().toISOString(),
        };
    }
    return {
        classId: String(row.class_id),
        materials: String(row.materials ?? ""),
        homework: String(row.homework ?? ""),
        files: parseAttachedFiles(row.files),
        updatedBy: row.updated_by == null ? null : String(row.updated_by),
        updatedAt: String(row.updated_at),
    };
}

export async function updateClassroomResourcesForTeacher(
    db: DbExecutor,
    classId: string,
    teacherAccountId: string,
    input: { materials?: string; homework?: string; files?: AttachedFileRef[] },
): Promise<ClassroomResourceRow> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    const current = await getClassroomResourcesForViewer(
        db,
        classId,
        teacherAccountId,
    );
    const updatedAt = new Date().toISOString();
    const nextMaterials =
        input.materials == null ? current.materials : String(input.materials);
    const nextHomework =
        input.homework == null ? current.homework : String(input.homework);
    const nextFiles = input.files == null ? current.files : input.files;
    const filesJson = JSON.stringify(nextFiles);
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_resources",
        values: {
            class_id: classId,
            materials: nextMaterials,
            homework: nextHomework,
            files: filesJson,
            updated_by: teacherAccountId,
            updated_at: updatedAt,
        },
        conflict: {
            action: "update",
            target: ["class_id"],
            update: {
                materials: nextMaterials,
                homework: nextHomework,
                files: filesJson,
                updated_by: teacherAccountId,
                updated_at: updatedAt,
            },
        },
    });
    return {
        classId,
        materials: nextMaterials,
        homework: nextHomework,
        files: nextFiles,
        updatedBy: teacherAccountId,
        updatedAt,
    };
}

export async function getOwnNotebook(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
): Promise<ClassroomNotebookRow> {
    await assertViewerHasClassAccess(db, classId, studentAccountId);
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_notebooks",
        columns: ["class_id", "student_account_id", "note_text", "updated_at"],
        where: [
            { column: "class_id", value: classId },
            { column: "student_account_id", value: studentAccountId },
        ],
    });
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) {
        return {
            classId,
            studentAccountId,
            noteText: "",
            updatedAt: new Date().toISOString(),
        };
    }
    return {
        classId: String(row.class_id),
        studentAccountId: String(row.student_account_id),
        noteText: String(row.note_text ?? ""),
        updatedAt: String(row.updated_at),
    };
}

export async function updateOwnNotebook(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
    noteText: string,
): Promise<ClassroomNotebookRow> {
    await assertViewerHasClassAccess(db, classId, studentAccountId);
    const updatedAt = new Date().toISOString();
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_notebooks",
        values: {
            class_id: classId,
            student_account_id: studentAccountId,
            note_text: noteText,
            updated_at: updatedAt,
        },
        conflict: {
            action: "update",
            target: ["class_id", "student_account_id"],
            update: { note_text: noteText, updated_at: updatedAt },
        },
    });
    return { classId, studentAccountId, noteText, updatedAt };
}

async function getNotebookAccessStatus(
    db: DbExecutor,
    classId: string,
    ownerStudentAccountId: string,
    viewerStudentAccountId: string,
): Promise<ClassroomNotebookAccessStatus | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_note_access_requests",
        columns: ["status"],
        where: [
            { column: "class_id", value: classId },
            {
                column: "owner_student_account_id",
                value: ownerStudentAccountId,
            },
            {
                column: "viewer_student_account_id",
                value: viewerStudentAccountId,
            },
        ],
    });
    const row = result.rows?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const status = String(row.status ?? "");
    if (
        status === "pending" ||
        status === "approved" ||
        status === "rejected"
    ) {
        return status;
    }
    return null;
}

export async function getNotebookForViewer(
    db: DbExecutor,
    classId: string,
    ownerStudentAccountId: string,
    viewerAccountId: string,
    areFriends?: (accountA: string, accountB: string) => Promise<boolean>,
): Promise<ClassroomNotebookRow> {
    const { isTeacher } = await assertViewerHasClassAccess(
        db,
        classId,
        viewerAccountId,
    );
    const ownerStatus = await getMembershipStatus(
        db,
        classId,
        ownerStudentAccountId,
    );
    if (ownerStatus !== "member") throw new Error("not_authorized");
    if (viewerAccountId !== ownerStudentAccountId && !isTeacher) {
        const friendsAllowed =
            (await areFriends?.(viewerAccountId, ownerStudentAccountId)) ===
            true;
        if (!friendsAllowed) {
            const accessStatus = await getNotebookAccessStatus(
                db,
                classId,
                ownerStudentAccountId,
                viewerAccountId,
            );
            if (accessStatus !== "approved") {
                throw new Error("access_request_required");
            }
        }
    }
    return getOwnNotebook(db, classId, ownerStudentAccountId);
}

export async function requestNotebookAccess(
    db: DbExecutor,
    classId: string,
    ownerStudentAccountId: string,
    viewerStudentAccountId: string,
): Promise<ClassroomNotebookAccessRequestRow> {
    await assertViewerHasClassAccess(db, classId, viewerStudentAccountId);
    if (ownerStudentAccountId === viewerStudentAccountId) {
        throw new Error("bad_request");
    }
    const ownerStatus = await getMembershipStatus(
        db,
        classId,
        ownerStudentAccountId,
    );
    if (ownerStatus !== "member") throw new Error("not_authorized");
    const updatedAt = new Date().toISOString();
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_note_access_requests",
        values: {
            class_id: classId,
            owner_student_account_id: ownerStudentAccountId,
            viewer_student_account_id: viewerStudentAccountId,
            status: "pending",
            updated_at: updatedAt,
        },
        conflict: {
            action: "update",
            target: [
                "class_id",
                "owner_student_account_id",
                "viewer_student_account_id",
            ],
            update: { status: "pending", updated_at: updatedAt },
        },
    });
    return {
        classId,
        ownerStudentAccountId,
        viewerStudentAccountId,
        status: "pending",
        updatedAt,
    };
}

export async function listIncomingNotebookAccessRequests(
    db: DbExecutor,
    classId: string,
    ownerStudentAccountId: string,
): Promise<ClassroomNotebookAccessRequestRow[]> {
    await assertViewerHasClassAccess(db, classId, ownerStudentAccountId);
    const ownerStatus = await getMembershipStatus(
        db,
        classId,
        ownerStudentAccountId,
    );
    if (ownerStatus !== "member") return [];
    const result = await db.executeCommand({
        option: "SELECT",
        table: "classroom_note_access_requests",
        columns: [
            "class_id",
            "owner_student_account_id",
            "viewer_student_account_id",
            "status",
            "updated_at",
        ],
        where: [
            { column: "class_id", value: classId },
            {
                column: "owner_student_account_id",
                value: ownerStudentAccountId,
            },
            { column: "status", value: "pending" },
        ],
        orderBy: [{ column: "updated_at", direction: "DESC" }],
    });
    return (result.rows ?? []).map((row) => {
        const data = row as Record<string, unknown>;
        return {
            classId: String(data.class_id),
            ownerStudentAccountId: String(data.owner_student_account_id),
            viewerStudentAccountId: String(data.viewer_student_account_id),
            status: "pending",
            updatedAt: String(data.updated_at),
        };
    });
}

export async function reviewNotebookAccessRequest(
    db: DbExecutor,
    classId: string,
    ownerStudentAccountId: string,
    viewerStudentAccountId: string,
    approve: boolean,
): Promise<ClassroomNotebookAccessRequestRow> {
    await assertViewerHasClassAccess(db, classId, ownerStudentAccountId);
    const ownerStatus = await getMembershipStatus(
        db,
        classId,
        ownerStudentAccountId,
    );
    if (ownerStatus !== "member") throw new Error("not_authorized");
    const viewerStatus = await getMembershipStatus(
        db,
        classId,
        viewerStudentAccountId,
    );
    if (viewerStatus !== "member") throw new Error("not_authorized");
    const status: ClassroomNotebookAccessStatus = approve
        ? "approved"
        : "rejected";
    const updatedAt = new Date().toISOString();
    await db.executeCommand({
        option: "INSERT",
        table: "classroom_note_access_requests",
        values: {
            class_id: classId,
            owner_student_account_id: ownerStudentAccountId,
            viewer_student_account_id: viewerStudentAccountId,
            status,
            updated_at: updatedAt,
        },
        conflict: {
            action: "update",
            target: [
                "class_id",
                "owner_student_account_id",
                "viewer_student_account_id",
            ],
            update: { status, updated_at: updatedAt },
        },
    });
    return {
        classId,
        ownerStudentAccountId,
        viewerStudentAccountId,
        status,
        updatedAt,
    };
}
