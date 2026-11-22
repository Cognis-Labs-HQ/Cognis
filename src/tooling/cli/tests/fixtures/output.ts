/** Capture the CLI's real stdout contract without intercepting an application logger. */
export function captureTerminalOutput(run: () => void): string {
    const originalWrite = process.stdout.write;
    const chunks: string[] = [];
    try {
        process.stdout.write = (chunk: Uint8Array | string) => {
            chunks.push(String(chunk));
            return true;
        };
        run();
    } finally {
        process.stdout.write = originalWrite;
    }
    return chunks.join("").trimEnd();
}
