export function registerMeetingParticipantRoutes({
    router,
    requireAuth,
    profileStore,
    sendJson,
    sendError,
    hasMinRole,
    resolveShareGuestMeetingAccess,
}) {
    router.get(
        "/api/v1/modules/jitsi-meet/participants",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const requestUrl = new URL(req.url, "http://localhost");
            const meetingId = String(
                requestUrl.searchParams.get("meetingId") ?? "",
            ).trim();
            const shareGuestAccess = await resolveShareGuestMeetingAccess({
                claims,
                meetingId,
                requiredCapability: "participants:read",
            });
            if (shareGuestAccess.isGuest) {
                if (!meetingId) {
                    sendJson(res, 200, { data: [] });
                    return;
                }
                if (!shareGuestAccess.allowed) {
                    sendError(
                        res,
                        403,
                        "forbidden",
                        "Share guest access is not allowed for participants.",
                    );
                    return;
                }
                sendJson(res, 200, { data: [] });
                return;
            }
            const rawQuery = (requestUrl.searchParams.get("q") ?? "").trim();
            // Strip leading '@' and normalise case. The profile-store
            // searchProfiles() contract owns LIKE wildcard escaping for the
            // underlying DB dialect.
            const query = rawQuery.replace(/^@/, "").toLowerCase();
            const includeHidden = hasMinRole(claims.role, "admin");
            const candidates = await profileStore.searchProfiles(query, 50, {
                includeHidden,
                requesterAccountId: claims.sub,
            });
            const results = candidates
                .filter((profile) => profile.accountId !== claims.sub)
                .map((profile) => ({
                    handle: profile.handle,
                    displayName: profile.displayName ?? profile.handle,
                    avatarKey: profile.avatarKey ?? null,
                }));
            sendJson(res, 200, { data: results });
        },
        { access: { minRole: "user" } },
    );
}
