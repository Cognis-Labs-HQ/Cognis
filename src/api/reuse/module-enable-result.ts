export interface ModuleEnableTestResult {
    ok?: boolean;
    code?: string;
    message?: string;
}

export function permitsModuleEnable(
    result: ModuleEnableTestResult | undefined,
): boolean {
    if (result?.ok !== false) return true;
    const failureCode =
        result.code ?? result.message?.split("\n", 1)[0]?.trim();
    return failureCode === "module_boundary_violation";
}
