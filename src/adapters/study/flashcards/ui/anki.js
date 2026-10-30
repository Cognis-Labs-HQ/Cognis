/** Anki-compatible, quoted tab-separated plain-text notes; no HTML execution. */
export function parseAnkiNotes(text) {
    const lines = text.replace(/^\uFEFF/u, "").split(/\r?\n/u);
    while (lines[0]?.startsWith("#")) lines.shift();
    const body = lines.join("\n");
    const rows = [];
    let row = [],
        field = "",
        quoted = false;
    for (let index = 0; index < body.length; index++) {
        const char = body[index];
        if (char === '"') {
            if (quoted && body[index + 1] === '"') {
                field += '"';
                index++;
            } else quoted = !quoted;
        } else if (!quoted && (char === "\t" || char === "\n")) {
            row.push(field);
            field = "";
            if (char === "\n") {
                rows.push(row);
                row = [];
            }
        } else field += char;
    }
    if (quoted) throw new Error("invalid_anki_quotes");
    row.push(field);
    rows.push(row);
    const notes = rows
        .filter((row) => row.some((value) => value.trim()))
        .map((row) => {
            if (row.length < 2 || !row[0].trim())
                throw new Error("invalid_anki_note");
            return {
                front: row[0],
                back: row[1],
                pronunciation: row[2] || undefined,
            };
        });
    if (!notes.length) throw new Error("empty_deck");
    return notes;
}

export function exportAnkiNotes(name, notes) {
    const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    return (
        `#separator:tab\n#html:false\n#deck:${name.replace(/[\r\n]/gu, " ")}\n#columns:Front\tBack\tPronunciation\tCognis\n` +
        notes
            .map((note) =>
                [
                    note.front,
                    note.back,
                    note.pronunciation,
                    JSON.stringify(note.context ?? {}),
                ]
                    .map(quote)
                    .join("\t"),
            )
            .join("\n") +
        "\n"
    );
}
