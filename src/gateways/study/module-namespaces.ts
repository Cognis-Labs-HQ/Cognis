import type { ModuleNamespacePolicy } from "@cognis/core";

/** Delegate the canonical language integration space only to its matching module. */
export const authorizeLanguageModuleNamespace: ModuleNamespacePolicy = ({
    moduleId,
    kind,
    id,
}) => {
    const prefix = "study-language-";
    if (!moduleId.startsWith(prefix)) return false;
    const language = moduleId.slice(prefix.length);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(language)) return false;
    const namespace =
        kind === "apiRoute"
            ? `/api/v1/study/languages/${language}`
            : `study:language:${language}`;
    const separator = kind === "apiRoute" ? "/" : ":";
    return id === namespace || id.startsWith(namespace + separator);
};
