/** Validate versioned declarative plays; callbacks are trusted owner code, never evaluated strings. */
const NAME_PATTERN = /^[a-z][a-z0-9.-]{0,79}$/;
const TARGET = /^[a-z][a-z0-9.-]{0,79}:[a-z][a-z0-9.-]{0,79}$/;
const EVENTS = new Set(["click", "change", "input", "submit", "keydown"]);
const assert = (allowed) => {
    if (!allowed) throw new TypeError("invalid_tutorial_definition");
};

export function validateName(value) {
    assert(typeof value === "string" && NAME_PATTERN.test(value));
    return value;
}

export function validateRoute(value) {
    assert(
        typeof value === "string" && /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(value),
    );
    return value;
}

function keys(value, allowed) {
    assert(value && typeof value === "object" && !Array.isArray(value));
    assert(Object.keys(value).every((key) => allowed.includes(key)));
}

export function validatePlay(input) {
    keys(input, [
        "version",
        "id",
        "titleKey",
        "steps",
        "available",
        "requires",
    ]);
    assert(input.version === 1);
    validateName(input.id);
    assert(typeof input.titleKey === "string" && input.titleKey.length > 0);
    assert(
        Array.isArray(input.steps) &&
            input.steps.length > 0 &&
            input.steps.length <= 100,
    );
    assert(
        input.available === undefined || typeof input.available === "function",
    );
    assert(
        input.requires === undefined ||
            (Array.isArray(input.requires) &&
                input.requires.length <= 30 &&
                input.requires.every(
                    (id) => typeof id === "string" && id.length <= 150,
                )),
    );
    const ids = new Set();
    const steps = input.steps.map((step) => {
        keys(step, [
            "id",
            "target",
            "titleKey",
            "bodyKey",
            "effects",
            "placement",
            "padding",
            "interaction",
            "advance",
            "missing",
            "enter",
            "waitFor",
            "route",
        ]);
        validateName(step.id);
        assert(!ids.has(step.id));
        ids.add(step.id);
        assert(
            step.target === undefined ||
                (typeof step.target === "string" && TARGET.test(step.target)),
        );
        assert(typeof step.titleKey === "string" && step.titleKey.length > 0);
        assert(
            step.bodyKey === undefined ||
                (typeof step.bodyKey === "string" && step.bodyKey.length > 0),
        );
        const effects = {
            callout: true,
            arrow: false,
            spotlight: false,
            ...step.effects,
        };
        keys(effects, ["callout", "arrow", "spotlight"]);
        assert(
            Object.values(effects).every((value) => typeof value === "boolean"),
        );
        assert(
            step.placement === undefined ||
                ["auto", "top", "bottom", "left", "right"].includes(
                    step.placement,
                ),
        );
        assert(
            step.padding === undefined ||
                (Number.isFinite(step.padding) &&
                    step.padding >= 0 &&
                    step.padding <= 40),
        );
        assert(
            step.interaction === undefined ||
                ["free", "target"].includes(step.interaction),
        );
        assert(
            step.target ||
                (!effects.arrow &&
                    !effects.spotlight &&
                    step.interaction !== "target" &&
                    !step.advance),
        );
        if (step.advance) {
            keys(step.advance, ["event", "key", "accept"]);
            assert(EVENTS.has(step.advance.event));
            assert(
                step.advance.key === undefined ||
                    (step.advance.event === "keydown" &&
                        typeof step.advance.key === "string"),
            );
            assert(
                step.advance.accept === undefined ||
                    typeof step.advance.accept === "function",
            );
        }
        const missing = { timeoutMs: 5000, action: "cancel", ...step.missing };
        keys(missing, ["timeoutMs", "action"]);
        assert(
            Number.isFinite(missing.timeoutMs) &&
                missing.timeoutMs >= 0 &&
                missing.timeoutMs <= 15000,
        );
        assert(["cancel", "skip", "retry"].includes(missing.action));
        for (const callback of [step.enter, step.waitFor])
            assert(callback === undefined || typeof callback === "function");
        assert(
            step.route === undefined ||
                typeof step.route === "function" ||
                (typeof step.route === "string" &&
                    /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(step.route)),
        );
        return Object.freeze({
            ...step,
            effects: Object.freeze(effects),
            missing: Object.freeze(missing),
            advance: step.advance
                ? Object.freeze({ ...step.advance })
                : undefined,
        });
    });
    return Object.freeze({
        ...input,
        requires: Object.freeze([...(input.requires ?? [])]),
        steps: Object.freeze(steps),
    });
}
