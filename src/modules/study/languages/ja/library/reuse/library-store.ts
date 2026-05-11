import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LibraryLayerName =
    | "characters"
    | "alt_characters"
    | "definitions"
    | "words"
    | "sentences";

export interface CharacterRecord {
    id: string;
    symbol: string;
    romanization: string;
    characterClass: string;
}

export interface CharacterClassRecord {
    id: string;
    characterIds: string[];
}

export interface AltCharacterRecord {
    id: string;
    symbol: string;
    components: string[];
    readings: string[];
    meaning?: string;
}

export interface DefinitionRecord {
    id: string;
    text: string;
    language: string;
}

export interface WordRecord {
    id: string;
    graphemes: string[];
    definitionIds: string[];
    reading?: string;
    jlptLevel?: string;
}

export interface SentenceRecord {
    id: string;
    wordIds: string[];
    definitionId?: string;
}

export interface LanguageLibrarySnapshot {
    characters: CharacterRecord[];
    characterClasses: CharacterClassRecord[];
    alt_characters: AltCharacterRecord[];
    definitions: DefinitionRecord[];
    words: WordRecord[];
    sentences: SentenceRecord[];
}

type LayerRecordMap = {
    characters: CharacterRecord;
    alt_characters: AltCharacterRecord;
    definitions: DefinitionRecord;
    words: WordRecord;
    sentences: SentenceRecord;
};

interface LibraryStoreOptions {
    moduleRoot: string;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void | Promise<void>;
}

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function ensureUniqueIds(
    layerName: string,
    records: Array<{ id: string }>,
): void {
    const seenIds = new Set();
    for (const record of records) {
        if (seenIds.has(record.id)) {
            throw new Error(`Duplicate id in ${layerName}: ${record.id}`);
        }
        seenIds.add(record.id);
    }
}

function sanitizeRecordId(rawValue: unknown): string {
    return String(rawValue ?? "").trim();
}

