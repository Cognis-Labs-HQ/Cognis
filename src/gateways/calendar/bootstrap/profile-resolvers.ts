export interface CalendarProfileStore {
    getProfile?: (accountId: string) => Promise<{
        displayName?: string | null;
        handle?: string | null;
    } | null>;
    searchProfiles(
        query: string,
        limit?: number,
        options?: { includeHidden?: boolean },
    ): Promise<
        Array<{
            accountId: string;
            handle?: string | null;
            displayName?: string | null;
            avatarKey?: string | null;
        }>
    >;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;
}

export function createCalendarProfileResolvers(
    profileStore?: CalendarProfileStore,
) {
    const resolveAccountDisplayName = profileStore?.getProfile
        ? async (accountId: string) => {
              const profile = await profileStore.getProfile?.(accountId);
              return (
                  String(
                      profile?.displayName ?? profile?.handle ?? "",
                  ).trim() || accountId
              );
          }
        : null;
    const resolveShareableUsers = profileStore
        ? async (input: { ownerAccountId: string; query: string }) => {
              const query = input.query.trim();
              if (!query) return [];
              const candidates = await profileStore.searchProfiles(query, 25, {
                  includeHidden: false,
              });
              const permitted = await Promise.all(
                  candidates
                      .filter(
                          (entry) =>
                              String(entry.accountId ?? "") !==
                              input.ownerAccountId,
                      )
                      .map(async (entry) => {
                          const accountId = String(
                              entry.accountId ?? "",
                          ).trim();
                          if (!accountId) return null;
                          const relationships = await Promise.all([
                              profileStore.isFollowing(
                                  input.ownerAccountId,
                                  accountId,
                              ),
                              profileStore.isFollowing(
                                  accountId,
                                  input.ownerAccountId,
                              ),
                          ]);
                          if (!relationships.some(Boolean)) return null;
                          return {
                              accountId,
                              handle:
                                  typeof entry.handle === "string"
                                      ? entry.handle
                                      : null,
                              displayName:
                                  typeof entry.displayName === "string"
                                      ? entry.displayName
                                      : null,
                              avatarKey:
                                  typeof entry.avatarKey === "string"
                                      ? entry.avatarKey
                                      : null,
                          };
                      }),
              );
              return permitted.filter(Boolean);
          }
        : null;
    return { resolveAccountDisplayName, resolveShareableUsers };
}
