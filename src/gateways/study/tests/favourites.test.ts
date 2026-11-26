import assert from "node:assert/strict";
import test from "node:test";
import { VolatileUserPreferenceStore } from "../../../api/reuse/preference-store.js";
import { StudyFavourites } from "../reuse/favourites.js";

test("Study favourites are account-scoped, idempotent and independent by resource kind", async () => {
    const service = new StudyFavourites(new VolatileUserPreferenceStore());
    await service.set("one", { kind: "library", id: "card", favourite: true });
    await service.set("one", { kind: "library", id: "card", favourite: true });
    await service.set("one", {
        kind: "flashcard",
        id: "card",
        favourite: true,
    });
    assert.equal((await service.list("one")).length, 2);
    assert.deepEqual(await service.list("two"), []);
    await service.set("one", { kind: "library", id: "card", favourite: false });
    assert.deepEqual(await service.list("one"), [
        { kind: "flashcard", id: "card" },
    ]);
});
test("concurrent favourite changes preserve every selection and validation rejects invalid writes", async () => {
    const service = new StudyFavourites(new VolatileUserPreferenceStore());
    await Promise.all(
        ["a", "b", "c"].map((id) =>
            service.set("one", { kind: "deck", id, favourite: true }),
        ),
    );
    assert.equal((await service.list("one")).length, 3);
    await assert.rejects(
        service.set("one", {
            kind: "unknown",
            id: "card",
            favourite: true,
        } as never),
        /invalid_favourite/,
    );
});
