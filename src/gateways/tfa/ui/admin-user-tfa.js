export async function resetTfaForUser(apiFetch, username) {
    return apiFetch(
        `/api/v1/tfa/admin/users/${encodeURIComponent(username)}/reset`,
        {
            method: "POST",
        },
    );
}
