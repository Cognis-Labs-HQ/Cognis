export function atomicWritingUnitCarouselLayers(schema) {
    return new Set(
        (schema?.layers ?? [])
            .filter(({ semanticRole }) => semanticRole === "atomicWritingUnit")
            .map(({ id }) => id),
    );
}
