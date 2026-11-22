/** Public diagnostic port for isolated browser-runtime tests. */
export function createDiagnosticFixture() {
    const entries = [];
    return {
        entries,
        async log(...entry) {
            entries.push(structuredClone(entry));
            return true;
        },
    };
}
