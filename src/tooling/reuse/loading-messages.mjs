/** Extract the eager loading copy from the authoritative English XML catalog. */
export function loadingMessagesFromXml(xml) {
    const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    return Object.fromEntries(
        [1, 2, 3, 4].map((index) => {
            const key = `ui.reuse.loading_joke_${index}`;
            const value = xml
                .match(
                    new RegExp(
                        `<string name="${key.replaceAll(".", "\\.")}">([^<]*)</string>`,
                    ),
                )?.[1]
                ?.replace(
                    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
                    (_, entity) =>
                        entity.startsWith("#")
                            ? String.fromCodePoint(
                                  parseInt(
                                      entity.slice(
                                          entity[1].toLowerCase() === "x"
                                              ? 2
                                              : 1,
                                      ),
                                      entity[1].toLowerCase() === "x" ? 16 : 10,
                                  ),
                              )
                            : entities[entity],
                );
            if (!value?.trim()) throw new Error(`Missing translation: ${key}`);
            return [key, value];
        }),
    );
}
