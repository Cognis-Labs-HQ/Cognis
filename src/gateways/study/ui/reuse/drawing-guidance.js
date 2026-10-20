/**
 * Samples distinct hidden strokes anew for a drawing attempt.
 * Exports sampleHiddenStrokes(strokeCount, hiddenCount, random) returning a Set of indices.
 * Example: const hidden = sampleHiddenStrokes(6, progress.hiddenStrokeCount);
 * @param {number} strokeCount Total pattern strokes.
 * @param {number} hiddenCount Stored number of strokes to hide.
 * @param {(values: Uint32Array) => Uint32Array} random Cryptographic random source.
 * @returns {Set<number>} Randomly chosen distinct positions, capped to the current pattern.
 */
export function sampleHiddenStrokes(
    strokeCount,
    hiddenCount,
    random = (values) => globalThis.crypto.getRandomValues(values),
) {
    const available = Array.from({ length: strokeCount }, (_, index) => index);
    const hidden = new Set();
    const count = Math.min(strokeCount, hiddenCount);
    for (let index = 0; index < count; index += 1) {
        const value = random(new Uint32Array(1))[0];
        const selected = index + (value % (available.length - index));
        [available[index], available[selected]] = [
            available[selected],
            available[index],
        ];
        hidden.add(available[index]);
    }
    return hidden;
}
