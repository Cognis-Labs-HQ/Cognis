export function pronunciationClass(value) {
    const text = Array.isArray(value) ? value.join(" · ") : String(value ?? "");
    return /\/[^/]+\//u.test(text) ? "study-ipa" : "";
}
