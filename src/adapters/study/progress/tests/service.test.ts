import assert from "node:assert/strict";
import test from "node:test";
import { ProgressService } from "../service.js";
import { MemoryProgressStore } from "../store.js";
import type { LearningEventInput, ProgressActor } from "../types.js";

const user: ProgressActor = { accountId: "actor-one", role: "user" };

function event(
    id: string,
    overrides: Partial<LearningEventInput> = {},
): LearningEventInput {
    return {
        id,
        occurredAt: "2026-09-06T10:00:00.000Z",
        content: {
            schema: "language-v1",
            layer: "words",
            language: "ja",
            contentId: "word-1",
        },
        contentRevision: "revision-1",
        activity: "recall",
        context: { interestVein: "travel" },
        attempt: 1,
        correct: true,
        independentCorrect: true,
        hints: 0,
        durationMs: 800,
        completion: "completed",
        metadata: { source: "lesson" },
        ...overrides,
    };
}

test("enforces actor privacy at the service boundary", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    await assert.rejects(
        service.recordEvent(
            user,
            event("event-private", { actorId: "actor-two" }),
        ),
        /forbidden_actor/,
    );
    await assert.rejects(
        service.listEvents(user, { actorId: "actor-two" }),
        /forbidden_actor/,
    );
});

test("requires classroom scope access for writes", async () => {
    const service = new ProgressService(new MemoryProgressStore(), {
        canRead: async () => false,
        canWrite: async () => false,
    });
    await assert.rejects(
        service.recordEvent(
            user,
            event("event-class", { context: { classroomId: "class-one" } }),
        ),
        /forbidden_scope/,
    );
});

test("records duplicate event ids idempotently", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    assert.equal(
        (await service.recordEvent(user, event("event-duplicate"))).duplicate,
        false,
    );
    assert.equal(
        (await service.recordEvent(user, event("event-duplicate"))).duplicate,
        true,
    );
    assert.equal((await service.listEvents(user)).length, 1);
    await assert.rejects(
        service.recordEvent(
            user,
            event("event-duplicate", { durationMs: 1_200 }),
        ),
        /event_id_conflict/,
    );
});

test("rebuilds projections and applies compensating corrections", async () => {
    const store = new MemoryProgressStore();
    const service = new ProgressService(store);
    await service.recordEvent(user, event("event-original"));
    await service.recordEvent(
        user,
        event("event-second", { occurredAt: "2026-09-07T10:00:00.000Z" }),
    );
    let projections = await service.rebuild(user);
    assert.equal(projections[0].attempted, 2);
    assert.equal(projections[0].correct, 2);

    await service.correctEvent(
        user,
        event("event-correction", {
            occurredAt: "2026-09-08T10:00:00.000Z",
            compensatesEventId: "event-original",
        }) as LearningEventInput & { compensatesEventId: string },
    );
    projections = await service.rebuild(user);
    assert.equal(projections[0].attempted, 2);
    assert.equal((await store.all()).length, 3);
});

test("rejects invalid aggregation windows and correction scope changes", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    await service.recordEvent(user, event("event-corrected"));
    await assert.rejects(
        service.aggregate(user, { from: "not-a-date" }),
        /invalid_from/,
    );
    await assert.rejects(
        service.correctEvent(
            user,
            event("event-wrong-content", {
                content: {
                    schema: "language-v1",
                    layer: "words",
                    language: "ja",
                    contentId: "word-2",
                },
                compensatesEventId: "event-corrected",
            }) as LearningEventInput & { compensatesEventId: string },
        ),
        /correction_scope_mismatch/,
    );
});

test("aggregates supported dimensions and time windows", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    await service.recordEvent(user, event("event-ja"));
    await service.recordEvent(
        user,
        event("event-de", {
            content: {
                schema: "language-v1",
                layer: "words",
                language: "de",
                contentId: "word-2",
            },
        }),
    );
    assert.equal(
        (
            await service.aggregate(user, {
                language: "ja",
                activity: "recall",
                interestVein: "travel",
            })
        ).events,
        1,
    );
    assert.equal(
        (await service.aggregate(user, { from: "2027-01-01T00:00:00.000Z" }))
            .events,
        0,
    );
});

