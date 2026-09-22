/**
 * Registers grouped sub-pages for feature-owned routing and navigation.
 *
 * Public exports:
 * - `createSubPageRegistry` — creates an isolated grouped page registry.
 *
 * @example
 * const registry = createSubPageRegistry();
 * registry.register('study', {
 *   listGroups: async () => [{ id: 'ja', label: '日本語' }],
 *   listPages: async () => [{ id: 'alphabet', pageUrl: '/study/alphabet' }],
 * });
 * const model = await registry.load('study', { selectedGroupId: 'ja' });
 *
 * @returns {{
 *   register: (id: string, provider: object) => boolean,
 *   unregister: (id: string) => boolean,
 *   load: (id: string, options?: {selectedGroupId?: string, groupIds?: string[]}) => Promise<object>,
 *   resolve: (id: string, path: string) => Promise<object|null>,
 *   invalidate: (id?: string) => void,
 * }} Grouped sub-page registry.
 */
export function createSubPageRegistry() {
    const providers = new Map();
    const groupPromises = new Map();
    const pagePromises = new Map();

    function register(id, provider) {
        const providerId = String(id ?? "").trim();
        if (
            !providerId ||
            providers.has(providerId) ||
            typeof provider?.listGroups !== "function" ||
            typeof provider?.listPages !== "function"
        ) {
            return false;
        }
        providers.set(providerId, provider);
        return true;
    }

    function unregister(id) {
        const providerId = String(id ?? "").trim();
        invalidate(providerId);
        return providers.delete(providerId);
    }

    function loadGroups(providerId, provider) {
        if (!groupPromises.has(providerId)) {
            groupPromises.set(
                providerId,
                Promise.resolve(provider.listGroups()).then((groups) =>
                    Array.isArray(groups) ? groups : [],
                ),
            );
        }
        return groupPromises.get(providerId);
    }

    function loadPages(providerId, provider, groupId) {
        const cacheKey = `${providerId}:${groupId}`;
        if (!pagePromises.has(cacheKey)) {
            pagePromises.set(
                cacheKey,
                Promise.resolve(provider.listPages(groupId)).then((pages) =>
                    Array.isArray(pages) ? pages : [],
                ),
            );
        }
        return pagePromises.get(cacheKey);
    }

    async function load(id, { selectedGroupId, groupIds } = {}) {
        const providerId = String(id ?? "").trim();
        const provider = providers.get(providerId);
        if (!provider)
            throw new Error(
                `Sub-page provider "${providerId}" is unavailable.`,
            );
        const groups = await loadGroups(providerId, provider);
        const requestedGroupIds = Array.isArray(groupIds)
            ? groupIds.map(String)
            : groups.map((group) => String(group?.id ?? "")).filter(Boolean);
        const normalizedSelectedGroupId = String(selectedGroupId ?? "").trim();
        if (
            normalizedSelectedGroupId &&
            !requestedGroupIds.includes(normalizedSelectedGroupId)
        ) {
            requestedGroupIds.push(normalizedSelectedGroupId);
        }
        const pagesByGroup = new Map(
            await Promise.all(
                requestedGroupIds.map(async (groupId) => [
                    groupId,
                    await loadPages(providerId, provider, groupId),
                ]),
            ),
        );
        return {
            groups,
            selectedGroupId: normalizedSelectedGroupId || requestedGroupIds[0],
            pagesByGroup,
            pages:
                pagesByGroup.get(
                    normalizedSelectedGroupId || requestedGroupIds[0],
                ) ?? [],
        };
    }

    async function resolve(id, path) {
        const model = await load(id);
        const normalizedPath = String(path ?? "")
            .split("?")[0]
            .split("#")[0];
        for (const [groupId, pages] of model.pagesByGroup) {
            const page = pages.find(
                (candidate) =>
                    String(candidate?.pageUrl ?? "") === normalizedPath,
            );
            if (page) return { groupId, page };
        }
        return null;
    }

    function invalidate(id) {
        const providerId = String(id ?? "").trim();
        if (!providerId) {
            groupPromises.clear();
            pagePromises.clear();
            return;
        }
        groupPromises.delete(providerId);
        for (const cacheKey of pagePromises.keys()) {
            if (cacheKey.startsWith(`${providerId}:`)) {
                pagePromises.delete(cacheKey);
            }
        }
    }

    return { register, unregister, load, resolve, invalidate };
}
