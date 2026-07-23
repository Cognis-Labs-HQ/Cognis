export function registerAdminMeetingRoutes({
    router,
    store,
    requireAuth,
    sendJson,
    profileStore,
}) {
    async function withCreatorProfiles(meetings) {
        return Promise.all(
            meetings.map(async (meeting) => {
                const createdBy = String(meeting.createdBy ?? "").trim();
                const profile = createdBy
                    ? await profileStore
                          .getProfileByHandle(createdBy)
                          .catch(() => null)
                    : null;
                return {
                    ...meeting,
                    createdByDisplayName:
                        profile?.displayName ?? profile?.handle ?? createdBy,
                };
            }),
        );
    }

    router.get(
        "/api/v1/modules/jitsi-meet/admin/meetings",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const meetings = await store.listActiveMeetings();
            sendJson(res, 200, { data: meetings });
        },
        { access: { minRole: "admin" } },
    );

    router.get(
        "/api/v1/modules/jitsi-meet/admin/meetings/upcoming",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const meetings = await withCreatorProfiles(
                await store.listUpcomingMeetings(),
            );
            sendJson(res, 200, { data: meetings });
        },
        { access: { minRole: "admin" } },
    );
}
