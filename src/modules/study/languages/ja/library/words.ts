/**
 * Layer 4 — Words.
 * Combinations of characters or alt-characters forming a meaningful unit.
 * Definition IDs are ordered by commonality (primary meaning first).
 */

export interface Word {
    id: string;
    graphemes: string[];
    definitionIds: string[];
    reading?: string;
    jlptLevel?: string;
}

export const WORDS: Word[] = [
    {
        id: "ja:word:nihon",
        graphemes: ["ja:kanji:日", "ja:kanji:本"],
        definitionIds: ["ja:def:nihon"],
        reading: "nihon",
        jlptLevel: "N5",
    },
    {
        id: "ja:word:nihongo",
        graphemes: ["ja:kanji:日", "ja:kanji:本", "ja:kanji:語"],
        definitionIds: ["ja:def:nihongo"],
        reading: "nihongo",
        jlptLevel: "N5",
    },
    {
        id: "ja:word:hito",
        graphemes: ["ja:kanji:人"],
        definitionIds: ["ja:def:hito"],
        reading: "hito",
        jlptLevel: "N5",
    },
    {
        id: "ja:word:yama",
        graphemes: ["ja:kanji:山"],
        definitionIds: ["ja:def:yama"],
        reading: "yama",
        jlptLevel: "N5",
    },
    {
        id: "ja:word:kawa",
        graphemes: ["ja:kanji:川"],
        definitionIds: ["ja:def:kawa"],
        reading: "kawa",
        jlptLevel: "N5",
    },
    {
        id: "ja:word:mizu",
        graphemes: ["ja:kanji:水"],
        definitionIds: ["ja:def:mizu"],
        reading: "mizu",
        jlptLevel: "N5",
    },
];
