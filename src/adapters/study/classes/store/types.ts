export type TeacherRequestStatus = "pending" | "approved" | "rejected";
export type ClassJoinMode = "invite_only" | "on_request" | "open";

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
    joinMode: ClassJoinMode;
    isListed: boolean;
    createdAt: string;
}

export interface ClassroomStateRow {
    classId: string;
    studentLimit: number;
    seatAssignments: Record<string, number>;
    updatedAt: string;
}

export interface ClassroomResourceRow {
    classId: string;
    materials: string;
    homework: string;
    updatedBy: string | null;
    updatedAt: string;
}

export interface ClassroomNotebookRow {
    classId: string;
    studentAccountId: string;
    noteText: string;
    updatedAt: string;
}

export type ClassroomNotebookAccessStatus = "pending" | "approved" | "rejected";

export interface ClassroomNotebookAccessRequestRow {
    classId: string;
    ownerStudentAccountId: string;
    viewerStudentAccountId: string;
    status: ClassroomNotebookAccessStatus;
    updatedAt: string;
}

export interface TeacherRequestRow {
    id: string;
    accountId: string;
    languageCode: string;
    joinMode: ClassJoinMode;
    isListed: boolean;
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
