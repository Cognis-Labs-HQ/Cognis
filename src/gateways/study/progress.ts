import { createHash, randomUUID } from "node:crypto";
import type {
    ProgressCapability,
    ProgressActor,
} from "../../adapters/study/progress/index.js";

export interface StudyResult {
    accountId: string;
    entryId: string;
    activity: "drawing" | "flashcards";
    correct: boolean;
    assisted?: boolean;
    mistakes?: number;
    deckId?: string;
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
          }
        : await library.read(reader, result.entryId);
    if (!entry) throw new Error("not_found");
    const progress = ports.require<ProgressCapability>("study:progress");
    await progress.recordEvent(actor, {
        id: randomUUID(),
        occurredAt: new Date().toISOString(),
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
        context: {},
        attempt: 1,
        correct: result.correct,
        independentCorrect: result.correct && !result.assisted,
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
