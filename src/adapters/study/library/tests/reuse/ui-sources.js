import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";

const ROOT = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../..",
);
const indexSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/index.js"),
    "utf8",
);
const layerPageSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/layer/index.js"),
    "utf8",
);
const requestsPageSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/requests/index.js"),
    "utf8",
);

const adminInteractionsSource = [
    "admin-interactions/index.js",
    "admin-interactions/editor-body.js",
    "pronunciation-editor.js",
]
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const cardsSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/cards.js"),
    "utf8",
);
const source = readdirSync(resolve(ROOT, "src/adapters/study/library/ui/app"), {
    recursive: true,
})
    .filter((file) => file.endsWith(".js"))
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/app/${file}`),
            "utf8",
        ),
    )
    .join("\n");
const popupStylesheet = readFileSync(
    resolve(ROOT, "src/ui/styles/popup.css"),
    "utf8",
);
const stylesheet = [
    "library.css",
    "library-admin.css",
    "library-selection.css",
    "library-detail.css",
]
    .map((file) =>
        readFileSync(
            resolve(ROOT, `src/adapters/study/library/ui/${file}`),
            "utf8",
        ),
    )
    .join("\n");

const adapterSource = readFileSync(
    resolve(ROOT, "src/adapters/study/library/index.ts"),
    "utf8",
);
const createEntrySource = [
    "index.js",
    "composition.js",
    "definitions.js",
    "definition-editor.js",
    "lookups.js",
    "lookup-replacement.js",
    "pronunciation-draft.js",
]
    .map((file) =>
        readFileSync(
            resolve(
                ROOT,
                `src/adapters/study/library/ui/app/create-entry/${file}`,
            ),
            "utf8",
        ),
    )
    .join("\n");
const carouselStylesheet = readFileSync(
    resolve(ROOT, "src/ui/styles/reuse/horizontal-carousel.css"),
    "utf8",
);
const variantArrowLight = readFileSync(
    resolve(
        ROOT,
        "src/adapters/study/library/ui/assets/variant-arrow-light.svg",
    ),
    "utf8",
);
const variantArrowDark = readFileSync(
    resolve(
        ROOT,
        "src/adapters/study/library/ui/assets/variant-arrow-dark.svg",
    ),
    "utf8",
);

export {
    ROOT,
    indexSource,
    layerPageSource,
    requestsPageSource,
    adminInteractionsSource,
    cardsSource,
    source,
    stylesheet,
    popupStylesheet,
    adapterSource,
    createEntrySource,
    carouselStylesheet,
    variantArrowLight,
    variantArrowDark,
};
