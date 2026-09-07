import { randomInt } from "node:crypto";

export const PASSPHRASE_CAPABILITY = "reuse:generatePassphrase";

export type PassphraseCapitalization = "lowercase" | "uppercase" | "titlecase";

export interface PassphraseOptions {
    words: number;
    separator?: string;
    capitalization?: PassphraseCapitalization;
}

export type GeneratePassphrase = (options: PassphraseOptions) => string;

const WORDS = [
    "acorn",
    "amber",
    "anchor",
    "apple",
    "apron",
    "arrow",
    "aspen",
    "atlas",
    "badger",
    "bamboo",
    "beacon",
    "berry",
    "birch",
    "bison",
    "bloom",
    "breeze",
    "brook",
    "cabin",
    "cactus",
    "canyon",
    "cedar",
    "cherry",
    "cloud",
    "clover",
    "comet",
    "coral",
    "cosmos",
    "crane",
    "creek",
    "daisy",
    "delta",
    "dune",
    "eagle",
    "earth",
    "elm",
    "ember",
    "falcon",
    "fern",
    "field",
    "finch",
    "fjord",
    "flame",
    "flora",
    "forest",
    "frost",
    "galaxy",
    "garden",
    "glade",
    "grove",
    "harbor",
    "hazel",
    "heron",
    "hill",
    "honey",
    "island",
    "ivory",
    "jade",
    "jasmine",
    "juniper",
    "kelp",
    "lagoon",
    "lake",
    "lark",
    "laurel",
    "leaf",
    "lemon",
    "lilac",
    "lily",
    "lotus",
    "lunar",
    "maple",
    "marble",
    "meadow",
    "mesa",
    "meteor",
    "mint",
    "mist",
    "moon",
    "moss",
    "nectar",
    "oasis",
    "ocean",
    "olive",
    "onyx",
    "orchid",
    "otter",
    "owl",
    "panda",
    "peach",
    "pearl",
    "pebble",
    "pine",
    "planet",
    "plum",
    "pond",
    "prairie",
    "quartz",
    "rain",
    "raven",
    "reef",
    "ridge",
    "river",
    "robin",
    "rose",
    "sage",
    "shell",
    "shore",
    "sky",
    "snow",
    "solar",
    "sparrow",
    "spruce",
    "star",
    "stone",
    "storm",
    "sunset",
    "surf",
    "swift",
    "thyme",
    "tiger",
    "trail",
    "tulip",
    "valley",
    "violet",
    "willow",
    "wind",
    "winter",
    "wren",
] as const;

function capitalizeWord(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function applyCapitalization(
    word: string,
    capitalization: PassphraseCapitalization,
): string {
    if (capitalization === "uppercase") return word.toUpperCase();
    if (capitalization === "titlecase") return capitalizeWord(word);
    return word;
}

export function generatePassphrase(options: PassphraseOptions): string {
    if (
        !Number.isSafeInteger(options.words) ||
        options.words < 1 ||
        options.words > 128
    ) {
        throw new RangeError(
            "Passphrase word count must be an integer between 1 and 128.",
        );
    }

    const separator = options.separator ?? "-";
    const capitalization = options.capitalization ?? "lowercase";
    if (typeof separator !== "string") {
        throw new TypeError("Passphrase separator must be a string.");
    }
    if (separator.length > 16) {
        throw new RangeError(
            "Passphrase separator must contain at most 16 characters.",
        );
    }
    if (!["lowercase", "uppercase", "titlecase"].includes(capitalization)) {
        throw new TypeError("Unsupported passphrase capitalization style.");
    }

    return Array.from({ length: options.words }, () => {
        const word = WORDS[randomInt(WORDS.length)];
        return applyCapitalization(word, capitalization);
    }).join(separator);
}
