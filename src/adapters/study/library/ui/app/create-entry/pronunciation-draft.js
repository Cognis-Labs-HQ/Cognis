export function setGeneratedPronunciation(form, pronunciation) {
    const field = form.elements["field:pronunciation"];
    if (!field) return;
    const previous = form.libraryGeneratedPronunciation ?? [];
    const values = field.value
        .split(/\r?\n/u)
        .map((value) => value.trim())
        .filter(Boolean);
    const authored = values.filter((value) => !previous.includes(value));
    const generated = (
        Array.isArray(pronunciation) ? pronunciation : [pronunciation]
    )
        .map((value) => value.trim())
        .filter(Boolean);
    field.value = [...new Set([...authored, ...generated])].join("\n");
    form.libraryGeneratedPronunciation = generated.filter(
        (value) => !authored.includes(value),
    );
    field.dispatchEvent(new Event("input", { bubbles: true }));
}
