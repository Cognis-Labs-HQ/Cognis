/**
 * Layer 1 — Characters.
 *
 * Character data is loaded from JSON files in:
 *   src/modules/study/languages/ja/data/characters/*.json
 *
 * This module only defines the TypeScript shape used by the library store.
 */

export interface Character {
    id: string;
    symbol: string;
    romanization: string;
    characterClass: string;
}

export interface CharacterClass {
    id: string;
    characterIds: string[];
}
