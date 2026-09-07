/**
 * Provides browser request functions for core system metadata.
 *
 * Public exports:
 *   fetchSupportedLanguages() — returns every UI language advertised by Cognis.
 *
 * Usage:
 *   const languages = await fetchSupportedLanguages();
 *
 * @returns {Promise<Array<{key: string, label: string}>>} Advertised languages.
 */
import { apiFetch } from "./api-client.js";

export async function fetchSupportedLanguages() {
    const response = await apiFetch("/api/v1/system/languages");
    if (!response.ok) throw new Error("languages_failed");
    return (await response.json()).data;
}
