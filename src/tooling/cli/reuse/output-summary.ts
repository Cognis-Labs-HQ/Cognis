/** Bounded human output for built-in and contributed commands; full payloads require verbose mode. */
export function conciseText(value: unknown, maximum = 140): string {
    const text = String(value ?? "—").replace(/[\x00-\x1f\x7f]/g, " ");
    return text.length > maximum ? text.slice(0, maximum - 1) + "…" : text;
}

function label(key: string): string {
    return key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/^./, (first) => first.toUpperCase());
}

export function summarizeOutput(
    value: unknown,
    table?: (rows: Array<Record<string, unknown>>) => string,
): string {
    let abbreviated = false;
    const summarize = (entry: unknown, depth: number): string => {
        if (entry === undefined || entry === null) return "None";
        if (entry === "") return "Completed (empty response).";
        if (typeof entry !== "object") {
            if (typeof entry === "boolean") return entry ? "Yes" : "No";
            const text = conciseText(entry);
            abbreviated ||= text !== String(entry);
            return text;
        }
        if (Array.isArray(entry)) {
            if (!entry.length) return "No entries found.";
            const shown = entry.slice(0, 20);
            abbreviated ||= entry.length > shown.length;
            return (
                shown
                    .map((item) =>
                        typeof item === "object" && item !== null
                            ? summarize(item, depth + 1).replace(/\n/g, "; ")
                            : summarize(item, depth + 1),
                    )
                    .join("\n") +
                (entry.length > shown.length
                    ? `\n… ${entry.length - shown.length} more entries.`
                    : "")
            );
        }
        const record = entry as Record<string, unknown>;
        const fields = Object.entries(record).filter(
            ([, field]) => field !== undefined,
        );
        if (!fields.length) return "Completed (no fields returned).";
        if (depth > 1) {
            abbreviated = true;
            const identity = fields.filter(
                ([key, field]) =>
                    [
                        "id",
                        "name",
                        "title",
                        "username",
                        "key",
                        "status",
                        "version",
                        "message",
                        "code",
                    ].includes(key) && typeof field !== "object",
            );
            return identity.length
                ? identity
                      .map(
                          ([key, field]) =>
                              `${label(key)}: ${conciseText(field)}`,
                      )
                      .join("; ")
                : `${fields.length} fields`;
        }
        const shown = fields.slice(0, 12);
        abbreviated ||= fields.length > shown.length;
        return (
            shown
                .map(([key, field]) => {
                    if (
                        Array.isArray(field) &&
                        field.some(
                            (item) => item !== null && typeof item === "object",
                        )
                    ) {
                        abbreviated = true;
                        const names = field
                            .slice(0, 5)
                            .map(
                                (item) =>
                                    item?.name ??
                                    item?.id ??
                                    item?.key ??
                                    item?.status,
                            )
                            .filter(Boolean);
                        return `${label(key)}: ${field.length} entries${names.length ? ` (${names.map((item) => conciseText(item, 40)).join(", ")})` : ""}`;
                    }
                    const summary = summarize(field, depth + 1);
                    return `${label(key)}: ${summary.replace(/\n/g, "; ")}`;
                })
                .join("\n") +
            (fields.length > shown.length
                ? `\n… ${fields.length - shown.length} more fields.`
                : "")
        );
    };
    const response =
        value !== null && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : undefined;
    const data = response && "data" in response ? response.data : value;
    const result =
        Array.isArray(data) &&
        data.length &&
        data.every(
            (entry) =>
                entry !== null &&
                typeof entry === "object" &&
                !Array.isArray(entry),
        ) &&
        table
            ? table(data as Array<Record<string, unknown>>)
            : summarize(data, 0);
    const metadata = response?.meta
        ? `\nMetadata: ${summarize(response.meta, 1)}`
        : "";
    return (
        result + metadata + (abbreviated ? "\nUse -v for full details." : "")
    );
}
