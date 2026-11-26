export function flashcardsRoute(path) {
    const match = /^\/study\/([^/]+)\/flashcards(?:\/([^/]+))?$/.exec(path);
    return match
        ? {
              language: decodeURIComponent(match[1]),
              deckId: match[2] ? decodeURIComponent(match[2]) : undefined,
          }
        : {};
}

export function deckLanguages(deck) {
    if (deck.language) return [deck.language];
    return [
        ...new Set(
            (deck.schemas ?? [])
                .map((schema) => schema.language)
                .filter(Boolean),
        ),
    ];
}

export function deckMatchesLanguage(deck, language) {
    return deckLanguages(deck).includes(language);
}

function deckNameSlug(deck) {
    return (
        (deck.names?.en ?? deck.name)
            .normalize("NFKC")
            .toLocaleLowerCase("en")
            .replace(/[^\p{L}\p{N}]+/gu, "-")
            .replace(/^-|-$/g, "") || "deck"
    );
}

export function deckRouteKey(deck) {
    return `${deckNameSlug(deck)}--${deck.id}`;
}
