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