export class JapaneseLibraryStore {
    #moduleRoot;
    #log;
    #state = {
        characters: [],
        characterClasses: [],
        alt_characters: [],
        definitions: [],
        words: [],
        sentences: [],
    };

    constructor(options: LibraryStoreOptions) {
        this.#moduleRoot = options.moduleRoot;
        this.#log = options.log;
    }

    get dataRoot(): string {
        return path.join(this.#moduleRoot, "data");
    }

    async initialise(): Promise<void> {
        const nextState = await this.#loadDataFiles();
        this.#validateGraph(nextState);
        this.#state = nextState;
    }

    snapshot(): LanguageLibrarySnapshot {
        return deepClone(this.#state);
    }

    queryLayer<T extends LibraryLayerName>(
        layerName: T,
        query: Partial<LayerRecordMap[T]> = {},
    ): LayerRecordMap[T][] {
        const layerRows = this.#state[layerName];
        const entries = Object.entries(query).filter(
            ([, value]) => value !== undefined && value !== null,
        );
        if (!entries.length) {
            return deepClone(layerRows);
        }
        const filteredRows = layerRows.filter((row) =>
            entries.every(([fieldName, expectedValue]) => {
                const actualValue = row[fieldName];
                if (Array.isArray(expectedValue)) {
                    if (!Array.isArray(actualValue)) return false;
                    return expectedValue.every((value) =>
                        actualValue.includes(value),
                    );
                }
                return actualValue === expectedValue;
            }),
        );
        return deepClone(filteredRows);
    }

    async addRecord<T extends LibraryLayerName>(
        layerName: T,
        payload: LayerRecordMap[T],
    ): Promise<LayerRecordMap[T]> {
        const recordId = sanitizeRecordId(payload?.id);
        if (!recordId) {
            throw new Error(`Cannot add ${layerName} record without an id.`);
        }
        if (this.#state[layerName].some((row) => row.id === recordId)) {
            throw new Error(
                `Cannot add ${layerName} record: id already exists (${recordId}).`,
            );
        }
        const nextState = deepClone(this.#state);
        nextState[layerName].push(payload);
        this.#validateGraph(nextState);
        this.#state = nextState;
        await this.#persist();
        return deepClone(payload);
    }

    async updateRecord<T extends LibraryLayerName>(
        layerName: T,
        recordId: string,
        patch: Partial<LayerRecordMap[T]>,
    ): Promise<LayerRecordMap[T]> {
        const sanitizedId = sanitizeRecordId(recordId);
        const nextState = deepClone(this.#state);
        const layerRows = nextState[layerName];
        const rowIndex = layerRows.findIndex((row) => row.id === sanitizedId);
        if (rowIndex < 0) {
            throw new Error(
                `Cannot update ${layerName}: id not found (${sanitizedId}).`,
            );
        }
        const nextRecord = {
            ...layerRows[rowIndex],
            ...patch,
            id: sanitizedId,
        };
        layerRows[rowIndex] = nextRecord;
        this.#validateGraph(nextState);
        this.#state = nextState;
        await this.#persist();
        return deepClone(nextRecord);
    }

    async removeRecord<T extends LibraryLayerName>(
        layerName: T,
        recordId: string,
    ): Promise<void> {
        const sanitizedId = sanitizeRecordId(recordId);
        const nextState = deepClone(this.#state);
        const layerRows = nextState[layerName];
        const rowIndex = layerRows.findIndex((row) => row.id === sanitizedId);
        if (rowIndex < 0) {
            throw new Error(
                `Cannot delete ${layerName}: id not found (${sanitizedId}).`,
            );
        }
        layerRows.splice(rowIndex, 1);
        this.#validateGraph(nextState);
        this.#state = nextState;
        await this.#persist();
    }

    async #loadDataFiles() {
        const dataRoot = this.dataRoot;
        const characterDir = path.join(dataRoot, "characters");
        let characterFiles = [];
        try {
            characterFiles = (await readdir(characterDir))
                .filter((fileName) => fileName.endsWith(".json"))
                .sort();
        } catch {
            characterFiles = [];
        }

        const allCharacters: CharacterRecord[] = [];
        const allCharacterClasses: CharacterClassRecord[] = [];

        for (const fileName of characterFiles) {
            const classId = fileName.replace(/\.json$/, "");
            const rawContent = await readFile(
                path.join(characterDir, fileName),
                "utf8",
            );
            const fileRows = JSON.parse(rawContent);
            if (!Array.isArray(fileRows)) {
                throw new Error(
                    `Invalid character file format for ${fileName}.`,
                );
            }
            const classCharacterIds: string[] = [];
            for (const fileRow of fileRows) {
                const rowId = sanitizeRecordId(fileRow?.id);
                if (!rowId) {
                    throw new Error(
                        `Character row in ${fileName} is missing id.`,
                    );
                }
                allCharacters.push({
                    id: rowId,
                    symbol: String(fileRow?.symbol ?? ""),
                    romanization: String(fileRow?.romanization ?? ""),
                    characterClass: classId,
                });
                classCharacterIds.push(rowId);
            }
            allCharacterClasses.push({
                id: classId,
                characterIds: classCharacterIds,
            });
        }

        const loadJsonArray = async (filePath: string) => {
            try {
                const rawContent = await readFile(filePath, "utf8");
                const parsedValue = JSON.parse(rawContent);
                if (!Array.isArray(parsedValue)) {
                    throw new Error(`Expected array in ${filePath}`);
                }
                return parsedValue;
            } catch {
                return [];
            }
        };

        const altCharacters = await loadJsonArray(
            path.join(dataRoot, "alt-characters", "kanji.json"),
        );
        const definitions = await loadJsonArray(
            path.join(dataRoot, "definitions", "common.json"),
        );
        const words = await loadJsonArray(
            path.join(dataRoot, "words", "common.json"),
        );
        const sentences = await loadJsonArray(
            path.join(dataRoot, "sentences", "common.json"),
        );

        return {
            characters: allCharacters,
            characterClasses: allCharacterClasses,
            alt_characters: altCharacters,
            definitions,
            words,
            sentences,
        };
    }

    #validateGraph(state): void {
        ensureUniqueIds("characters", state.characters);
        ensureUniqueIds("alt_characters", state.alt_characters);
        ensureUniqueIds("definitions", state.definitions);
        ensureUniqueIds("words", state.words);
        ensureUniqueIds("sentences", state.sentences);

        const characterIdSet = new Set(
            state.characters.map((record) => record.id),
        );
        const altCharacterIdSet = new Set(
            state.alt_characters.map((record) => record.id),
        );
        const definitionIdSet = new Set(
            state.definitions.map((record) => record.id),
        );
        const wordIdSet = new Set(state.words.map((record) => record.id));

        for (const characterClass of state.characterClasses) {
            for (const characterId of characterClass.characterIds) {
                if (!characterIdSet.has(characterId)) {
                    throw new Error(
                        `Character class ${characterClass.id} references missing character id ${characterId}.`,
                    );
                }
            }
        }

        for (const altCharacter of state.alt_characters) {
            for (const componentId of altCharacter.components ?? []) {
                const componentExists =
                    characterIdSet.has(componentId) ||
                    altCharacterIdSet.has(componentId);
                if (!componentExists) {
                    throw new Error(
                        `Alt character ${altCharacter.id} references missing component ${componentId}.`,
                    );
                }
            }
        }

        for (const word of state.words) {
            for (const graphemeId of word.graphemes ?? []) {
                const graphemeExists =
                    characterIdSet.has(graphemeId) ||
                    altCharacterIdSet.has(graphemeId);
                if (!graphemeExists) {
                    throw new Error(
                        `Word ${word.id} references missing grapheme ${graphemeId}.`,
                    );
                }
            }
            for (const definitionId of word.definitionIds ?? []) {
                if (!definitionIdSet.has(definitionId)) {
                    throw new Error(
                        `Word ${word.id} references missing definition ${definitionId}.`,
                    );
                }
            }
        }

        for (const sentence of state.sentences) {
            for (const wordId of sentence.wordIds ?? []) {
                if (!wordIdSet.has(wordId)) {
                    throw new Error(
                        `Sentence ${sentence.id} references missing word ${wordId}.`,
                    );
                }
            }
            if (
                sentence.definitionId &&
                !definitionIdSet.has(sentence.definitionId)
            ) {
                throw new Error(
                    `Sentence ${sentence.id} references missing definition ${sentence.definitionId}.`,
                );
            }
        }
    }

    async #persist(): Promise<void> {
        const dataRoot = this.dataRoot;
        const charactersDir = path.join(dataRoot, "characters");
        const groupedByClass = new Map<string, CharacterRecord[]>();

        for (const character of this.#state.characters) {
            const classId = character.characterClass || "unclassified";
            const classRows = groupedByClass.get(classId) ?? [];
            classRows.push(character);
            groupedByClass.set(classId, classRows);
        }

        for (const [classId, classRows] of groupedByClass) {
            const outputRows = classRows
                .map((character) => ({
                    id: character.id,
                    symbol: character.symbol,
                    romanization: character.romanization,
                }))
                .sort((leftRow, rightRow) =>
                    leftRow.id.localeCompare(rightRow.id),
                );
            await writeFile(
                path.join(charactersDir, `${classId}.json`),
                `${JSON.stringify(outputRows, null, 2)}\n`,
                "utf8",
            );
        }

        await writeFile(
            path.join(dataRoot, "alt-characters", "kanji.json"),
            `${JSON.stringify(this.#state.alt_characters, null, 2)}\n`,
            "utf8",
        );
        await writeFile(
            path.join(dataRoot, "definitions", "common.json"),
            `${JSON.stringify(this.#state.definitions, null, 2)}\n`,
            "utf8",
        );
        await writeFile(
            path.join(dataRoot, "words", "common.json"),
            `${JSON.stringify(this.#state.words, null, 2)}\n`,
            "utf8",
        );
        await writeFile(
            path.join(dataRoot, "sentences", "common.json"),
            `${JSON.stringify(this.#state.sentences, null, 2)}\n`,
            "utf8",
        );

        this.#log?.("info", "Japanese language library persisted to disk.", {
            component: "study-language-ja",
        });
    }
}
