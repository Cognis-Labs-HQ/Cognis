import type { DbExecutor } from "./types.js";
import { DEFAULT_STUDENT_LIMIT } from "./constants.js";
import {
    disbandClassForTeacher,
    getAvailableClasses,
    getClassById,
    getClassroomState,
    getClassesForTeacher,
    getClassesForTeacherWithFilter,
    getEnrolledClasses,
    getTeacherClassForLanguage,
    updateClassroomStateForTeacher,
    updateClassNameForTeacher,
} from "./classes.js";
import { listStudyLanguages, upsertStudyLanguage } from "./languages.js";
import {
    getClassMembers,
    getClassMembersForViewer,
    getPendingJoinRequests,
    getStudentMembershipStatus,
    inviteToClass,
    leaveClass,
    removeClassMemberByTeacher,
    requestJoinClass,
    reviewJoinRequest,
} from "./memberships.js";
import {
    getClassroomResourcesForViewer,
    getNotebookForViewer,
    getOwnNotebook,
    listIncomingNotebookAccessRequests,
    requestNotebookAccess,
    reviewNotebookAccessRequest,
    updateClassroomResourcesForTeacher,
    updateOwnNotebook,
} from "./notebooks.js";
import { getStudyPreferences, saveStudyPreferences } from "./preferences.js";
import { ensureSchema, ensureStudyLanguagesSchema } from "./schema.js";
import {
    approveTeacherRequest,
    getTeacherRequest,
    listTeacherRequestsForAccount,
    listPendingRequests,
    rejectTeacherRequest,
    submitTeacherRequest,
} from "./teacher-requests.js";
import type {
    AgendaSnapshotRef,
    AttachedFileRef,
    ClassMembershipRow,
    ClassRow,
    ClassroomStateRow,
    ClassroomResourceRow,
    ClassroomNotebookRow,
    ClassroomNotebookAccessRequestRow,
    StudyLanguageRow,
    StudyPreferencesRow,
    TeacherRequestRow,
} from "./types.js";

export type { StudyLanguageRow };

export class DbClassesStore {
    constructor(private readonly db: DbExecutor) {}

    private static readonly DEFAULT_STUDENT_LIMIT = DEFAULT_STUDENT_LIMIT;

    async ensureSchema(): Promise<void> {
        await ensureSchema(this.db);
    }

    async ensureStudyLanguagesSchema(): Promise<void> {
        await ensureStudyLanguagesSchema(this.db);
    }

    async listStudyLanguages(
        onlyAvailable = false,
    ): Promise<StudyLanguageRow[]> {
        return listStudyLanguages(this.db, onlyAvailable);
    }

    async upsertStudyLanguage(
        row: Partial<StudyLanguageRow> & { code: string },
    ): Promise<StudyLanguageRow> {
        return upsertStudyLanguage(this.db, row);
    }

    async getStudyPreferences(accountId: string): Promise<StudyPreferencesRow> {
        return getStudyPreferences(this.db, accountId);
    }

    async saveStudyPreferences(
        accountId: string,
        learningLanguages: string[],
        teachingLanguages: string[],
    ): Promise<StudyPreferencesRow> {
        return saveStudyPreferences(
            this.db,
            accountId,
            learningLanguages,
            teachingLanguages,
        );
    }

    async getClassesForTeacher(teacherAccountId: string): Promise<ClassRow[]> {
        return getClassesForTeacher(this.db, teacherAccountId);
    }

    async disbandClassForTeacher(
        classId: string,
        teacherAccountId: string,
    ): Promise<ClassRow | null> {
        return disbandClassForTeacher(this.db, classId, teacherAccountId);
    }

    async updateClassNameForTeacher(
        classId: string,
        teacherAccountId: string,
        className: string,
    ): Promise<ClassRow> {
        return updateClassNameForTeacher(
            this.db,
            classId,
            teacherAccountId,
            className,
        );
    }

    async getClassById(classId: string): Promise<ClassRow | null> {
        return getClassById(this.db, classId);
    }

    async getStudentMembershipStatus(
        classId: string,
        studentAccountId: string,
    ): Promise<string | null> {
        return getStudentMembershipStatus(this.db, classId, studentAccountId);
    }

    async getTeacherClassForLanguage(
        teacherAccountId: string,
        languageCode: string,
    ): Promise<ClassRow | null> {
        return getTeacherClassForLanguage(
            this.db,
            teacherAccountId,
            languageCode,
        );
    }

    async getClassroomState(classId: string): Promise<ClassroomStateRow> {
        return getClassroomState(this.db, classId);
    }

    async getClassroomResourcesForViewer(
        classId: string,
        viewerAccountId: string,
    ): Promise<ClassroomResourceRow> {
        return getClassroomResourcesForViewer(
            this.db,
            classId,
            viewerAccountId,
        );
    }

    async updateClassroomResourcesForTeacher(
        classId: string,
        teacherAccountId: string,
        input: {
            materials?: string;
            homework?: string;
            files?: AttachedFileRef[];
            agendaDocument?: string;
            agendaSnapshots?: AgendaSnapshotRef[];
        },
    ): Promise<ClassroomResourceRow> {
        return updateClassroomResourcesForTeacher(
            this.db,
            classId,
            teacherAccountId,
            input,
        );
    }

    async getOwnNotebook(
        classId: string,
        studentAccountId: string,
    ): Promise<ClassroomNotebookRow> {
        return getOwnNotebook(this.db, classId, studentAccountId);
    }

    async updateOwnNotebook(
        classId: string,
        studentAccountId: string,
        noteText: string,
    ): Promise<ClassroomNotebookRow> {
        return updateOwnNotebook(this.db, classId, studentAccountId, noteText);
    }

