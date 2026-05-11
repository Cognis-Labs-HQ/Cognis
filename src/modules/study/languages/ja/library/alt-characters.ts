/**
 * Layer 2 — Alternate Characters (optional).
 *
 * Data source:
 *   src/modules/study/languages/ja/data/alt-characters/*.json
 */

export interface AltCharacter {
    id: string;
    symbol: string;
    components: string[];
    readings: string[];
    meaning?: string;
}
