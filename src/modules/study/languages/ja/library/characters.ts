/**
 * Layer 1 — Characters.
 * The atomic writing units of Japanese: hiragana and katakana.
 * Kanji (compound logographic symbols) belong in alt-characters.ts.
 */

export interface Character {
    id: string;
    symbol: string;
    romanization: string;
    category: "hiragana" | "katakana";
}

export const HIRAGANA: Character[] = [
    { id: "ja:char:a", symbol: "あ", romanization: "a", category: "hiragana" },
    { id: "ja:char:i", symbol: "い", romanization: "i", category: "hiragana" },
    { id: "ja:char:u", symbol: "う", romanization: "u", category: "hiragana" },
    { id: "ja:char:e", symbol: "え", romanization: "e", category: "hiragana" },
    { id: "ja:char:o", symbol: "お", romanization: "o", category: "hiragana" },
    {
        id: "ja:char:ka",
        symbol: "か",
        romanization: "ka",
        category: "hiragana",
    },
    {
        id: "ja:char:ki",
        symbol: "き",
        romanization: "ki",
        category: "hiragana",
    },
    {
        id: "ja:char:ku",
        symbol: "く",
        romanization: "ku",
        category: "hiragana",
    },
    {
        id: "ja:char:ke",
        symbol: "け",
        romanization: "ke",
        category: "hiragana",
    },
    {
        id: "ja:char:ko",
        symbol: "こ",
        romanization: "ko",
        category: "hiragana",
    },
    {
        id: "ja:char:sa",
        symbol: "さ",
        romanization: "sa",
        category: "hiragana",
    },
    {
        id: "ja:char:shi",
        symbol: "し",
        romanization: "shi",
        category: "hiragana",
    },
    {
        id: "ja:char:su",
        symbol: "す",
        romanization: "su",
        category: "hiragana",
    },
    {
        id: "ja:char:se",
        symbol: "せ",
        romanization: "se",
        category: "hiragana",
    },
    {
        id: "ja:char:so",
        symbol: "そ",
        romanization: "so",
        category: "hiragana",
    },
    {
        id: "ja:char:ta",
        symbol: "た",
        romanization: "ta",
        category: "hiragana",
    },
    {
        id: "ja:char:chi",
        symbol: "ち",
        romanization: "chi",
        category: "hiragana",
    },
    {
        id: "ja:char:tsu",
        symbol: "つ",
        romanization: "tsu",
        category: "hiragana",
    },
    {
        id: "ja:char:te",
        symbol: "て",
        romanization: "te",
        category: "hiragana",
    },
    {
        id: "ja:char:to",
        symbol: "と",
        romanization: "to",
        category: "hiragana",
    },
    {
        id: "ja:char:na",
        symbol: "な",
        romanization: "na",
        category: "hiragana",
    },
    {
        id: "ja:char:ni",
        symbol: "に",
        romanization: "ni",
        category: "hiragana",
    },
    {
        id: "ja:char:nu",
        symbol: "ぬ",
        romanization: "nu",
        category: "hiragana",
    },
    {
        id: "ja:char:ne",
        symbol: "ね",
        romanization: "ne",
        category: "hiragana",
    },
    {
        id: "ja:char:no",
        symbol: "の",
        romanization: "no",
        category: "hiragana",
    },
    {
        id: "ja:char:ha",
        symbol: "は",
        romanization: "ha",
        category: "hiragana",
    },
    {
        id: "ja:char:hi",
        symbol: "ひ",
        romanization: "hi",
        category: "hiragana",
    },
    {
        id: "ja:char:fu",
        symbol: "ふ",
        romanization: "fu",
        category: "hiragana",
    },
    {
        id: "ja:char:he",
        symbol: "へ",
        romanization: "he",
        category: "hiragana",
    },
    {
        id: "ja:char:ho",
        symbol: "ほ",
        romanization: "ho",
        category: "hiragana",
    },
    {
        id: "ja:char:ma",
        symbol: "ま",
        romanization: "ma",
        category: "hiragana",
    },
    {
        id: "ja:char:mi",
        symbol: "み",
        romanization: "mi",
        category: "hiragana",
    },
    {
        id: "ja:char:mu",
        symbol: "む",
        romanization: "mu",
        category: "hiragana",
    },
    {
        id: "ja:char:me",
        symbol: "め",
        romanization: "me",
        category: "hiragana",
    },
    {
        id: "ja:char:mo",
        symbol: "も",
        romanization: "mo",
        category: "hiragana",
    },
    {
        id: "ja:char:ya",
        symbol: "や",
        romanization: "ya",
        category: "hiragana",
    },
    {
        id: "ja:char:yu",
        symbol: "ゆ",
        romanization: "yu",
        category: "hiragana",
    },
    {
        id: "ja:char:yo",
        symbol: "よ",
        romanization: "yo",
        category: "hiragana",
    },
    {
        id: "ja:char:ra",
        symbol: "ら",
        romanization: "ra",
        category: "hiragana",
    },
    {
        id: "ja:char:ri",
        symbol: "り",
        romanization: "ri",
        category: "hiragana",
    },
    {
        id: "ja:char:ru",
        symbol: "る",
        romanization: "ru",
        category: "hiragana",
    },
    {
        id: "ja:char:re",
        symbol: "れ",
        romanization: "re",
        category: "hiragana",
    },
    {
        id: "ja:char:ro",
        symbol: "ろ",
        romanization: "ro",
        category: "hiragana",
    },
    {
        id: "ja:char:wa",
        symbol: "わ",
        romanization: "wa",
        category: "hiragana",
    },
    {
        id: "ja:char:wi",
        symbol: "ゐ",
        romanization: "wi",
        category: "hiragana",
    },
    {
        id: "ja:char:we",
        symbol: "ゑ",
        romanization: "we",
        category: "hiragana",
    },
    {
        id: "ja:char:wo",
        symbol: "を",
        romanization: "wo",
        category: "hiragana",
    },
    { id: "ja:char:n", symbol: "ん", romanization: "n", category: "hiragana" },
];

export const KATAKANA: Character[] = [
    {
        id: "ja:char:ka:A",
        symbol: "ア",
        romanization: "a",
        category: "katakana",
    },
    {
        id: "ja:char:ka:I",
        symbol: "イ",
        romanization: "i",
        category: "katakana",
    },
    {
        id: "ja:char:ka:U",
        symbol: "ウ",
        romanization: "u",
        category: "katakana",
    },
    {
        id: "ja:char:ka:E",
        symbol: "エ",
        romanization: "e",
        category: "katakana",
    },
    {
        id: "ja:char:ka:O",
        symbol: "オ",
        romanization: "o",
        category: "katakana",
    },
];

export const ALL_CHARACTERS: Character[] = [...HIRAGANA, ...KATAKANA];
