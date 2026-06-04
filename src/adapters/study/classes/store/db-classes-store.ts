import type { DbExecutor } from '../../../../gateways/db/reuse/db-executor.js';
import { DEFAULT_STUDENT_LIMIT } from './constants.js';
import {
  getAvailableClasses,
  getClassById,
  getClassroomState,
  getClassesForTeacher,
  getClassesForTeacherWithFilter,
  getEnrolledClasses,
  updateClassroomStateForTeacher,
} from './classes.js';
import { listStudyLanguages, upsertStudyLanguage } from './languages.js';
import {
  getClassMembers,
  getClassMembersForViewer,
  getPendingJoinRequests,
  inviteToClass,
  leaveClass,
  removeClassMemberByTeacher,
  requestJoinClass,
  reviewJoinRequest,
} from './memberships.js';
import {
  getStudyPreferences,
  saveStudyPreferences,
} from './preferences.js';
import { ensureSchema, ensureStudyLanguagesSchema } from './schema.js';
import {
  approveTeacherRequest,
  getTeacherRequest,
  listPendingRequests,
  rejectTeacherRequest,
  submitTeacherRequest,
} from './teacher-requests.js';
import type {
  ClassMembershipRow,
  ClassRow,
  ClassroomStateRow,
  StudyLanguageRow,
  StudyPreferencesRow,
  TeacherRequestRow,
} from './types.js';

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

  async getStudyPreferences(
    accountId: string,
  ): Promise<StudyPreferencesRow> {
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

  async getClassesForTeacher(
    teacherAccountId: string,
  ): Promise<ClassRow[]> {
    return getClassesForTeacher(this.db, teacherAccountId);
  }

  async getClassById(classId: string): Promise<ClassRow | null> {
    return getClassById(this.db, classId);
  }

  async getClassroomState(classId: string): Promise<ClassroomStateRow> {
    return getClassroomState(this.db, classId);
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
      this.db,
      classId,
      teacherAccountId,
      options,
    );
  }

  async getEnrolledClasses(
    studentAccountId: string,
  ): Promise<ClassRow[]> {
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

  async leaveClass(
    classId: string,
    studentAccountId: string,
  ): Promise<void> {
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

  async submitTeacherRequest(
    accountId: string,
    languageCode: string,
    reason: string | null,
  ): Promise<TeacherRequestRow> {
    return submitTeacherRequest(this.db, accountId, languageCode, reason);
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
