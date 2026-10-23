/** Find the same visible card that the server's create-conflict check would find. */
export function findMatchingEntry(entries, input, location) {
    const normalize = (value) =>
        value.trim().normalize("NFKC").toLocaleLowerCase();
    const label = normalize(input.label);
    return entries.find(
        (entry) =>
            entry.schemaId === input.schemaId &&
            entry.layer === input.layer &&
            normalize(entry.label) === label &&
            (entry.scope === "global" ||
                (entry.scope === location.scope &&
                    (location.scopeId === undefined ||
                        entry.scopeId === location.scopeId))),
    );
}
