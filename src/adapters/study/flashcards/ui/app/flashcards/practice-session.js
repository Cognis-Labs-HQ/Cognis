export function createPracticeSession(cards, snapshot) {
    let index = Math.min(
        cards.length,
        Math.max(0, Number.isInteger(snapshot?.index) ? snapshot.index : 0),
    );
    const grades = new Map(
        (snapshot?.grades ?? []).filter(
            ([position, grade]) =>
                Number.isInteger(position) &&
                position >= 0 &&
                position < cards.length &&
                ["good", "again", "easy"].includes(grade),
        ),
    );
    const attempts = new Map(snapshot?.attempts ?? []);
    return {
        get current() {
            return cards[index];
        },
        get canPrevious() {
            return index > 0;
        },
        get answeredGrade() {
            return grades.get(index) ?? attempts.get(index);
        },
        get answered() {
            return grades.has(index);
        },
        snapshot() {
            return {
                cardIds: cards.map(({ entry }) => entry.id),
                index,
                grades: [...grades],
                attempts: [...attempts],
            };
        },
        answer(grade) {
            if (["good", "again", "easy"].includes(grade))
                attempts.set(
                    index,
                    attempts.get(index) === "again" ? "again" : grade,
                );
        },
        next(grade) {
            if (grade) grades.set(index, grade);
            index = Math.min(cards.length, index + 1);
        },
        previous() {
            index = Math.max(0, index - 1);
        },
    };
}

export function resumePracticeSession(cards, snapshot) {
    if (!Array.isArray(snapshot?.cardIds))
        return { queue: cards, session: createPracticeSession(cards) };
    const byId = new Map(cards.map((detail) => [detail.entry.id, detail]));
    const queue = [...new Set(snapshot.cardIds)]
        .filter((id) => byId.has(id))
        .map((id) => byId.get(id));
    const oldPositions = new Map(
        snapshot.cardIds.map((id, index) => [id, index]),
    );
    const remap = (values) => {
        const previous = new Map(values ?? []);
        return queue.flatMap(({ entry }, index) =>
            previous.has(oldPositions.get(entry.id))
                ? [[index, previous.get(oldPositions.get(entry.id))]]
                : [],
        );
    };
    const grades = remap(snapshot.grades);
    const attempts = remap(snapshot.attempts);
    const index = snapshot.cardIds
        .slice(0, snapshot.index)
        .filter((id) => byId.has(id)).length;
    return {
        queue,
        session: createPracticeSession(queue, { index, grades, attempts }),
    };
}
