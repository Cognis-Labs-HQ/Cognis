import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { DEFAULT_STUDENT_LIMIT } from "./constants.js";
import {
    getAvailableClasses,
    getClassById,
    getClassroomState,
    getClassesForTeacher,
    getClassesForTeacherWithFilter,
    getEnrolledClasses,
    updateClassroomStateForTeacher,
} from "./classes.js";
import { listStudyLanguages, upsertStudyLanguage } from "./languages.js";
import {
    getClassMembers,
    getClassMembersForViewer,
    getPendingJoinRequests,
    inviteToClass,
    leaveClass,
    removeClassMemberByTeacher,
    requestJoinClass,
    reviewJoinRequest,
} from "./memberships.js";
import { getStudyPreferences, saveStudyPreferences } from "./preferences.js";
import { ensureSchema, ensureStudyLanguagesSchema } from "./schema.js";
import {
    approveTeacherRequest,
    getTeacherRequest,
    listPendingRequests,
    rejectTeacherRequest,
    submitTeacherRequest,
} from "./teacher-requests.js";
import type {
    ClassMembershipRow,
    ClassRow,
    ClassroomStateRow,
    StudyLanguageRow,
    StudyPreferencesRow,
    TeacherRequestRow,
} from "./types.js";

class DatabaseClassesStore {
    constructor(private readonly database: DbExecutor) {}

    private static readonly DEFAULT_STUDENT_LIMIT = DEFAULT_STUDENT_LIMIT;

    async ensureSchema(): Promise<void> {
        await ensureSchema(this.database);
    }

    async ensureStudyLanguagesSchema(): Promise<void> {
        await ensureStudyLanguagesSchema(this.database);
    }

    async listStudyLanguages(
        onlyAvailable = false,
    ): Promise<StudyLanguageRow[]> {
        return listStudyLanguages(this.database, onlyAvailable);
    }

    async upsertStudyLanguage(
        row: Partial<StudyLanguageRow> & { code: string },
    ): Promise<StudyLanguageRow> {
        return upsertStudyLanguage(this.database, row);
    }

    async getStudyPreferences(accountId: string): Promise<StudyPreferencesRow> {
        return getStudyPreferences(this.database, accountId);
    }

    async saveStudyPreferences(
        accountId: string,
        learningLanguages: string[],
        teachingLanguages: string[],
    ): Promise<StudyPreferencesRow> {
        return saveStudyPreferences(
            this.database,
            accountId,
            learningLanguages,
            teachingLanguages,
        );
    }

    async getClassesForTeacher(teacherAccountId: string): Promise<ClassRow[]> {
        return getClassesForTeacher(this.database, teacherAccountId);
    }

    async getClassById(classId: string): Promise<ClassRow | null> {
        return getClassById(this.database, classId);
    }

    async getClassroomState(classId: string): Promise<ClassroomStateRow> {
        return getClassroomState(this.database, classId);
    }

    async updateClassroomStateForTeacher(
        classId: string,
        teacherAccountId: string,
        options: {
            studentLimit?: number;
            seatAssignments?: Record<string, number>;
        },
    ): Promise<ClassroomStateRow> {
        return updateClassroomStateForTeacher(
            this.database,
            classId,
            teacherAccountId,
            options,
        );
    }

    async getEnrolledClasses(studentAccountId: string): Promise<ClassRow[]> {
        return getEnrolledClasses(this.database, studentAccountId);
    }

    async getAvailableClasses(
        languageCode?: string,
        excludeAccountId?: string,
    ): Promise<ClassRow[]> {
        return getAvailableClasses(
            this.database,
            languageCode,
            excludeAccountId,
        );
    }

    async requestJoinClass(
        classId: string,
        studentAccountId: string,
    ): Promise<ClassMembershipRow> {
        return requestJoinClass(this.database, classId, studentAccountId);
    }

    async leaveClass(classId: string, studentAccountId: string): Promise<void> {
        await leaveClass(this.database, classId, studentAccountId);
    }

    async inviteToClass(
        classId: string,
        studentAccountId: string,
        teacherAccountId: string,
    ): Promise<ClassMembershipRow> {
        return inviteToClass(
            this.database,
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
        return getClassMembers(
            this.database,
            classId,
            teacherAccountId,
            search,
        );
    }

    async getClassMembersForViewer(
        classId: string,
        viewerAccountId: string,
    ): Promise<ClassMembershipRow[]> {
        return getClassMembersForViewer(
            this.database,
            classId,
            viewerAccountId,
        );
    }

    async removeClassMemberByTeacher(
        classId: string,
        teacherAccountId: string,
        studentAccountId: string,
    ): Promise<void> {
        await removeClassMemberByTeacher(
            this.database,
            classId,
            teacherAccountId,
            studentAccountId,
        );
    }

    async getPendingJoinRequests(
        classId: string,
        teacherAccountId: string,
    ): Promise<ClassMembershipRow[]> {
        return getPendingJoinRequests(this.database, classId, teacherAccountId);
    }

    async reviewJoinRequest(
        classId: string,
        studentAccountId: string,
        teacherAccountId: string,
        approve: boolean,
    ): Promise<void> {
        await reviewJoinRequest(
            this.database,
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
            this.database,
            teacherAccountId,
            languageCode,
        );
    }

    async getTeacherRequest(
        accountId: string,
        languageCode: string,
    ): Promise<TeacherRequestRow | null> {
        return getTeacherRequest(this.database, accountId, languageCode);
    }

    async listPendingRequests(): Promise<TeacherRequestRow[]> {
        return listPendingRequests(this.database);
    }

    async submitTeacherRequest(
        accountId: string,
        languageCode: string,
        reason: string | null,
    ): Promise<TeacherRequestRow> {
        return submitTeacherRequest(
            this.database,
            accountId,
            languageCode,
            reason,
        );
    }

    async approveTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<ClassRow | null> {
        return approveTeacherRequest(
            this.database,
            requestId,
            reviewerAccountId,
        );
    }

    async rejectTeacherRequest(
        requestId: string,
        reviewerAccountId: string,
    ): Promise<void> {
        await rejectTeacherRequest(this.database, requestId, reviewerAccountId);
    }
}
export { DatabaseClassesStore as DbClassesStore };
