export function requirePublicEnvironment(
    environment: NodeJS.ProcessEnv = process.env,
): void {
    for (const variableName of ["EXTERNAL_HOST", "CONTACT_EMAIL"] as const) {
        if (!environment[variableName]?.trim()) {
            throw new Error(
                `${variableName} is required. Run ./setup.sh from the repository root to configure Cognis.`,
            );
        }
    }
}
