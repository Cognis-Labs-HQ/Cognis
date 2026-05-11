/**
 * Layer 4 — Words.
 *
 * Data source:
 *   src/modules/study/languages/ja/data/words/*.json
 */

export interface Word {
    id: string;
    graphemes: string[];
    definitionIds: string[];
    reading?: string;
    jlptLevel?: string;
}
