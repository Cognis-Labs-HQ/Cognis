import type {
    ClassJoinMode,
    ClassMembershipRow,
    ClassMembershipStatus,
    ClassRow,
    StudyLanguageRow,
    TeacherRequestRow,
    TeacherRequestStatus,
} from "./types.js";

function normalizeJoinMode(value: unknown): ClassJoinMode {
    const joinMode = String(value ?? "")
        .trim()
        .toLowerCase();
    if (joinMode === "invite_only" || joinMode === "open") {
        return joinMode;
    }
    return "on_request";
}

export function rowToStudyLanguage(
    row: Record<string, unknown>,
): StudyLanguageRow {
    return {
        code: String(row.code),
        name: String(row.name),
        flag: String(row.flag ?? ""),
        available: Boolean(row.available),
        active: Boolean(row.active),
        sortOrder: Number(row.sort_order ?? 0),
    };
}

export function rowToClassRow(row: Record<string, unknown>): ClassRow {
    return {
        id: String(row.id),
        name: String(row.name ?? ""),
        languageCode: String(row.language_code),
        teacherAccountId: String(row.teacher_account_id),
        joinMode: normalizeJoinMode(row.join_mode),
        isListed: Boolean(row.is_listed),
        createdAt: String(row.created_at),
    };
}

export function rowToTeacherRequest(
    row: Record<string, unknown>,
): TeacherRequestRow {
    return {
        id: String(row.id),
        accountId: String(row.account_id),
        languageCode: String(row.language_code),
        className: String(row.class_name ?? ""),
        studentLimit: Number(row.student_limit ?? 0),
        joinMode: normalizeJoinMode(row.join_mode),
        isListed: Boolean(row.is_listed),
        status: String(row.status) as TeacherRequestStatus,
        reason: row.reason != null ? String(row.reason) : null,
        reviewedBy: row.reviewed_by != null ? String(row.reviewed_by) : null,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
    };
}

export function rowToClassMembership(
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

export function parseLanguageList(value: unknown): string[] {
    try {
        const parsedValue = JSON.parse(String(value ?? "[]"));
        return Array.isArray(parsedValue)
            ? parsedValue.filter(
                  (entry): entry is string => typeof entry === "string",
              )
            : [];
    } catch {
        return [];
    }
}

export function parseSeatAssignments(value: unknown): Record<string, number> {
    try {
        const parsedValue = JSON.parse(String(value ?? "{}"));
        if (
            !parsedValue ||
            typeof parsedValue !== "object" ||
            Array.isArray(parsedValue)
        ) {
            return {};
        }
        const seatAssignments: Record<string, number> = {};
        for (const [accountId, seatNumber] of Object.entries(parsedValue)) {
            const normalizedSeatNumber = Number(seatNumber);
            if (
                !Number.isInteger(normalizedSeatNumber) ||
                normalizedSeatNumber < 0
            ) {
                continue;
            }
            seatAssignments[String(accountId)] = normalizedSeatNumber;
        }
        return seatAssignments;
    } catch {
        return {};
    }
}
