import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { parseLanguageList } from "./rows.js";
import type { StudyPreferencesRow } from "./types.js";

export async function getStudyPreferences(
    db: DbExecutor,
    accountId: string,
): Promise<StudyPreferencesRow> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "study_user_preferences",
        columns: [
            "account_id",
            "learning_languages",
            "teaching_languages",
            "updated_at",
        ],
        where: [{ column: "account_id", value: accountId }],
    });
    const row = result.rows?.[0];
    if (!row) {
        return {
            accountId,
            learningLanguages: [],
            teachingLanguages: [],
            updatedAt: new Date().toISOString(),
        };
    }
    return {
        accountId: String(row.account_id),
        learningLanguages: parseLanguageList(row.learning_languages),
        teachingLanguages: parseLanguageList(row.teaching_languages),
        updatedAt: String(row.updated_at),
    };
}

export async function saveStudyPreferences(
    db: DbExecutor,
    accountId: string,
    learningLanguages: string[],
    teachingLanguages: string[],
): Promise<StudyPreferencesRow> {
    const learningJson = JSON.stringify(learningLanguages);
    const teachingJson = JSON.stringify(teachingLanguages);
    await db.executeCommand({
        option: "INSERT",
        table: "study_user_preferences",
        values: {
            account_id: accountId,
            learning_languages: learningJson,
            teaching_languages: teachingJson,
            updated_at: new Date().toISOString(),
        },
        conflict: {
            action: "update",
            target: ["account_id"],
        },
    });
    return getStudyPreferences(db, accountId);
}
