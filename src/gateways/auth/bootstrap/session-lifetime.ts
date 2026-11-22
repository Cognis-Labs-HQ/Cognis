import { requireBootstrapScope, type Ctx } from "@cognis/core";

export function createSessionLifetime(root: Ctx): {
    capture(): number;
    isCurrent(expected: unknown): boolean;
    assertCurrent(expected: unknown): void;
} {
    let active = true;
    let revision = 0;
    const dispose = () => {
        active = false;
        revision += 1;
    };
    dispose.reactivate = () => {
        active = true;
        revision += 1;
    };
    requireBootstrapScope(root).registerDisposer(dispose);
    const isCurrent = (expected: unknown) => active && expected === revision;
    return {
        capture: () => revision,
        isCurrent,
        assertCurrent(expected) {
            if (!isCurrent(expected))
                throw new Error("session_operation_unavailable");
        },
    };
}
