import { studyAttempt, type StudyAttempt } from "../reuse/attempt.js";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import { SerialOperations } from "../reuse/serial-operations.js";

export const DRAWING_PROGRESS_FLOWS = [
    {
        id: "study:drawing:readProgress",
        stages: ["authorize", "validate", "read"],
    },
    {
        id: "study:drawing:complete",
        stages: ["authorize", "validate", "persist"],
    },
];

export interface DrawingProgress {
    completed: boolean;
    hiddenStrokeCount: number;
}

export interface DrawingCompletion {
    attempt?: StudyAttempt;
    result?: "correct" | "incorrect";
    assisted?: boolean;
    strokeCount: number;
    mistakes: number;
}

export function validateDrawingCardId(cardId: string): void {
    if (!/^[a-zA-Z0-9:_-]{1,200}$/.test(cardId))
        throw new Error("invalid_drawing_card");
}

export function validateDrawingCompletion(
    input: unknown,
): asserts input is DrawingCompletion {
    const value = input as DrawingCompletion | null;
    if (value?.attempt !== undefined) studyAttempt(value.attempt);
    if (
        !value ||
        (value.result !== undefined &&
            !["correct", "incorrect"].includes(value.result)) ||
        (value.assisted !== undefined && typeof value.assisted !== "boolean") ||
        !Number.isSafeInteger(value.strokeCount) ||
        value.strokeCount < 1 ||
        value.strokeCount > 10000 ||
        !Number.isSafeInteger(value.mistakes) ||
        value.mistakes < 0 ||
        value.mistakes > 100000
    )
        throw new Error("invalid_drawing_completion");
}

function parseDrawingProgress(stored: string | null): DrawingProgress {
    if (stored === null) return { completed: false, hiddenStrokeCount: 0 };
    const value = JSON.parse(stored) as DrawingProgress;
    if (
        typeof value.completed !== "boolean" ||
        !Number.isSafeInteger(value.hiddenStrokeCount) ||
        value.hiddenStrokeCount < 0 ||
        value.hiddenStrokeCount > 10000
    )
        throw new Error("invalid_drawing_progress");
    return {
        completed: value.completed,
        hiddenStrokeCount: value.hiddenStrokeCount,
    };
}

/** Persist completion and a hiding count per account/card, never sampled positions. */
export class DrawingProgressStore {
    private readonly operations = new SerialOperations();

    constructor(private readonly preferences: UserPreferenceStore) {}

    async get(accountId: string, cardId: string): Promise<DrawingProgress> {
        validateDrawingCardId(cardId);
        const stored = await this.preferences.get(
            accountId,
            `study-drawing:${cardId}`,
        );
        return parseDrawingProgress(stored);
    }

    async complete(
        accountId: string,
        cardId: string,
        input: unknown,
    ): Promise<DrawingProgress> {
        validateDrawingCardId(cardId);
        validateDrawingCompletion(input);
        return this.operations.run(
            JSON.stringify([accountId, cardId]),
            async () => {
                const stored = await this.preferences.get(
                    accountId,
                    `study-drawing:${cardId}`,
                );
                const previous = parseDrawingProgress(stored);
                const attempts: string[] = stored
                    ? (JSON.parse(stored).attemptIds ?? [])
                    : [];
                if (input.attempt && attempts.includes(input.attempt.id))
                    return previous;
                const progress = {
                    completed:
                        previous.completed || input.result !== "incorrect",
                    hiddenStrokeCount: Math.min(
                        input.strokeCount,
                        previous.hiddenStrokeCount +
                            (input.result !== "incorrect" &&
                            !input.assisted &&
                            input.mistakes <= 1
                                ? 1
                                : 0),
                    ),
                };
                await this.preferences.set(
                    accountId,
                    `study-drawing:${cardId}`,
                    JSON.stringify({
                        ...progress,
                        ...(input.attempt || attempts.length
                            ? {
                                  attemptIds: input.attempt
                                      ? [...attempts, input.attempt.id]
                                      : attempts,
                              }
                            : {}),
                    }),
                );
                return progress;
            },
        );
    }
}
