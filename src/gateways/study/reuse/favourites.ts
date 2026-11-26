import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import { SerialOperations } from "./serial-operations.js";

export type StudyFavouriteKind = "library" | "deck" | "flashcard";

export interface StudyFavourite {
    kind: StudyFavouriteKind;
    id: string;
}

const KEY = "study-favourites";

export function validateFavourite(
    input: unknown,
): asserts input is StudyFavourite & { favourite: boolean } {
    const candidate = input as (StudyFavourite & { favourite: boolean }) | null;
    if (
        !candidate ||
        !["library", "deck", "flashcard"].includes(candidate.kind) ||
        typeof candidate.id !== "string" ||
        !candidate.id ||
        candidate.id.length > 200 ||
        typeof candidate.favourite !== "boolean"
    )
        throw new Error("invalid_favourite");
}

/** Account-scoped favourites. Owning adapters independently enforce resource access. */
export class StudyFavourites {
    private readonly operations = new SerialOperations();

    constructor(private readonly preferences: UserPreferenceStore) {}

    async list(accountId: string): Promise<StudyFavourite[]> {
        return JSON.parse((await this.preferences.get(accountId, KEY)) ?? "[]");
    }

    async set(accountId: string, input: unknown): Promise<StudyFavourite[]> {
        validateFavourite(input);
        return this.operations.run(accountId, async () => {
            const items = (await this.list(accountId)).filter(
                (item) => item.kind !== input.kind || item.id !== input.id,
            );
            if (input.favourite) items.push({ kind: input.kind, id: input.id });
            if (items.length > 5000) throw new Error("favourite_limit");
            await this.preferences.set(accountId, KEY, JSON.stringify(items));
            return items;
        });
    }
}
