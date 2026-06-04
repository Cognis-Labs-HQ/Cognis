/**
 * Layout persistence helpers for page composer grid profiles.
 *
 * Public exports:
 *   createLayoutPersistence(deps) — returns helpers for selecting,
 *     loading, saving, and cloning grid-specific layouts.
 *
 * Usage:
 *   const persistence = createLayoutPersistence({ apiFetch });
 *
 * @param {object} deps
 * @returns {object}
 */
export function createLayoutPersistence({ apiFetch }) {
    function getLayoutProfileKey(gridColumnCount) {
        return `cols-${Math.max(1, Number(gridColumnCount) || 0)}`;
    }

    function parseLayoutProfileColumns(profileKey) {
        const match = /^cols-(\d+)$/.exec(profileKey);
        if (!match) return null;
        return Number.parseInt(match[1], 10);
    }

    function normalizeLayoutProfiles(rawLayout) {
        if (
            rawLayout &&
            typeof rawLayout === "object" &&
            !Array.isArray(rawLayout) &&
            rawLayout.layoutsByGrid &&
            typeof rawLayout.layoutsByGrid === "object" &&
            !Array.isArray(rawLayout.layoutsByGrid)
        ) {
            return {
                layoutsByGrid: { ...rawLayout.layoutsByGrid },
            };
        }
        return { layoutsByGrid: {} };
    }

    function getLayoutForGrid(rawLayout, gridColumnCount) {
        const normalized = normalizeLayoutProfiles(rawLayout);
        const profileKey = getLayoutProfileKey(gridColumnCount);
        const exactLayout = normalized.layoutsByGrid[profileKey];
        if (exactLayout) {
            return {
                layout: exactLayout,
                profiles: normalized,
            };
        }

        const availableKeys = Object.keys(normalized.layoutsByGrid);
        const targetCols = Math.max(1, Number(gridColumnCount) || 1);
        let nearestKey = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const key of availableKeys) {
            const keyCols = parseLayoutProfileColumns(key);
            if (!Number.isFinite(keyCols)) continue;
            const distance = Math.abs(keyCols - targetCols);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestKey = key;
            }
        }
        if (nearestKey) {
            return {
                layout: normalized.layoutsByGrid[nearestKey],
                profiles: normalized,
            };
        }

        if (
            rawLayout &&
            typeof rawLayout === "object" &&
            !Array.isArray(rawLayout)
        ) {
            return {
                layout: rawLayout,
                profiles: {
                    layoutsByGrid: {
                        [profileKey]: rawLayout,
                    },
                },
            };
        }

        return {
            layout: null,
            profiles: normalized,
        };
    }

    function setLayoutForGrid(profiles, gridColumnCount, nextLayout) {
        const normalized = normalizeLayoutProfiles(profiles);
        const profileKey = getLayoutProfileKey(gridColumnCount);
        normalized.layoutsByGrid[profileKey] = nextLayout;
        return normalized;
    }

    async function loadLayoutByKey(key, gridColumnCount) {
        const account = localStorage.getItem("cognis_account");
        const token = localStorage.getItem("cognis_access_token");
        if (!account || !token) {
            return { layout: null, profiles: { layoutsByGrid: {} } };
        }
        try {
            const response = await apiFetch(
                `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(key)}`,
            );
            if (!response.ok) {
                return { layout: null, profiles: { layoutsByGrid: {} } };
            }
            const payload = await response.json();
            const raw = payload?.data?.layoutJson;
            const parsed = raw ? JSON.parse(raw) : null;
            return getLayoutForGrid(parsed, gridColumnCount);
        } catch {
            return { layout: null, profiles: { layoutsByGrid: {} } };
        }
    }

    async function saveLayoutByKey(key, profiles, gridColumnCount, nextLayout) {
        const account = localStorage.getItem("cognis_account");
        const token = localStorage.getItem("cognis_access_token");
        if (!account || !token) {
            return normalizeLayoutProfiles(profiles);
        }
        const nextProfiles = setLayoutForGrid(
            profiles,
            gridColumnCount,
            nextLayout,
        );
        await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/preferences/${encodeURIComponent(key)}`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ layout: nextProfiles }),
            },
        );
        return nextProfiles;
    }

    async function loadLayout() {
        const loaded = await loadLayoutByKey(preferenceKey, gridCols);
        layoutProfiles = loaded.profiles;
        return cloneLayoutData(loaded.layout);
    }

    function hasStoredLayoutProfiles() {
        return Object.keys(layoutProfiles?.layoutsByGrid ?? {}).length > 0;
    }

    async function saveLayout() {
        layoutProfiles = await saveLayoutByKey(
            preferenceKey,
            layoutProfiles,
            gridCols,
            layout,
        );
    }

    function cloneLayoutData(layoutData) {
        return layoutData ? JSON.parse(JSON.stringify(layoutData)) : null;
    }

    return {
        getLayoutProfileKey,
        parseLayoutProfileColumns,
        normalizeLayoutProfiles,
        getLayoutForGrid,
        setLayoutForGrid,
        loadLayoutByKey,
        saveLayoutByKey,
        cloneLayoutData,
    };
}
