/** Compare answer content without penalizing presentation-only differences. */
export function readingAnswerKey(value) {
    return String(value ?? "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[‘’ʼ]/gu, "'")
        .replace(/[‐‑]/gu, "-")
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/(?:[.!?。…]\s*)+$/u, "")
        .trim();
}

export function isCorrectReadingChoice(selected, choices) {
    const key = readingAnswerKey(selected?.text);
    return (
        Boolean(key) &&
        choices.some(
            (choice) => choice.correct && readingAnswerKey(choice.text) === key,
        )
    );
}
