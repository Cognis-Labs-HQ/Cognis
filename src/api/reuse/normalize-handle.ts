export function normalizeHandleKey(handle: string | null | undefined): string {
    return String(handle ?? "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}

export function normalizeHandleKeys(values: unknown[]): string[] {
    return Array.from(
        new Set(
            (Array.isArray(values) ? values : [])
                .map((value) => normalizeHandleKey(String(value ?? "")))
                .filter(Boolean),
        ),
    ).sort();
}
