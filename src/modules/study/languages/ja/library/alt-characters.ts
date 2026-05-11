/**
 * Layer 2 — Alternate Characters (optional).
 * Compound logographic symbols in Japanese: Kanji.
 * Each Kanji maps to one or more base character readings and carries its own
 * phonetic readings. The `components` array references IDs from characters.ts
 * or other alt-characters for compound Kanji.
 */

export interface AltCharacter {
    id: string;
    symbol: string;
    components: string[];
    readings: string[];
    meaning?: string;
}

export const KANJI: AltCharacter[] = [
    {
        id: "ja:kanji:日",
        symbol: "日",
        components: [],
        readings: ["nichi", "jitsu", "hi", "ka"],
        meaning: "sun, day",
    },
    {
        id: "ja:kanji:本",
        symbol: "本",
        components: [],
        readings: ["hon", "moto"],
        meaning: "book, origin",
    },
    {
        id: "ja:kanji:語",
        symbol: "語",
        components: [],
        readings: ["go", "kata"],
        meaning: "language, word",
    },
    {
        id: "ja:kanji:人",
        symbol: "人",
        components: [],
        readings: ["jin", "nin", "hito"],
        meaning: "person",
    },
    {
        id: "ja:kanji:山",
        symbol: "山",
        components: [],
        readings: ["san", "yama"],
        meaning: "mountain",
    },
    {
        id: "ja:kanji:川",
        symbol: "川",
        components: [],
        readings: ["sen", "kawa"],
        meaning: "river",
    },
    {
        id: "ja:kanji:水",
        symbol: "水",
        components: [],
        readings: ["sui", "mizu"],
        meaning: "water",
    },
    {
        id: "ja:kanji:火",
        symbol: "火",
        components: [],
        readings: ["ka", "hi"],
        meaning: "fire",
    },
];
