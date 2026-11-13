import type { StudyClassAccessCapability } from "./gateway.js";
import { createHash, randomUUID } from "node:crypto";
import type { ProgressCapability, ProgressActor } from "./reuse/progress.js";

export interface StudyResult {
    accountId: string;
    entryId: string;
    activity: "drawing" | "flashcards";
    correct: boolean;
    assisted?: boolean;
    mistakes?: number;
    deckId?: string;
    eventId?: string;
    occurredAt?: string;
    readerAccountId?: string;
    importedNote?: { id: string; language: string; revision: string };
}

interface ProgressPorts {
    require<T>(id: string): T;
}

/** Resolve canonical Library identity and send activity results to Progress via ctx. */
export async function recordStudyResult(
    ports: ProgressPorts,
    actor: ProgressActor,
    result: StudyResult,
): Promise<void> {
    if (
        actor.accountId.startsWith("share:") ||
        actor.accountId !== result.accountId
    )
        throw new Error("forbidden");
    const library = ports.require<{
        read(
            actor: ProgressActor,
            id: string,
        ): Promise<{
            id: string;
            schemaId: string;
            layer: string;
            language: string;
            updatedAt?: string;
            fields?: unknown;
            scope?: string;
            scopeId?: string;
        } | null>;
    }>("study:library");
    const reader =
        result.readerAccountId && result.readerAccountId !== actor.accountId
            ? { accountId: result.readerAccountId, role: "user" as const }
            : actor;
    const entry = result.importedNote
        ? {
              id: result.importedNote.id,
              schemaId: "study-flashcards",
              layer: "imported-notes",
              language: result.importedNote.language,
              scope: "user",
              scopeId: actor.accountId,
          }
        : await library.read(reader, result.entryId);
    if (!entry) throw new Error("not_found");
    const classroomId =
        entry.scope === "class" &&
        entry.scopeId &&
        (await ports
            .require<StudyClassAccessCapability>("study:classes:access")
            .canRead(entry.scopeId, actor.accountId, actor.role))
            ? entry.scopeId
            : undefined;
    const progress = ports.require<ProgressCapability>("study:progress");
    await progress.recordPractice(actor, {
        id: result.eventId ?? randomUUID(),
        occurredAt: result.occurredAt ?? new Date().toISOString(),
        content: {
            schema: entry.schemaId,
            layer: entry.layer,
            language: entry.language,
            contentId: entry.id,
        },
        contentRevision:
            result.importedNote?.revision ??
            createHash("sha256")
                .update(
                    JSON.stringify({
                        updatedAt: entry.updatedAt,
                        fields: entry.fields,
                    }),
                )
                .digest("hex"),
        activity: result.activity,
        context: classroomId ? { classroomId } : {},
        attempt: 1,
        correct: result.correct,
        independentCorrect:
            result.correct && !result.assisted && !result.mistakes,
        hints: result.assisted ? 1 : 0,
        durationMs: 0,
        completion: "completed",
        metadata: {
            ...(result.deckId ? { deckId: result.deckId } : {}),
            ...(result.mistakes !== undefined
                ? { mistakes: result.mistakes }
                : {}),
        },
    });
}
