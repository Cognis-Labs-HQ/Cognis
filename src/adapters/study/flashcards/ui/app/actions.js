import { createActionRunner } from "/static/gateways/study/reuse/action-flows.js";

export const DECK_ACTIONS = [
    "load",
    "browse",
    "add",
    "create",
    "edit",
    "import",
    "delete",
    "export",
    "filter",
    "practiceMode",
    "restart",
    "answer",
    "hint",
    "previous",
    "review",
    "depart",
];

export const runDeckAction = createActionRunner("study:decks", DECK_ACTIONS);
