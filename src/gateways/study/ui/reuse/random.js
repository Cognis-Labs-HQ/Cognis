/** Sample a uniform index below size using masked rejection of cryptographic bytes. */
export function randomIndex(
    size,
    random = (values) => globalThis.crypto.getRandomValues(values),
) {
    if (!Number.isSafeInteger(size) || size < 1 || size > 2 ** 32)
        throw new RangeError("invalid_random_range");
    if (size === 1) return 0;
    const mask = 2 ** Math.ceil(Math.log2(size)) - 1;
    const values = new Uint32Array(1);
    while (true) {
        const candidate = (random(values)[0] & mask) >>> 0;
        if (candidate < size) return candidate;
    }
}