    async getNotebookForViewer(
        classId: string,
        ownerStudentAccountId: string,
        viewerAccountId: string,
        areFriends?: (accountA: string, accountB: string) => Promise<boolean>,
    ): Promise<ClassroomNotebookRow> {
        return getNotebookForViewer(
            this.db,
            classId,
            ownerStudentAccountId,
            viewerAccountId,
            areFriends,
        );
    }

    async requestNotebookAccess(
        classId: string,
        ownerStudentAccountId: string,
        viewerStudentAccountId: string,
    ): Promise<ClassroomNotebookAccessRequestRow> {
        return requestNotebookAccess(
            this.db,
            classId,
            ownerStudentAccountId,
            viewerStudentAccountId,
        );
    }

    async listIncomingNotebookAccessRequests(
        classId: string,
        ownerStudentAccountId: string,
    ): Promise<ClassroomNotebookAccessRequestRow[]> {
        return listIncomingNotebookAccessRequests(
            this.db,
            classId,
            ownerStudentAccountId,
        );
    }

    async reviewNotebookAccessRequest(
        classId: string,
        ownerStudentAccountId: string,
        viewerStudentAccountId: string,
        approve: boolean,
    ): Promise<ClassroomNotebookAccessRequestRow> {
        return reviewNotebookAccessRequest(
            this.db,
            classId,
            ownerStudentAccountId,
            viewerStudentAccountId,
            approve,
        );
    }

    async updateClassroomStateForTeacher(
        classId: string,
        teacherAccountId: string,
        options: {
            studentLimit?: number;
            seatAssignments?: Record<string, number>;
            boardFocus?:
                | "agenda"
                | "classroom"
                | "chat"
                | "whiteboard"
                | "notepad";
            activeWhiteboardId?: string | null;
            activeMaterialKey?: string | null;
            viewLayout?: "stacked" | "slideshow";
        },
    ): Promise<ClassroomStateRow> {
        return updateClassroomStateForTeacher(
            this.db,
            classId,
            teacherAccountId,
            options,
        );
    }

    async getEnrolledClasses(studentAccountId: string): Promise<ClassRow[]> {
        return getEnrolledClasses(this.db, studentAccountId);
    }

    async getAvailableClasses(
        languageCode?: string,
        excludeAccountId?: string,
    ): Promise<ClassRow[]> {
        return getAvailableClasses(this.db, languageCode, excludeAccountId);
    }

    async requestJoinClass(
        classId: string,
        studentAccountId: string,
    ): Promise<ClassMembershipRow> {
        return requestJoinClass(this.db, classId, studentAccountId);
    }

    async leaveClass(classId: string, studentAccountId: string): Promise<void> {
        await leaveClass(this.db, classId, studentAccountId);
    }

    async inviteToClass(
        classId: string,
        studentAccountId: string,
        teacherAccountId: string,
    ): Promise<ClassMembershipRow> {
        return inviteToClass(
            this.db,
            classId,
            studentAccountId,
            teacherAccountId,
        );
    }

    async getClassMembers(
        classId: string,
        teacherAccountId: string,
        search?: string,
    ): Promise<ClassMembershipRow[]> {
        return getClassMembers(this.db, classId, teacherAccountId, search);
    }

    async getClassMembersForViewer(
        classId: string,
        viewerAccountId: string,
    ): Promise<ClassMembershipRow[]> {
        return getClassMembersForViewer(this.db, classId, viewerAccountId);
    }

    async removeClassMemberByTeacher(
        classId: string,
        teacherAccountId: string,
        studentAccountId: string,
    ): Promise<void> {
        await removeClassMemberByTeacher(
            this.db,
            classId,
            teacherAccountId,
            studentAccountId,
        );
    }

    async getPendingJoinRequests(
        classId: string,
        teacherAccountId: string,
    ): Promise<ClassMembershipRow[]> {
        return getPendingJoinRequests(this.db, classId, teacherAccountId);
    }

    async reviewJoinRequest(
        classId: string,
        studentAccountId: string,
        teacherAccountId: string,
        approve: boolean,
    ): Promise<void> {
        await reviewJoinRequest(
            this.db,
            classId,
            studentAccountId,
            teacherAccountId,
            approve,
        );
    }

    async getClassesForTeacherWithFilter(
        teacherAccountId: string,
        languageCode?: string,
    ): Promise<(ClassRow & { memberCount: number })[]> {
        return getClassesForTeacherWithFilter(
            this.db,
            teacherAccountId,
            languageCode,
        );
    }

    async getTeacherRequest(
        accountId: string,
        languageCode: string,
    ): Promise<TeacherRequestRow | null> {
        return getTeacherRequest(this.db, accountId, languageCode);
    }

    async listPendingRequests(): Promise<TeacherRequestRow[]> {
        return listPendingRequests(this.db);
    }

    async listTeacherRequestsForAccount(
        accountId: string,
    ): Promise<TeacherRequestRow[]> {
        return listTeacherRequestsForAccount(this.db, accountId);
    }

    async submitTeacherRequest(
        accountId: string,
        languageCode: string,
        className: string,
        studentLimit: number,
        reason: string | null,
        joinMode: ClassRow["joinMode"],
        isListed: boolean,
    ): Promise<TeacherRequestRow> {
        return submitTeacherRequest(
            this.db,
            accountId,
            languageCode,
            className,
            studentLimit,
            reason,
            joinMode,
            isListed,
        );
    }

    async approveTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<ClassRow | null> {
        return approveTeacherRequest(this.db, requestId, reviewerAccountId);
    }

    async rejectTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<void> {
        await rejectTeacherRequest(this.db, requestId, reviewerAccountId);
    }
}
