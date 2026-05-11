/**
 * Layer 3 — Definitions.
 * Language-scoped meaning records. Each definition is a short phrase in the
 * learner's UI language. Definitions are referenced by words and sentences.
 */

export interface Definition {
    id: string;
    text: string;
    language: string;
}

export const DEFINITIONS: Definition[] = [
    { id: "ja:def:nihon", text: "Japan", language: "en" },
    { id: "ja:def:nihongo", text: "the Japanese language", language: "en" },
    { id: "ja:def:hito", text: "a person, someone", language: "en" },
    { id: "ja:def:yama", text: "a mountain", language: "en" },
    { id: "ja:def:kawa", text: "a river", language: "en" },
    { id: "ja:def:mizu", text: "water", language: "en" },
    { id: "ja:def:hi-fire", text: "fire", language: "en" },
    { id: "ja:def:hi-day", text: "day, the sun", language: "en" },
    { id: "ja:def:hon", text: "a book", language: "en" },
];
