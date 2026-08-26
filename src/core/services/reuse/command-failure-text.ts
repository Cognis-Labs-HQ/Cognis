export function commandFailureText(error: unknown): string {
    if (!(error instanceof Error)) return String(error);
    const commandError = error as Error & {
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        killed?: boolean;
    };
    return [
        commandError.message,
        commandError.stdout,
        commandError.stderr,
        commandError.killed ? "operation timed out" : undefined,
    ]
        .filter(Boolean)
        .map(String)
        .join("\n");
}
