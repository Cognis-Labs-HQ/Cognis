import { localizedLabels } from "../../../gateways/study/reuse/localized-labels.js";

const REQUIRED = [
    "rank",
    "participant",
    "score",
    "ties",
    "movement",
    "updated",
    "caption",
    "medal",
    "rank_word",
    "tied_word",
    "you",
    "anonymous",
    "gold",
    "silver",
    "bronze",
    "classroom",
];

export async function tableLabels(
    locale: string,
    read?: (file: URL) => Promise<string>,
): Promise<Record<string, string>> {
    return localizedLabels(
        new URL("./ui/languages/", import.meta.url),
        locale,
        "gateway.study.leaderboard_",
        REQUIRED,
        read,
    );
}
