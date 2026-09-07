/**
 * Resolves responsive page-composer grid dimensions.
 *
 * Public exports:
 * - `resolveGridColumnCount` — determines columns from the first measurable container.
 * - `resolveElementGridSize` — normalizes an element's default, minimum, and maximum dimensions.
 *
 * @example
 * const columns = resolveGridColumnCount({ contentGrid, root, unit: 90 });
 * const size = resolveElementGridSize({ gridSize: { max: "half" } });
 */

/**
 * Resolves a stable column count by trying progressively broader containers.
 * This prevents transient zero-width reads during initialization from choosing
 * a narrow layout profile.
 *
 * @param {{contentGrid?: HTMLElement | null, root: HTMLElement, unit: number}} options - Grid sizing inputs.
 * @returns {number} The positive number of available grid columns.
 */
export function resolveGridColumnCount({ contentGrid, root, unit }) {
    if (contentGrid) contentGrid.style.width = "";
    const widthCandidates = [
        contentGrid?.getBoundingClientRect().width ?? 0,
        contentGrid?.parentElement?.getBoundingClientRect().width ?? 0,
        root.querySelector(".main-window")?.getBoundingClientRect().width ?? 0,
        root.querySelector(".workspace")?.getBoundingClientRect().width ?? 0,
        window.innerWidth,
    ];
    const resolvedWidth = widthCandidates.find(
        (width) => Number.isFinite(width) && width > 0,
    );
    return Math.max(1, Math.floor((resolvedWidth ?? unit) / unit));
}

/**
 * Normalizes one element's grid sizing declaration.
 *
 * @param {{gridSize?: {default?: [number, number], min?: [number, number], max?: unknown}}} element - Composer element sizing declaration.
 * @returns {{default: [number, number], min: [number, number], max: unknown, fullWidth: boolean, fillWidth: boolean, halfWidth: boolean, halfHeight: boolean, fillHeight: boolean}} Normalized sizing flags and dimensions.
 */
export function resolveElementGridSize(element) {
    const maxValue = element.gridSize?.max;
    const defaults = element.gridSize?.default ?? [4, 3];
    const minimum = element.gridSize?.min ?? [2, 2];
    if (["full", "fill", "half"].includes(maxValue)) {
        return {
            default: defaults,
            min: minimum,
            max: null,
            fullWidth: maxValue === "full",
            fillWidth: maxValue === "fill",
            halfWidth: maxValue === "half",
            halfHeight: false,
            fillHeight: false,
        };
    }

    let resolvedMax = maxValue ?? null;
    let halfWidth = false;
    let halfHeight = false;
    let fillWidth = false;
    let fillHeight = false;
    if (Array.isArray(maxValue)) {
        halfWidth = maxValue[0] === "half";
        fillWidth = maxValue[0] === "fill";
        halfHeight = maxValue[1] === "half";
        fillHeight = maxValue[1] === "fill";
        const width = halfWidth || fillWidth ? null : (maxValue[0] ?? null);
        const height = halfHeight || fillHeight ? null : (maxValue[1] ?? null);
        resolvedMax =
            width === null && height === null ? null : [width, height];
    }
    return {
        default: defaults,
        min: minimum,
        max: resolvedMax,
        fullWidth: false,
        fillWidth,
        halfWidth,
        halfHeight,
        fillHeight,
    };
}
