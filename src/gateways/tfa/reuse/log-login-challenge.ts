type ChallengeLog = (
    level: "info" | "error",
    message: string,
    metadata?: Record<string, unknown>,
) => void;

export function logLoginChallenge(
    log: ChallengeLog | undefined,
    accountId: string,
    methodId: string,
    challenge: { ready: boolean; message?: string },
): void {
    log?.(
        challenge.ready ? "info" : "error",
        challenge.ready
            ? "TFA login challenge prepared."
            : "TFA login challenge unavailable.",
        {
            component: "tfa-gateway",
            operation: "prepare_login_challenge",
            accountId,
            methodId,
            ready: challenge.ready,
            reason: challenge.message,
        },
    );
}
