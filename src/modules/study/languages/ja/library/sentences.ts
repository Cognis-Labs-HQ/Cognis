/**
 * Layer 5 — Sentences.
 *
 * Data source:
 *   src/modules/study/languages/ja/data/sentences/*.json
 */

export interface Sentence {
    id: string;
    wordIds: string[];
    definitionId?: string;
}