test("preserves the complete event contract and derives every projection metric", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    const outcomes = [true, true, true, true, false];
    for (const [index, independentCorrect] of outcomes.entries()) {
        await service.recordEvent(
            user,
            event(`event-metric-${index}`, {
                occurredAt: `2026-09-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
                contentRevision: `revision-${index + 1}`,
                attempt: index + 1,
                correct: independentCorrect,
                independentCorrect,
                hints: independentCorrect ? 0 : 2,
                durationMs: (index + 1) * 200,
                completion: index === 4 ? "abandoned" : "completed",
                context: {
                    interestVein: "travel",
                    classroomId: undefined,
                },
                metadata: { source: "lesson", nested: { index } },
            }),
        );
    }

    const stored = await service.listEvents(user, {
        eventId: "event-metric-4",
    });
    assert.deepEqual(stored[0].metadata, {
        source: "lesson",
        nested: { index: 4 },
    });
    assert.equal(stored[0].attempt, 5);
    assert.equal(stored[0].completion, "abandoned");

    const [projection] = await service.listProjections(user);
    assert.deepEqual(projection.content, event("unused").content);
    assert.equal(projection.contentRevision, "revision-5");
    assert.equal(projection.seen, 5);
    assert.equal(projection.attempted, 5);
    assert.equal(projection.correct, 4);
    assert.equal(projection.mastered, true);
    assert.equal(projection.confidence, 0.8);
    assert.equal(projection.streak, 0);
    assert.equal(projection.hintDependence, 0.2);
    assert.equal(projection.lastPractice, "2026-09-05T10:00:00.000Z");
    assert.equal(projection.responseDurationMs, 600);
    assert.equal(projection.dueForReview, "2026-09-11T10:00:00.000Z");
    assert.deepEqual(await service.aggregate(user), {
        events: 5,
        seen: 5,
        attempted: 5,
        correct: 4,
        independentCorrect: 4,
        completed: 4,
        hints: 2,
        durationMs: 3_000,
        confidence: 0.8,
    });
});

test("validates every required event data category", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    const invalid: Array<[Partial<LearningEventInput>, RegExp]> = [
        [{ id: "" }, /invalid_event_id/],
        [{ occurredAt: "invalid" }, /invalid_occurred_at/],
        [
            { content: { ...event("base").content, schema: "" } },
            /invalid_schema/,
        ],
        [{ content: { ...event("base").content, layer: "" } }, /invalid_layer/],
        [
            { content: { ...event("base").content, language: "" } },
            /invalid_language/,
        ],
        [
            { content: { ...event("base").content, contentId: "" } },
            /invalid_content_id/,
        ],
        [{ contentRevision: "" }, /invalid_content_revision/],
        [{ activity: "" }, /invalid_activity/],
        [{ context: { interestVein: " invalid" } }, /invalid_interest_vein/],
        [{ context: { classroomId: " invalid" } }, /invalid_classroom_id/],
        [{ attempt: -1 }, /invalid_attempt/],
        [{ correct: "yes" as never }, /invalid_correctness/],
        [{ independentCorrect: "yes" as never }, /invalid_correctness/],
        [
            { correct: false, independentCorrect: true },
            /invalid_independent_correctness/,
        ],
        [{ hints: -1 }, /invalid_hints/],
        [{ durationMs: -1 }, /invalid_duration/],
        [{ completion: "finished" as never }, /invalid_completion/],
        [{ metadata: [] as never }, /invalid_metadata/],
        [{ metadata: JSON.parse('{"__proto__":"unsafe"}') }, /unsafe_metadata/],
    ];
    for (const [index, [overrides, expected]] of invalid.entries()) {
        await assert.rejects(
            service.recordEvent(user, event(`invalid-${index}`, overrides)),
            expected,
        );
    }
});

test("supports every aggregation dimension", async () => {
    const service = new ProgressService(new MemoryProgressStore(), {
        canRead: async () => true,
        canWrite: async () => true,
    });
    await service.recordEvent(
        user,
        event("event-dimensions", {
            context: { interestVein: "travel", classroomId: "class-one" },
        }),
    );
    const matchingFilters = [
        { schema: "language-v1" },
        { layer: "words" },
        { language: "ja" },
        { activity: "recall" },
        { interestVein: "travel" },
        { classroomId: "class-one" },
        { eventId: "event-dimensions" },
        { from: "2026-09-06T10:00:00.000Z" },
        { until: "2026-09-06T10:00:00.000Z" },
    ];
    for (const filters of matchingFilters) {
        assert.equal((await service.aggregate(user, filters)).events, 1);
    }
    assert.equal(
        (
            await service.aggregate(
                { accountId: "admin", role: "admin" },
                {
                    actorId: user.accountId,
                },
            )
        ).events,
        1,
    );
});

test("broad reads omit classroom events after access is revoked", async () => {
    let allowed = true;
    const service = new ProgressService(new MemoryProgressStore(), {
        canRead: async () => allowed,
        canWrite: async () => allowed,
    });
    await service.recordEvent(
        user,
        event("event-revoked", { context: { classroomId: "class-one" } }),
    );
    allowed = false;

    assert.deepEqual(await service.listEvents(user), []);
    assert.deepEqual(await service.listProjections(user), []);
    assert.equal((await service.aggregate(user)).events, 0);
    await assert.rejects(
        service.listEvents(user, { classroomId: "class-one" }),
        /forbidden_scope/,
    );
});

test("compensations remain effective outside the requested time window", async () => {
    const service = new ProgressService(new MemoryProgressStore());
    await service.recordEvent(user, event("event-window-original"));
    await service.correctEvent(
        user,
        event("event-window-correction", {
            occurredAt: "2026-09-08T10:00:00.000Z",
            compensatesEventId: "event-window-original",
        }) as LearningEventInput & { compensatesEventId: string },
    );

    const window = { until: "2026-09-07T00:00:00.000Z" };
    assert.equal((await service.aggregate(user, window)).events, 0);
    assert.deepEqual(await service.listProjections(user, window), []);
});
