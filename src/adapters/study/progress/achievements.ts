import type { AchievementCapability } from "@cognis/core";
import { localizedLabels } from "../../../gateways/study/reuse/localized-labels.js";

export async function registerPracticeAchievements(
    achievements: AchievementCapability,
): Promise<void> {
    const labels = await Promise.all(
        ["en", "de", "id", "ja"].map(
            async (locale) =>
                [
                    locale,
                    await localizedLabels(
                        new URL("./languages/", import.meta.url),
                        locale,
                        "adapter.study.progress.",
                        ["independent_title", "independent_description"],
                    ),
                ] as const,
        ),
    );
    achievements.register({
        id: "study-first-independent",
        providerId: "study",
        difficulty: "normal",
        title: Object.fromEntries(
            labels.map(([locale, strings]) => [
                locale,
                strings.independent_title,
            ]),
        ),
        description: Object.fromEntries(
            labels.map(([locale, strings]) => [
                locale,
                strings.independent_description,
            ]),
        ),
        icon: "/static/adapters/study/progress/assets/award.svg",
        evaluate: (activity) =>
            activity.events.some(
                ({ independentCorrect }) => independentCorrect,
            ),
    });
}
