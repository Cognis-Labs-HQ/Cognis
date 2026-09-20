const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9]{2,}$/;
const ACCOUNT_NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

export function resolveSessionEmail(session: {
    email?: unknown;
    emails?: unknown;
}): string | undefined {
    const directEmail = String(session.email ?? "").trim();
    if (EMAIL_PATTERN.test(directEmail)) return directEmail;
    if (!Array.isArray(session.emails)) return undefined;
    return session.emails
        .map((email) => String(email).trim())
        .find((email) => EMAIL_PATTERN.test(email));
}

export function applyAccountCreationCredentials(
    session: {
        accountId: string;
        provider: string;
        email?: string;
        registrationToken?: string;
        [key: string]: unknown;
    },
    credentials: Record<string, unknown>,
) {
    const registrationToken = String(
        credentials.registrationToken ?? "",
    ).trim();
    const submittedEmail = String(credentials.email ?? "").trim();
    const existingEmail = resolveSessionEmail(session);
    return {
        ...session,
        ...(existingEmail || !submittedEmail ? {} : { email: submittedEmail }),
        ...(registrationToken ? { registrationToken } : {}),
    };
}

export function resolveSessionHandle(
    session: Record<string, unknown>,
): string | undefined {
    for (const candidate of [session.handle, session.username]) {
        const handle = String(candidate ?? "")
            .trim()
            .replace(/^@/, "");
        if (handle) return handle;
    }
    return undefined;
}

export function resolveExternalAccountNamespace(
    session: Record<string, unknown>,
    adapterId: string,
): string {
    const requestedNamespace = String(
        session.accountNamespace ?? session.provider ?? adapterId,
    )
        .trim()
        .toLowerCase();
    return ACCOUNT_NAMESPACE_PATTERN.test(requestedNamespace)
        ? requestedNamespace
        : adapterId.trim().toLowerCase();
}

export function resolveExternalAccountKey(
    session: Record<string, unknown>,
    adapterId: string,
): string {
    const providerNamespace = resolveExternalAccountNamespace(
        session,
        adapterId,
    );
    const proposedAccountId = String(session.accountId ?? "").trim();
    const handle = resolveSessionHandle(session);
    const normalizedCandidate = (handle ?? proposedAccountId).toLowerCase();
    const providerPrefix = `${providerNamespace}:`;
    const candidate = normalizedCandidate.startsWith(providerPrefix)
        ? normalizedCandidate.slice(providerPrefix.length)
        : normalizedCandidate;
    return `${providerNamespace}:${candidate}`;
}

export function resolveExternalProfileHandle(
    session: Record<string, unknown>,
    adapterId: string,
): string {
    return resolveExternalAccountKey(session, adapterId);
}
