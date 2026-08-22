/** Provider-neutral Focus Control contracts. */
export const FOCUS_PRESENTATION_MODES = ["overlay", "fullscreen"] as const;
export const FOCUS_LIFECYCLE_STATUSES = [
    "starting",
    "active",
    "ending",
    "ended",
] as const;

export type FocusPresentationMode = (typeof FOCUS_PRESENTATION_MODES)[number];
export type FocusLifecycleStatus = (typeof FOCUS_LIFECYCLE_STATUSES)[number];
export type FocusSerializable =
    | null
    | boolean
    | number
    | string
    | FocusSerializable[]
    | { [key: string]: FocusSerializable };

export interface FocusLoaderDescriptor {
    kind: "route" | "module-route";
    routeId: string;
    moduleId?: string;
}

export interface FocusSurfaceDeclaration {
    id: string;
    pageId: string;
    labelKey: string;
    descriptionKey: string;
    loader: FocusLoaderDescriptor;
    modes: FocusPresentationMode[];
    synchronized: boolean;
    initialState?: FocusSerializable;
}

export interface FocusPermissions {
    start: boolean;
    update: boolean;
    transfer: boolean;
    end: boolean;
    dismiss?: boolean;
}

export interface FocusActor {
    id: string;
    displayName?: string;
}

export interface FocusSession {
    id: string;
    resourceId: string;
    surface: FocusSurfaceDeclaration;
    mode: FocusPresentationMode;
    state: FocusSerializable;
    revision: number;
    actor: FocusActor;
    controller: FocusActor;
    permissions: FocusPermissions;
    status: FocusLifecycleStatus;
    createdAt: string;
    updatedAt: string;
    endedAt?: string;
}

/** Implemented by a collaboration gateway; routes obtain it from route context. */
export interface FocusSessionProvider {
    get(resourceId: string, actor: FocusActor): Promise<FocusSession | null>;
    start(
        resourceId: string,
        actor: FocusActor,
        surface: FocusSurfaceDeclaration,
        mode: FocusPresentationMode,
        state: FocusSerializable,
    ): Promise<FocusSession>;
    update(
        resourceId: string,
        sessionId: string,
        expectedRevision: number,
        actor: FocusActor,
        state: FocusSerializable,
    ): Promise<FocusSession>;
    transfer(
        resourceId: string,
        sessionId: string,
        expectedRevision: number,
        actor: FocusActor,
        controller: FocusActor,
    ): Promise<FocusSession>;
    end(
        resourceId: string,
        sessionId: string,
        expectedRevision: number,
        actor: FocusActor,
    ): Promise<FocusSession>;
    subscribe(
        resourceId: string,
        actor: FocusActor,
        listener: (session: FocusSession) => void,
    ): () => void;
}

export const FOCUS_SESSION_CAPABILITY = "focus:session-provider";

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
export function assertFocusSurface(
    value: FocusSurfaceDeclaration,
    registeredRouteIds: ReadonlySet<string>,
): void {
    if (!value || !ID_PATTERN.test(value.id) || !ID_PATTERN.test(value.pageId))
        throw new TypeError("invalid_focus_surface_id");
    if (!value.labelKey || !value.descriptionKey)
        throw new TypeError("invalid_focus_localization");
    if (!value.loader || !registeredRouteIds.has(value.loader.routeId))
        throw new TypeError("unregistered_focus_route");
    if (
        !value.modes?.length ||
        value.modes.some((mode) => !FOCUS_PRESENTATION_MODES.includes(mode))
    )
        throw new TypeError("invalid_focus_mode");
    assertFocusState(value.initialState ?? null);
}

export function assertFocusState(
    value: unknown,
): asserts value is FocusSerializable {
    const pending: unknown[] = [value];
    const seen = new Set<object>();
    while (pending.length) {
        const current = pending.pop();
        if (["function", "symbol", "undefined"].includes(typeof current))
            throw new TypeError("focus_state_not_serializable");
        if (current && typeof current === "object") {
            if (seen.has(current))
                throw new TypeError("focus_state_not_serializable");
            seen.add(current);
            pending.push(...Object.values(current));
        }
    }
    let encoded: string | undefined;
    try {
        encoded = JSON.stringify(value);
    } catch {
        throw new TypeError("focus_state_not_serializable");
    }
    if (
        encoded === undefined ||
        /<\/?[a-z][\s\S]*>/i.test(encoded) ||
        encoded.length > 65_536
    ) {
        throw new TypeError("invalid_focus_state");
    }
}
