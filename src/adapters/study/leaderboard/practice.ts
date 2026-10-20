import { createHash } from "node:crypto";
import type { ActivityScoreInput, ActivityScore } from "@cognis/core";
import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";
import type { LeaderboardService } from "./service.js";
import type { LeaderboardActor } from "./types.js";
import { tableLabels } from "./localization.js";

interface PracticeInput {
    actor: LeaderboardActor;
    event: {
        id: string;
        actorId: string;
        content: { language: string };
        context: { classroomId?: string };
    };
    activity: ActivityScoreInput;
    score: ActivityScore;
}

/** Deliver already-settled XP through the existing evidence-backed leaderboard API. */
export function registerPracticeIntegration(
    ctx: Pick<
        StudyAdapterBootstrapCtx,
        "capabilities" | "flow" | "isAdapterEnabled"
    >,
    service: LeaderboardService,
): void {
    const registrations = new Map<string, Promise<void>>();
    const system =
        ctx.capabilities.require<import("@cognis/core").Ctx>("system:ctx");
    const flowId = "study:leaderboard:recordPractice";
    system.registerFlow({ id: flowId, stages: ["authorize", "persist"] });
    ctx.flow.extend(
        flowId,
        "authorize",
        { id: "study-leaderboard:authorizePractice" },
        ({ input }) => {
            const value = input as PracticeInput;
            if (!ctx.isAdapterEnabled()) throw new Error("adapter_disabled");
            if (
                value.event.actorId !== value.activity.participantId ||
                value.event.id !== value.activity.activityId ||
                value.activity.events.length !== 1 ||
                value.activity.events[0].id !== value.event.id
            )
                throw new Error("practice_evidence_mismatch");
        },
    );
    ctx.flow.extend(
        flowId,
        "persist",
        { id: "study-leaderboard:persistPractice" },
        async ({ input }) => {
            const { actor, event, activity, score } = input as PracticeInput;
            const classroomId = event.context.classroomId;
            if (classroomId) {
                const id =
                    "classroom-" +
                    createHash("sha256").update(classroomId).digest("hex");
                if (
                    !service
                        .listDefinitions()
                        .some((definition) => definition.id === id)
                ) {
                    const labels = Object.fromEntries(
                        await Promise.all(
                            ["en", "de", "id", "ja"].map(
                                async (locale) =>
                                    [
                                        locale,
                                        await tableLabels(locale),
                                    ] as const,
                            ),
                        ),
                    );
                    if (
                        !service
                            .listDefinitions()
                            .some((definition) => definition.id === id)
                    ) {
                        let registration = registrations.get(id);
                        if (!registration) {
                            registration = service
                                .registerDefinition({
                                    id,
                                    metadata: {
                                        labels: Object.fromEntries(
                                            Object.entries(labels).map(
                                                ([locale, strings]) => {
                                                    const language =
                                                        /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(
                                                            event.content
                                                                .language,
                                                        )
                                                            ? new Intl.DisplayNames(
                                                                  [locale],
                                                                  {
                                                                      type: "language",
                                                                  },
                                                              ).of(
                                                                  event.content
                                                                      .language,
                                                              )
                                                            : undefined;
                                                    return [
                                                        locale,
                                                        language
                                                            ? `${language} · ${strings.classroom}`
                                                            : strings.classroom,
                                                    ];
                                                },
                                            ),
                                        ),
                                    },
                                    kind: "classroom",
                                    classroomId,
                                    minimumCohortSize: 2,
                                    criteria: [
                                        {
                                            id: "xp",
                                            metric: "xp",
                                            label: Object.fromEntries(
                                                Object.entries(labels).map(
                                                    ([locale, strings]) => [
                                                        locale,
                                                        strings.score,
                                                    ],
                                                ),
                                            ),
                                            priority: 1,
                                            direction: "descending",
                                            valueType: "number",
                                            minimumEvidence: 1,
                                            tieBreak: "participantId",
                                            window: { kind: "allTime" },
                                            scope: "classroom",
                                        },
                                    ],
                                })
                                .finally(() => registrations.delete(id));
                            registrations.set(id, registration);
                        }
                        await registration;
                    }
                }
            }
            for (const definition of service.listDefinitions()) {
                if (
                    definition.kind === "classroom" &&
                    definition.classroomId !== classroomId
                )
                    continue;
                const participant = {
                    accountId: activity.participantId,
                    role:
                        activity.participantId === actor.accountId
                            ? actor.role
                            : ("user" as const),
                };
                if (
                    !(await service.canAccessDefinition(
                        participant,
                        definition.id,
                    ))
                )
                    continue;
                if (
                    definition.season &&
                    (Date.parse(activity.completedAt) <
                        Date.parse(definition.season.startsAt) ||
                        Date.parse(activity.completedAt) >=
                            Date.parse(definition.season.endsAt))
                )
                    continue;
                for (const criterion of definition.criteria)
                    if (
                        criterion.metric === "xp" &&
                        criterion.minimumEvidence <= activity.events.length
                    )
                        await service.scoreActivity(
                            actor,
                            definition.id,
                            criterion.id,
                            activity,
                            score,
                        );
            }
        },
    );
    ctx.capabilities.contribute(
        "study:leaderboard:recordPractice",
        async (input: PracticeInput) => {
            await ctx.flow.run(flowId, input);
        },
    );
    ctx.capabilities.contribute(
        "study:leaderboard:invalidateEvidence",
        async ({
            actor,
            eventId,
        }: {
            actor: LeaderboardActor;
            eventId: string;
        }) => {
            await service.invalidateEvidence(actor, eventId);
        },
    );
}
