export function atomicWritingUnitCarouselLayers(schema, layer) {
    return new Set(
        (layer?.relationships ?? [])
            .filter(
                ({ targetLayer }) =>
                    schema?.layers?.find(({ id }) => id === targetLayer)
                        ?.semanticRole === "atomicWritingUnit",
            )
            .map(({ targetLayer }) => targetLayer),
    );
}
