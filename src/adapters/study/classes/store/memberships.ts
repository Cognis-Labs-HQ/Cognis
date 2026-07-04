import type { DbExecutor } from "./types.js";
import {
    getClassById,
    getClassroomState,
    updateClassroomStateForTeacher,
} from "./classes.js";
import { rowToClassMembership } from "./rows.js";
import type { ClassMembershipRow } from "./types.js";

export async function requestJoinClass(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
): Promise<ClassMembershipRow> {
    const nowIso = new Date().toISOString();
    const existingMembership = await getMembership(
        db,
        classId,
        studentAccountId,
    );
    const classRow = await getClassById(db, classId);
    if (!classRow) {
        throw new Error("not_authorized");
    }
    if (
        existingMembership &&
        (existingMembership.status === "pending" ||
            existingMembership.status === "member")
    ) {
        return existingMembership;
    }
    if (classRow.joinMode === "invite_only") {
        throw new Error("class_requires_invitation");
    }
    const nextStatus = classRow.joinMode === "open" ? "member" : "pending";
    await db.executeCommand({
        option: "INSERT",
        table: "class_memberships",
        values: {
            class_id: classId,
            student_account_id: studentAccountId,
            status: nextStatus,
            joined_at: nowIso,
        },
        conflict: {
            action: "update",
            target: ["class_id", "student_account_id"],
            update: { status: nextStatus, joined_at: nowIso },
        },
    });
    return {
        classId,
        studentAccountId,
        status: nextStatus,
        invitedBy: null,
        joinedAt: nowIso,
    };
}

export async function leaveClass(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
): Promise<void> {
    await db.executeCommand({
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

export async function inviteToClass(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
    teacherAccountId: string,
): Promise<ClassMembershipRow> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    const nowIso = new Date().toISOString();
    await db.executeCommand({
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
    const membership = await getMembership(db, classId, studentAccountId);
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

export async function getClassMembers(
    db: DbExecutor,
    classId: string,
    teacherAccountId: string,
    search?: string,
): Promise<ClassMembershipRow[]> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    const result = await db.executeCommand({
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
        rowToClassMembership(row as Record<string, unknown>),
    );
    if (!search) {
        return members;
    }
    const searchLower = search.toLowerCase();
    return members.filter((member) =>
        member.studentAccountId.toLowerCase().includes(searchLower),
    );
}

export async function getClassMembersForViewer(
    db: DbExecutor,
    classId: string,
    viewerAccountId: string,
): Promise<ClassMembershipRow[]> {
    const classRow = await getClassById(db, classId);
    if (!classRow) {
        throw new Error("not_authorized");
    }
    const isTeacher = classRow.teacherAccountId === viewerAccountId;
    if (!isTeacher) {
        const viewerMembership = await getMembership(
            db,
            classId,
            viewerAccountId,
        );
        if (!viewerMembership || viewerMembership.status !== "member") {
            throw new Error("not_authorized");
        }
    }
    const result = await db.executeCommand({
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
    return (result.rows ?? []).map((row) =>
        rowToClassMembership(row as Record<string, unknown>),
    );
}

export async function removeClassMemberByTeacher(
    db: DbExecutor,
    classId: string,
    teacherAccountId: string,
    studentAccountId: string,
): Promise<void> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    await db.executeCommand({
        option: "UPDATE",
        table: "class_memberships",
        set: { status: "left" },
        where: [
            { column: "class_id", value: classId },
            { column: "student_account_id", value: studentAccountId },
            { column: "status", value: "member" },
        ],
    });
    const classroomState = await getClassroomState(db, classId);
    if (!(studentAccountId in classroomState.seatAssignments)) {
        return;
    }
    const nextSeatAssignments = { ...classroomState.seatAssignments };
    delete nextSeatAssignments[studentAccountId];
    await updateClassroomStateForTeacher(db, classId, teacherAccountId, {
        seatAssignments: nextSeatAssignments,
        studentLimit: classroomState.studentLimit,
    });
}

export async function getPendingJoinRequests(
    db: DbExecutor,
    classId: string,
    teacherAccountId: string,
): Promise<ClassMembershipRow[]> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    const result = await db.executeCommand({
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
        rowToClassMembership(row as Record<string, unknown>),
    );
}

export async function reviewJoinRequest(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
    teacherAccountId: string,
    approve: boolean,
): Promise<void> {
    const classRow = await getClassById(db, classId);
    if (!classRow || classRow.teacherAccountId !== teacherAccountId) {
        throw new Error("not_authorized");
    }
    await db.executeCommand({
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

async function getMembership(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
): Promise<ClassMembershipRow | null> {
    const result = await db.executeCommand({
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
    if (!result.rows?.length) {
        return null;
    }
    return rowToClassMembership(result.rows[0] as Record<string, unknown>);
}

export async function getStudentMembershipStatus(
    db: DbExecutor,
    classId: string,
    studentAccountId: string,
): Promise<string | null> {
    const membership = await getMembership(db, classId, studentAccountId);
    return membership ? String(membership.status ?? "") : null;
}
