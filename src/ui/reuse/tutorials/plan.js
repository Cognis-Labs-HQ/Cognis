/**
 * Tracks the eligible path and interaction outcomes of one tutorial session.
 * Public export: createStepPlan — creates role-aware, dependency-aware planning.
 * @example const plan = createStepPlan(steps, { role: () => "admin", firstTime: true });
 */
import { hasMinAccessRole } from "../access-role.js";

/** @param {object[]} steps Validated steps. @param {object} options Session role and mode. @returns {object} Path queries and outcome operations. */
export function createStepPlan(steps, { role, firstTime }) {
    const completed = new Set();
    const skipped = new Set();
    const context = () =>
        Object.freeze({
            firstTime,
            completed: Object.freeze([...completed]),
            skipped: Object.freeze([...skipped]),
        });
    function eligible(index) {
        const step = steps[index];
        if (!step || (step.minRole && !hasMinAccessRole(role(), step.minRole)))
            return false;
        if (!step.dependsOn.every((id) => completed.has(id))) return false;
        if (!step.when) return true;
        const result = step.when(context());
        if (typeof result !== "boolean")
            throw new TypeError("invalid_tutorial_condition");
        return result;
    }
    const positions = new Map(steps.map((step, index) => [step.id, index]));
    function branchStart(index) {
        const step = steps[index];
        if (!step) return index;
        if (step.group) {
            while (index > 0 && steps[index - 1].group === step.group) index--;
            return index;
        }
        return step.dependsOn.reduce(
            (first, id) => Math.min(first, branchStart(positions.get(id))),
            index,
        );
    }
    const indices = () =>
        steps.flatMap((_, index) => (eligible(index) ? [index] : []));
    return {
        eligible,
        indices,
        previous(index) {
            const path = indices();
            const previous = path
                .filter((candidate) => candidate < index)
                .at(-1);
            if (previous === undefined) return undefined;
            const start = branchStart(previous);
            return start === branchStart(index)
                ? previous
                : path.find(
                      (candidate) =>
                          candidate >= start && candidate <= previous,
                  );
        },
        mark(index, interacted = false) {
            const step = steps[index];
            if (!step) return;
            const satisfied = interacted || (!step.advance && !step.waitFor);
            completed.delete(step.id);
            skipped.delete(step.id);
            (satisfied ? completed : skipped).add(step.id);
        },
        skip(index) {
            completed.delete(steps[index].id);
            skipped.add(steps[index].id);
        },
        rewind(index = 0) {
            for (const step of steps.slice(index)) {
                completed.delete(step.id);
                skipped.delete(step.id);
            }
        },
    };
}
