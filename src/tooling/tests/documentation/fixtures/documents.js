import structure from "../../../reuse/documentation/structure.json" with { type: "json" };

export function markdown(kind, language = "en") {
    return `# Example\n\nA useful introduction for the component.\n\n${structure[language][kind].map((heading) => `## ${heading}\n\nConcrete instructions and expected behavior.\n`).join("\n")}`;
}
