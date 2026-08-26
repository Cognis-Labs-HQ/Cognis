export async function resolveSourceToken(
    keyring,
    source,
    request,
    { promptWhenLocked = true } = {},
) {
    if (!source?.credentialId) return undefined;
    return keyring?.resolve(source.credentialId, {
        request,
        validate: (value) => Boolean(value.trim()),
        promptWhenLocked,
    });
}
