/**
 * Validates versioned tutorial definitions without evaluating declarative strings.
 * Public exports: validateName — validates an owner or step identifier;
 * validateRoute — validates a same-origin pathname;
 * validatePlay — validates and freezes a tutorial definition.
 * @example const play = validatePlay(definition);
 */
import { ACCESS_ROLES } from "../access-role.js";

const NAME_PATTERN = /^[a-z][a-z0-9.-]{0,79}$/;
const TARGET = /^[a-z][a-z0-9.-]{0,79}:[a-z][a-z0-9.-]{0,79}$/;
const EVENTS = new Set(["click", "change", "input", "submit", "keydown"]);
const assert = (allowed) => {
    if (!allowed) throw new TypeError("invalid_tutorial_definition");
};

/**
 * @param {string} value Owner, play, target or step name.
 * @returns {string} The validated name.
 */
export function validateName(value) {
    assert(typeof value === "string" && NAME_PATTERN.test(value));
    return value;
}

/**
 * @param {string} value Same-origin pathname.
 * @returns {string} The validated pathname.
 */
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

/**
 * @param {object} input Component-authored tutorial definition.
 * @returns {object} A frozen validated definition.
 */
export function validatePlay(input) {
    keys(input, [
        "version",
        "id",
        "titleKey",
        "page",
        "steps",
        "available",
        "requires",
        "automatic",
    ]);
    assert(input.version === 1);
    if (typeof input.page !== "function") validateRoute(input.page);
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
    assert(
        input.automatic === undefined || typeof input.automatic === "boolean",
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
            "suppressHover",
            "highlightNext",
            "layer",
            "popup",
            "group",
            "preventNavigation",
            "advance",
            "missing",
            "enter",
            "waitFor",
            "route",
            "minRole",
            "when",
            "dependsOn",
        ]);
        validateName(step.id);
        if (step.group !== undefined) validateName(step.group);
        assert(!ids.has(step.id));
        assert(
            step.minRole === undefined || ACCESS_ROLES.includes(step.minRole),
        );
        assert(step.when === undefined || typeof step.when === "function");
        assert(
            step.dependsOn === undefined ||
                (Array.isArray(step.dependsOn) &&
                    new Set(step.dependsOn).size === step.dependsOn.length &&
                    step.dependsOn.every((id) => ids.has(id))),
        );
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
                ["free", "target", "none"].includes(step.interaction),
        );
        assert(
            step.highlightNext === undefined ||
                typeof step.highlightNext === "boolean",
        );
        assert(
            step.suppressHover === undefined ||
                typeof step.suppressHover === "boolean",
        );
        assert(
            step.layer === undefined ||
                ["page", "overlay"].includes(step.layer),
        );
        assert(
            step.popup === undefined ||
                (typeof step.popup === "string" &&
                    step.popup.trim().length > 0),
        );
        assert(step.interaction !== "none" || !step.advance);
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
        assert(
            step.preventNavigation === undefined ||
                typeof step.preventNavigation === "boolean",
        );
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
            highlightNext: step.highlightNext ?? false,
            dependsOn: Object.freeze([...(step.dependsOn ?? [])]),
            interaction: step.interaction ?? (step.advance ? "target" : "none"),
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
