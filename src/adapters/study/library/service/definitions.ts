import definitionLanguages from "../definition-languages.json" with { type: "json" };
import { canonicalizeLanguageTag } from "../language.js";
import { createHash } from "node:crypto";
import type {
    LibraryDefinitionLocalizationRequest,
    LibraryLayerSchema,
    StringLocalizationCapability,
} from "../types.js";

export async function localizeDefinition(
    request: LibraryDefinitionLocalizationRequest,
    localization?: StringLocalizationCapability,
    log?: (
        level: string,
        message: string,
        metadata: Record<string, unknown>,
    ) => void | Promise<void>,
) {
    if (
        !request ||
        !request.translations ||
        typeof request.translations !== "object" ||
        Array.isArray(request.translations) ||
        !Array.isArray(request.languages) ||
        request.languages.some(
            (language) => !definitionLanguages.includes(language),
        )
    )
        throw new Error("invalid_definition_localization");
    const translations: Record<string, string> = {};
    for (const [language, text] of Object.entries(request.translations)) {
        if (typeof text !== "string" || text.length > 500)
            throw new Error("invalid_definition_localization");
        if (text.trim())
            translations[canonicalizeLanguageTag(language)] = text.trim();
    }
    const sourceLanguage = translations.en
        ? "en"
        : Object.keys(translations)[0];
    if (!sourceLanguage) throw new Error("definition_source_required");
    const sourceText = translations[sourceLanguage];
    const stringKey = `study-library:definition-preview:${createHash("sha256").update(`${sourceLanguage}:${sourceText}`).digest("hex")}`;
    for (const targetLanguage of new Set(request.languages)) {
        if (translations[targetLanguage] || !localization) continue;
        try {
            const text = await localization.translate({
                stringKey,
                sourceText,
                sourceLanguage,
                targetLanguage,
            });
            if (text?.trim() && text.length <= 500)
                translations[targetLanguage] = text.trim();
        } catch (error) {
            await log?.("error", "Definition preview translation failed.", {
                component: "study-library",
                operation: "localize-definition",
                targetLanguage,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return {
        translations,
        missingLanguages: Array.from(new Set(request.languages)).filter(
            (language) => !translations[language],
        ),
    };
}

export async function translateDefinitionLanguages(
    translations: Record<string, string>,
    stringKey: string,
    languages: readonly string[],
    localization?: StringLocalizationCapability,
): Promise<void> {
    if (!localization) return;
    for (const language of languages) {
        const targetLanguage = canonicalizeLanguageTag(language);
        if (translations[targetLanguage]?.trim()) continue;
        const translated = await localization.translate({
            stringKey,
            sourceText: translations.en.trim(),
            sourceLanguage: "en",
            targetLanguage,
        });
        if (translated?.trim())
            translations[targetLanguage] = translated.trim();
    }
}

export async function prepareDefinitionFields(
    layer: LibraryLayerSchema,
    fields: Record<string, unknown>,
    entryId: string,
    languages: readonly string[],
    localization?: StringLocalizationCapability,
): Promise<void> {
    const settings = layer.definitionLocalization!;
    const translations = fields[settings.translationsField];
    if (
        !translations ||
        typeof translations !== "object" ||
        Array.isArray(translations) ||
        typeof (translations as Record<string, unknown>).en !== "string" ||
        !(translations as Record<string, string>).en.trim()
    ) {
        throw new Error("definition_english_required");
    }
    const stringKey = `${settings.stringKeyPrefix}:${entryId}`;
    fields[settings.stringKeyField] = stringKey;
    await translateDefinitionLanguages(
        translations as Record<string, string>,
        stringKey,
        languages,
        localization,
    );
}
