/**
 * Layer 5 — Sentences.
 * Ordered sequences of words. If `definitionId` is set, that definition is
 * used for the sentence meaning; otherwise meaning is derived by concatenating
 * the primary definition of each constituent word.
 */

export interface Sentence {
    id: string;
    wordIds: string[];
    definitionId?: string;
}

export const SENTENCES: Sentence[] = [
    {
        id: "ja:sentence:nihongo-ga-suki",
        wordIds: ["ja:word:nihongo"],
    },
];
