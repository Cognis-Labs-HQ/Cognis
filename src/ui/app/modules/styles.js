import { preparePageStylesheets } from "../../reuse/page-styles.js";

const MODULE_PAGE_STYLESHEETS = [
    "/static/styles/page-builder.css",
    "/static/styles/reuse/page-sections.css",
    "/static/styles/modules.css",
];

export function loadModulePageStyles() {
    return preparePageStylesheets(MODULE_PAGE_STYLESHEETS);
}
