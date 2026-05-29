import { randomBytes, randomUUID } from "node:crypto";
import { normalizeCalendarColor } from "../color.js";
import type { CalendarStore } from "../calendar-store.js";
import { ResponseTracker } from "./response-tracker.js";
import {
    normalizeAttendeeList,
    normalizeEventRecurrence,
    normalizeEventResponse,
    normalizeEventStatus,
    normalizeInviteEmails,
    shiftDateByRecurrence,
    type CaldavTokenRecord,
    type CalendarAdapter,
    type CalendarAdapterInfo,
    type CalendarBootstrapBaseCtx,
    type CalendarEventRecord,
    type CalendarEventRecurrence,
    type CalendarEventResponse,
    type CalendarEventResponseRecord,
    type CalendarEventStatus,
    type CalendarRecord,
    type CalendarVisibility,
    type ScopedMeetingAccessTokenRecord,
} from "./utils.js";
import { createEventSeries } from "./event-series.js";
import {
    bootstrapAdapters as bootstrapCalendarAdapters,
    discoverAdapters as discoverCalendarAdapters,
    exportCalendarAsIcs as buildCalendarIcs,
    importIcs as importCalendarIcs,
} from "./adapter-helpers.js";

export class CoreCalendarGateway {
    private readonly calendarsById = new Map<string, CalendarRecord>();
    private readonly calendarIdsByOwner = new Map<string, Set<string>>();
    private readonly eventsByCalendar = new Map<
        string,
        CalendarEventRecord[]
    >();
    private readonly tokensByValue = new Map<string, CaldavTokenRecord>();
    private readonly scopedMeetingTokensByValue = new Map<
        string,
        ScopedMeetingAccessTokenRecord
    >();
    private readonly registeredAdapters = new Map<string, CalendarAdapter>();
    private readonly adapterRequires = new Map<string, string[]>();
    private readonly disabledAdapters = new Set<string>();
    private readonly responsesByRootEvent = new Map<
        string,
        Map<string, CalendarEventResponseRecord>
    >();
    private store: CalendarStore | null = null;
    private storeWriteQueue: Promise<void> = Promise.resolve();
    private storeWriteError: Error | null = null;

    async attachStore(store: CalendarStore): Promise<void> {
        this.store = store;
        const [calendars, events, responses] = await Promise.all([
            store.listCalendars(),
            store.listEvents(),
            store.listResponses(),
        ]);
        this.calendarsById.clear();
        this.calendarIdsByOwner.clear();
        this.eventsByCalendar.clear();
        this.responsesByRootEvent.clear();
        for (const calendar of calendars) {
            this.upsertCalendarRecord(calendar);
        }
        for (const event of events) {
            this.upsertEventRecord({
                ...event,
                attendees: normalizeAttendeeList(event.attendees),
                inviteEmails: normalizeInviteEmails(event.inviteEmails),
                status: normalizeEventStatus(event.status),
                recurrence: normalizeEventRecurrence(event.recurrence),
                responses: {},
            });
        }
        for (const response of responses) {
            this.setResponseRecord(response);
        }
        for (const eventsForCalendar of this.eventsByCalendar.values()) {
            for (const event of eventsForCalendar) {
                this.refreshEventResponses(event);
            }
        }
    }

    async flushStore(): Promise<void> {
        await this.storeWriteQueue;
        if (!this.storeWriteError) return;
        const error = this.storeWriteError;
        this.storeWriteError = null;
        throw error;
    }

    registerAdapter(adapter: CalendarAdapter, requires?: string[]): void {
        this.registeredAdapters.set(adapter.adapterId, adapter);
        const effectiveRequires = requires ?? adapter.requires;
        if (effectiveRequires && effectiveRequires.length > 0) {
            this.adapterRequires.set(adapter.adapterId, effectiveRequires);
        }
    }

    listAdapters(): CalendarAdapterInfo[] {
        return Array.from(this.registeredAdapters.values()).map((adapter) => {
            const requires = this.adapterRequires.get(adapter.adapterId);
            return {
                id: adapter.adapterId,
                name: adapter.adapterName,
                active:
                    !this.disabledAdapters.has(adapter.adapterId) &&
                    (typeof adapter.isConfigured === "function"
                        ? adapter.isConfigured()
                        : true),
                ...(requires?.length ? { requires } : {}),
            };
        });
    }

    isAdapterEnabled(adapterId: string): boolean {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter || this.disabledAdapters.has(adapterId)) return false;
        if (typeof adapter.isConfigured === "function") {
            return adapter.isConfigured();
        }
        return true;
    }

    getAdapter(adapterId: string): CalendarAdapter | undefined {
        return this.registeredAdapters.get(adapterId);
    }

    getAdapterConfig(adapterId: string): Record<string, unknown> | null {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter) return null;
        return {
            ...(typeof adapter.getConfig === "function"
                ? adapter.getConfig()
                : {}),
            enabled: !this.disabledAdapters.has(adapterId),
        };
    }

    async saveAdapterConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter) return;
        const { enabled, ...adapterConfig } = config;
        if (enabled === false || enabled === "false") {
            this.disabledAdapters.add(adapterId);
        } else {
            this.disabledAdapters.delete(adapterId);
        }
        if (typeof adapter.setConfig === "function") {
            adapter.setConfig(adapterConfig);
        }
    }

    async enableAdapter(adapterId: string): Promise<void> {
        this.disabledAdapters.delete(adapterId);
    }

    async disableAdapter(adapterId: string): Promise<void> {
        this.disabledAdapters.add(adapterId);
    }

    createCalendar(input: {
        ownerAccountId: string;
        name: string;
        visibility?: CalendarVisibility;
        color?: string;
        isDefault?: boolean;
    }): CalendarRecord {
        const now = new Date().toISOString();
        const normalizedName = String(input.name ?? "").trim();
        if (!normalizedName) {
            throw new Error("calendar_name_required");
        }
        if (input.isDefault === true) {
            for (const calendarId of this.calendarIdsByOwner.get(
                input.ownerAccountId,
            ) ?? []) {
                const calendar = this.calendarsById.get(calendarId);
                if (!calendar?.isDefault) continue;
                calendar.isDefault = false;
                calendar.updatedAt = now;
                this.upsertCalendarRecord(calendar);
                this.scheduleStoreWrite(() =>
                    this.store?.saveCalendar(calendar),
                );
            }
        }
        const calendar: CalendarRecord = {
            id: randomUUID(),
            ownerAccountId: input.ownerAccountId,
            name: normalizedName,
            visibility: input.visibility ?? "private",
            color: normalizeCalendarColor(input.color),
            isDefault: input.isDefault === true,
            createdAt: now,
            updatedAt: now,
        };
        this.upsertCalendarRecord(calendar);
        this.scheduleStoreWrite(() => this.store?.saveCalendar(calendar));
        return calendar;
    }

    ensureDefaultCalendar(ownerAccountId: string): CalendarRecord {
        const existingDefault = Array.from(
            this.calendarIdsByOwner.get(ownerAccountId) ?? [],
        )
            .map((calendarId) => this.calendarsById.get(calendarId))
            .find((calendar): calendar is CalendarRecord =>
                Boolean(calendar?.isDefault),
            );
        if (existingDefault) return existingDefault;
        return this.createCalendar({
            ownerAccountId,
            name: "Default",
            visibility: "private",
            isDefault: true,
        });
    }

    ensureSpecialCalendar(
        ownerAccountId: string,
        name: string,
        color?: string,
    ): CalendarRecord {
        this.ensureDefaultCalendar(ownerAccountId);
        const normalizedName = String(name ?? "")
            .trim()
            .toLowerCase();
        const existingCalendar = Array.from(
            this.calendarIdsByOwner.get(ownerAccountId) ?? [],
        )
            .map((calendarId) => this.calendarsById.get(calendarId))
            .find(
                (calendar): calendar is CalendarRecord =>
                    Boolean(calendar) &&
                    calendar.name.trim().toLowerCase() === normalizedName,
            );
        if (existingCalendar) return existingCalendar;
        return this.createCalendar({
            ownerAccountId,
            name: String(name ?? "").trim() || "Special",
            visibility: "private",
            color,
        });
    }

    listCalendars(ownerAccountId: string): CalendarRecord[] {
        if (!this.calendarIdsByOwner.has(ownerAccountId)) {
            this.ensureDefaultCalendar(ownerAccountId);
        }
        return Array.from(this.calendarIdsByOwner.get(ownerAccountId) ?? [])
            .map((calendarId) => this.calendarsById.get(calendarId))
            .filter((calendar): calendar is CalendarRecord => Boolean(calendar))
            .sort((leftCalendar, rightCalendar) => {
                if (leftCalendar.isDefault !== rightCalendar.isDefault) {
                    return leftCalendar.isDefault ? -1 : 1;
                }
                return leftCalendar.createdAt.localeCompare(
                    rightCalendar.createdAt,
                );
            });
    }

    getCalendar(calendarId: string): CalendarRecord | null {
        return this.calendarsById.get(calendarId) ?? null;
    }

    getOwnedCalendar(
        ownerAccountId: string,
        calendarId: string,
    ): CalendarRecord | null {
        const calendar = this.getCalendar(calendarId);
        if (!calendar || calendar.ownerAccountId !== ownerAccountId) {
            return null;
        }
        return calendar;
    }

    deleteCalendar(input: {
        ownerAccountId: string;
        calendarId: string;
    }): void {
        const calendar = this.getOwnedCalendar(
            input.ownerAccountId,
            input.calendarId,
        );
        if (!calendar) {
            throw new Error("calendar_not_found");
        }
        if (calendar.isDefault) {
            throw new Error("calendar_default_locked");
        }
        for (const event of this.listEvents(calendar.id)) {
            this.deleteEvent({
                ownerAccountId: input.ownerAccountId,
                calendarId: calendar.id,
                eventId: event.id,
            });
        }
        this.calendarsById.delete(calendar.id);
        this.calendarIdsByOwner
            .get(calendar.ownerAccountId)
            ?.delete(calendar.id);
        this.scheduleStoreWrite(() => this.store?.deleteCalendar(calendar.id));
    }

    addEvent(input: {
        ownerAccountId: string;
        calendarId: string;
        title: string;
        description?: string | null;
        startAt: string;
        endAt: string;
        attendees?: string[];
        inviteEmails?: string[];
        meetingUrl?: string | null;
        status?: CalendarEventStatus;
        recurrence?: CalendarEventRecurrence;
    }): CalendarEventRecord {
        const calendar = this.getOwnedCalendar(
            input.ownerAccountId,
            input.calendarId,
        );
        if (!calendar) {
            throw new Error("calendar_not_found");
        }
        return this.addEventToCalendar({
            calendarId: calendar.id,
            title: input.title,
            description: input.description,
            startAt: input.startAt,
            endAt: input.endAt,
            createdBy: input.ownerAccountId,
            attendees: this.enforceOwnerAttendance(
                input.ownerAccountId,
                input.attendees,
            ),
            inviteEmails: input.inviteEmails,
            meetingUrl: input.meetingUrl,
            status: input.status,
            recurrence: input.recurrence,
        });
    }

    addEventToCalendar(input: {
        calendarId: string;
        sourceEventId?: string | null;
        title: string;
        description?: string | null;
        startAt: string;
        endAt: string;
        createdBy: string;
        attendees?: string[];
        inviteEmails?: string[];
        meetingUrl?: string | null;
        status?: CalendarEventStatus;
        recurrence?: CalendarEventRecurrence;
        recurrenceId?: string | null;
        forceSingle?: boolean;
    }): CalendarEventRecord {
        if (!this.calendarsById.has(input.calendarId)) {
            throw new Error("calendar_not_found");
        }
        const events = createEventSeries(input);
        for (const event of events) {
            this.insertEventIntoCalendar(event);
        }
        return events[0];
    }

    listEvents(calendarId: string): CalendarEventRecord[] {
        return [...(this.eventsByCalendar.get(calendarId) ?? [])].sort(
            (leftEvent, rightEvent) =>
                leftEvent.startAt.localeCompare(rightEvent.startAt),
        );
    }

    listMirroredEvents(sourceEventId: string): CalendarEventRecord[] {
        return Array.from(this.eventsByCalendar.values())
            .flatMap((events) => events)
            .filter((event) => event.sourceEventId === sourceEventId)
            .sort((leftEvent, rightEvent) =>
                leftEvent.startAt.localeCompare(rightEvent.startAt),
            );
    }

    getEvent(calendarId: string, eventId: string): CalendarEventRecord | null {
        return (
            this.eventsByCalendar
                .get(calendarId)
                ?.find((event) => event.id === eventId) ?? null
        );
    }

    getOwnedEvent(
        ownerAccountId: string,
        calendarId: string,
        eventId: string,
    ): CalendarEventRecord | null {
        const calendar = this.getOwnedCalendar(ownerAccountId, calendarId);
        if (!calendar) return null;
        return this.getEvent(calendar.id, eventId);
    }

    updateEvent(input: {
        ownerAccountId: string;
        calendarId: string;
        eventId: string;
        targetCalendarId?: string;
        title?: string;
        description?: string | null;
        startAt?: string;
        endAt?: string;
        attendees?: string[];
        inviteEmails?: string[];
        meetingUrl?: string | null;
        status?: CalendarEventStatus;
        recurrence?: CalendarEventRecurrence;
        updateAll?: boolean;
    }): CalendarEventRecord {
        const event = this.getOwnedEvent(
            input.ownerAccountId,
            input.calendarId,
            input.eventId,
        );
        if (!event) {
            throw new Error("calendar_event_not_found");
        }
        const targetCalendarId =
            typeof input.targetCalendarId === "string" &&
            input.targetCalendarId.trim()
                ? input.targetCalendarId.trim()
                : event.calendarId;
        const targetCalendar = this.getOwnedCalendar(
            input.ownerAccountId,
            targetCalendarId,
        );
        if (!targetCalendar) {
            throw new Error("calendar_not_found");
        }
        const updateSeries =
            input.updateAll === true &&
            Boolean(event.recurrenceId) &&
            event.sourceEventId === null;
        const targetEvents =
            updateSeries && event.recurrenceId
                ? this.getEventsByRecurrenceId(event.recurrenceId)
                : [event];
        const nextTitle =
            input.title === undefined
                ? event.title
                : String(input.title).trim();
        const nextDescription =
            input.description === undefined
                ? event.description
                : typeof input.description === "string" &&
                    input.description.trim().length > 0
                  ? input.description
                  : null;
        const nextAttendees = this.enforceOwnerAttendance(
            input.ownerAccountId,
            input.attendees === undefined ? event.attendees : input.attendees,
        );
        const nextInviteEmails =
            input.inviteEmails === undefined
                ? [...event.inviteEmails]
                : normalizeInviteEmails(input.inviteEmails);
        const nextMeetingUrl =
            input.meetingUrl === undefined
                ? event.meetingUrl
                : typeof input.meetingUrl === "string" &&
                    /^https?:\/\//i.test(input.meetingUrl.trim())
                  ? input.meetingUrl.trim()
                  : null;
        const nextStatus =
            input.status === undefined
                ? event.status
                : normalizeEventStatus(input.status);
        const nextRecurrence =
            input.recurrence === undefined
                ? event.recurrence
                : normalizeEventRecurrence(input.recurrence);
        const baseStartIso =
            input.startAt === undefined
                ? event.startAt
                : new Date(input.startAt).toISOString();
        const baseEndIso =
            input.endAt === undefined
                ? event.endAt
                : new Date(input.endAt).toISOString();
        if (
            new Date(baseEndIso).getTime() <= new Date(baseStartIso).getTime()
        ) {
            throw new Error("calendar_invalid_range");
        }
        for (
            let eventIndex = 0;
            eventIndex < targetEvents.length;
            eventIndex += 1
        ) {
            const targetEvent = targetEvents[eventIndex];
            const previousCalendarId = targetEvent.calendarId;
            targetEvent.calendarId = targetCalendar.id;
            targetEvent.title = nextTitle;
            targetEvent.description = nextDescription;
            targetEvent.startAt =
                updateSeries && eventIndex > 0
                    ? shiftDateByRecurrence(
                          baseStartIso,
                          nextRecurrence,
                          eventIndex,
                      )
                    : targetEvent.id === event.id || !updateSeries
                      ? baseStartIso
                      : targetEvent.startAt;
            targetEvent.endAt =
                updateSeries && eventIndex > 0
                    ? shiftDateByRecurrence(
                          baseEndIso,
                          nextRecurrence,
                          eventIndex,
                      )
                    : targetEvent.id === event.id || !updateSeries
                      ? baseEndIso
                      : targetEvent.endAt;
            targetEvent.attendees = [...nextAttendees];
            targetEvent.inviteEmails = [...nextInviteEmails];
            targetEvent.meetingUrl = nextMeetingUrl;
            targetEvent.status = nextStatus;
            targetEvent.recurrence = nextRecurrence;
            targetEvent.updatedAt = new Date().toISOString();
            this.moveEventRecord(previousCalendarId, targetEvent);
        }
        for (const targetEvent of targetEvents) {
            this.syncResponsesForAttendees(
                this.getResponseRootEventId(targetEvent),
                nextAttendees,
            );
            this.refreshEventResponses(targetEvent);
            this.scheduleStoreWrite(() => this.store?.saveEvent(targetEvent));
            for (const mirroredEvent of this.listMirroredEvents(
                targetEvent.id,
            )) {
                mirroredEvent.title = targetEvent.title;
                mirroredEvent.description = targetEvent.description;
                mirroredEvent.startAt = targetEvent.startAt;
                mirroredEvent.endAt = targetEvent.endAt;
                mirroredEvent.attendees = [...targetEvent.attendees];
                mirroredEvent.inviteEmails = [...targetEvent.inviteEmails];
                mirroredEvent.meetingUrl = targetEvent.meetingUrl;
                mirroredEvent.status = targetEvent.status;
                mirroredEvent.recurrence = targetEvent.recurrence;
                mirroredEvent.recurrenceId = targetEvent.recurrenceId;
                mirroredEvent.updatedAt = targetEvent.updatedAt;
                this.refreshEventResponses(mirroredEvent);
                this.scheduleStoreWrite(() =>
                    this.store?.saveEvent(mirroredEvent),
                );
            }
        }
        return this.getEvent(targetCalendar.id, event.id) ?? event;
    }

    deleteEvent(input: {
        ownerAccountId: string;
        calendarId: string;
        eventId: string;
        deleteAll?: boolean;
    }): CalendarEventRecord[] {
        const event = this.getOwnedEvent(
            input.ownerAccountId,
            input.calendarId,
            input.eventId,
        );
        if (!event) {
            throw new Error("calendar_event_not_found");
        }
        const targetEvents =
            input.deleteAll === true &&
            event.recurrenceId &&
            event.sourceEventId === null
                ? this.getEventsByRecurrenceId(event.recurrenceId)
                      .filter(
                          (seriesEvent) =>
                              seriesEvent.startAt >= event.startAt,
                      )
                : [event];
        const deletedEvents: CalendarEventRecord[] = [];
        for (const targetEvent of targetEvents) {
            deletedEvents.push({ ...targetEvent });
            for (const mirroredEvent of this.listMirroredEvents(
                targetEvent.id,
            )) {
                this.removeEventRecord(mirroredEvent);
                this.scheduleStoreWrite(() =>
                    this.store?.deleteEvent(mirroredEvent.id),
                );
            }
            this.removeEventRecord(targetEvent);
            if (targetEvent.sourceEventId === null) {
                this.responsesByRootEvent.delete(targetEvent.id);
                this.scheduleStoreWrite(() =>
                    this.store?.deleteResponsesForRootEvent(targetEvent.id),
                );
            }
            this.scheduleStoreWrite(() =>
                this.store?.deleteEvent(targetEvent.id),
            );
        }
        return deletedEvents;
    }

    getEventResponse(
        eventId: string,
        accountId: string,
    ): CalendarEventResponse | null {
        const matchingEvent = Array.from(this.eventsByCalendar.values())
            .flatMap((events) => events)
            .find(
                (event) =>
                    event.id === eventId || event.sourceEventId === eventId,
            );
        if (!matchingEvent) return null;
        const rootEventId = this.getResponseRootEventId(matchingEvent);
        const directResponse =
            this.responsesByRootEvent.get(rootEventId)?.get(accountId)
                ?.response ?? null;
        if (directResponse) return directResponse;
        return matchingEvent.attendees.includes(accountId) ? "pending" : null;
    }

    setEventResponse(input: {
        eventId: string;
        accountId: string;
        response: CalendarEventResponse;
        respondAll?: boolean;
    }): CalendarEventResponseRecord {
        const event = Array.from(this.eventsByCalendar.values())
            .flatMap((events) => events)
            .find(
                (entry) =>
                    entry.id === input.eventId ||
                    entry.sourceEventId === input.eventId,
            );
        if (!event) {
            throw new Error("calendar_event_not_found");
        }
        if (!event.attendees.includes(input.accountId)) {
            throw new Error("calendar_response_forbidden");
        }
        const rootEventId = this.getResponseRootEventId(event);
        const response = normalizeEventResponse(input.response);
        const targetRootEventIds = new Set<string>();
        if (input.respondAll === true && event.recurrenceId) {
            for (const relatedEvent of this.getAllEventsByRecurrenceId(
                event.recurrenceId,
            )) {
                if (!relatedEvent.attendees.includes(input.accountId)) continue;
                targetRootEventIds.add(this.getResponseRootEventId(relatedEvent));
            }
        }
        if (targetRootEventIds.size === 0) {
            targetRootEventIds.add(rootEventId);
        }
        const now = new Date().toISOString();
        let selectedRecord: CalendarEventResponseRecord | null = null;
        for (const targetRootEventId of targetRootEventIds) {
            const existingRecord = this.responsesByRootEvent
                .get(targetRootEventId)
                ?.get(input.accountId);
            const record: CalendarEventResponseRecord = {
                rootEventId: targetRootEventId,
                accountId: input.accountId,
                response,
                createdAt: existingRecord?.createdAt ?? now,
                updatedAt: now,
            };
            this.setResponseRecord(record);
            this.refreshResponsesForRootEvent(targetRootEventId);
            this.scheduleStoreWrite(() => this.store?.saveResponse(record));
            if (targetRootEventId === rootEventId) {
                selectedRecord = record;
            }
        }
        return (
            selectedRecord ?? {
                rootEventId,
                accountId: input.accountId,
                response,
                createdAt: now,
                updatedAt: now,
            }
        );
    }

    issuePrivateExportToken(input: {
        ownerAccountId: string;
        calendarId: string;
        ttlSeconds?: number;
    }): CaldavTokenRecord {
        const calendar = this.getOwnedCalendar(
            input.ownerAccountId,
            input.calendarId,
        );
        if (!calendar) {
            throw new Error("calendar_not_found");
        }
        const token: CaldavTokenRecord = {
            token: randomBytes(24).toString("hex"),
            ownerAccountId: input.ownerAccountId,
            calendarId: input.calendarId,
            expiresAt: new Date(
                Date.now() + (input.ttlSeconds ?? 3600) * 1000,
            ).toISOString(),
        };
        this.tokensByValue.set(token.token, token);
        return token;
    }

    resolvePrivateExportToken(tokenValue: string): CaldavTokenRecord | null {
        const token = this.tokensByValue.get(tokenValue) ?? null;
        if (!token) return null;
        if (new Date(token.expiresAt).getTime() <= Date.now()) {
            this.tokensByValue.delete(tokenValue);
            return null;
        }
        return token;
    }

    issueScopedMeetingAccessToken(input: {
        targetUrl: string;
        createdByAccountId: string;
        eventId?: string | null;
        ttlSeconds?: number;
    }): ScopedMeetingAccessTokenRecord {
        const token: ScopedMeetingAccessTokenRecord = {
            token: randomBytes(24).toString("hex"),
            targetUrl: input.targetUrl,
            createdByAccountId: input.createdByAccountId,
            eventId: input.eventId ?? null,
            expiresAt: new Date(
                Date.now() + (input.ttlSeconds ?? 900) * 1000,
            ).toISOString(),
        };
        this.scopedMeetingTokensByValue.set(token.token, token);
        return token;
    }

    consumeScopedMeetingAccessToken(
        tokenValue: string,
    ): ScopedMeetingAccessTokenRecord | null {
        const token = this.scopedMeetingTokensByValue.get(tokenValue) ?? null;
        if (!token) return null;
        this.scopedMeetingTokensByValue.delete(tokenValue);
        if (new Date(token.expiresAt).getTime() <= Date.now()) {
            return null;
        }
        return token;
    }

    exportCalendarAsIcs(calendarId: string): string {
        return buildCalendarIcs(this, calendarId);
    }

    importIcs(input: {
        ownerAccountId: string;
        calendarId: string;
        ics: string;
    }): { importedCount: number } {
        return importCalendarIcs(this, input);
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        await discoverCalendarAdapters(this, adaptersRoot);
    }

    async bootstrapAdapters(
        adaptersRoot: string,
        baseCtx: CalendarBootstrapBaseCtx,
    ): Promise<void> {
        await bootstrapCalendarAdapters(this, adaptersRoot, baseCtx);
    }

    private insertEventIntoCalendar(event: CalendarEventRecord): void {
        this.upsertEventRecord(event);
        this.syncResponsesForAttendees(
            this.getResponseRootEventId(event),
            event.attendees,
        );
        this.refreshEventResponses(event);
        this.scheduleStoreWrite(async () => {
            await this.store?.saveEvent(event);
            for (const attendee of event.attendees) {
                const response = this.responsesByRootEvent
                    .get(this.getResponseRootEventId(event))
                    ?.get(attendee);
                if (response) {
                    await this.store?.saveResponse(response);
                }
            }
        });
    }

    private upsertCalendarRecord(calendar: CalendarRecord): void {
        this.calendarsById.set(calendar.id, calendar);
        const ownerCalendars =
            this.calendarIdsByOwner.get(calendar.ownerAccountId) ?? new Set();
        ownerCalendars.add(calendar.id);
        this.calendarIdsByOwner.set(calendar.ownerAccountId, ownerCalendars);
    }

    private upsertEventRecord(event: CalendarEventRecord): void {
        const existingEvents =
            this.eventsByCalendar.get(event.calendarId) ?? [];
        const nextEvents = existingEvents.filter(
            (existingEvent) => existingEvent.id !== event.id,
        );
        nextEvents.push(event);
        nextEvents.sort((leftEvent, rightEvent) =>
            leftEvent.startAt.localeCompare(rightEvent.startAt),
        );
        this.eventsByCalendar.set(event.calendarId, nextEvents);
    }

    private removeEventRecord(event: CalendarEventRecord): void {
        const existingEvents =
            this.eventsByCalendar.get(event.calendarId) ?? [];
        const nextEvents = existingEvents.filter(
            (existingEvent) => existingEvent.id !== event.id,
        );
        if (nextEvents.length > 0) {
            this.eventsByCalendar.set(event.calendarId, nextEvents);
        } else {
            this.eventsByCalendar.delete(event.calendarId);
        }
    }

    private moveEventRecord(
        previousCalendarId: string,
        event: CalendarEventRecord,
    ): void {
        if (previousCalendarId !== event.calendarId) {
            const previousEvents =
                this.eventsByCalendar.get(previousCalendarId) ?? [];
            const remainingEvents = previousEvents.filter(
                (existingEvent) => existingEvent.id !== event.id,
            );
            if (remainingEvents.length > 0) {
                this.eventsByCalendar.set(previousCalendarId, remainingEvents);
            } else {
                this.eventsByCalendar.delete(previousCalendarId);
            }
        }
        this.upsertEventRecord(event);
    }

    private getEventsByRecurrenceId(
        recurrenceId: string,
    ): CalendarEventRecord[] {
        return Array.from(this.eventsByCalendar.values())
            .flatMap((events) => events)
            .filter(
                (event) =>
                    event.recurrenceId === recurrenceId &&
                    event.sourceEventId === null,
            )
            .sort((leftEvent, rightEvent) =>
                leftEvent.startAt.localeCompare(rightEvent.startAt),
            );
    }

    private getAllEventsByRecurrenceId(
        recurrenceId: string,
    ): CalendarEventRecord[] {
        return Array.from(this.eventsByCalendar.values())
            .flatMap((events) => events)
            .filter((event) => event.recurrenceId === recurrenceId)
            .sort((leftEvent, rightEvent) =>
                leftEvent.startAt.localeCompare(rightEvent.startAt),
            );
    }

    private getResponseRootEventId(event: CalendarEventRecord): string {
        return event.sourceEventId ?? event.id;
    }

    private refreshEventResponses(event: CalendarEventRecord): void {
        const rootEventId = this.getResponseRootEventId(event);
        const responseRecords = this.responsesByRootEvent.get(rootEventId);
        const responses: Record<string, CalendarEventResponse> = {};
        for (const attendee of event.attendees) {
            responses[attendee] =
                responseRecords?.get(attendee)?.response ?? "pending";
        }
        event.responses = responses;
    }

    private refreshResponsesForRootEvent(rootEventId: string): void {
        for (const events of this.eventsByCalendar.values()) {
            for (const event of events) {
                if (this.getResponseRootEventId(event) !== rootEventId)
                    continue;
                this.refreshEventResponses(event);
            }
        }
    }

    private setResponseRecord(record: CalendarEventResponseRecord): void {
        const rootResponses =
            this.responsesByRootEvent.get(record.rootEventId) ?? new Map();
        rootResponses.set(record.accountId, record);
        this.responsesByRootEvent.set(record.rootEventId, rootResponses);
    }

    private syncResponsesForAttendees(
        rootEventId: string,
        attendees: string[],
    ): void {
        const normalizedAttendees = normalizeAttendeeList(attendees);
        const existingResponses =
            this.responsesByRootEvent.get(rootEventId) ?? new Map();
        const currentAccountIds = new Set(existingResponses.keys());
        const nextAccountIds = new Set(normalizedAttendees);
        for (const attendee of normalizedAttendees) {
            if (existingResponses.has(attendee)) continue;
            const now = new Date().toISOString();
            const response: CalendarEventResponseRecord = {
                rootEventId,
                accountId: attendee,
                response: "pending",
                createdAt: now,
                updatedAt: now,
            };
            existingResponses.set(attendee, response);
            this.scheduleStoreWrite(() => this.store?.saveResponse(response));
        }
        for (const accountId of currentAccountIds) {
            if (nextAccountIds.has(accountId)) continue;
            existingResponses.delete(accountId);
            this.scheduleStoreWrite(() =>
                this.store?.deleteResponse(rootEventId, accountId),
            );
        }
        if (existingResponses.size > 0) {
            this.responsesByRootEvent.set(rootEventId, existingResponses);
        } else {
            this.responsesByRootEvent.delete(rootEventId);
        }
        this.refreshResponsesForRootEvent(rootEventId);
    }

    private enforceOwnerAttendance(
        ownerAccountId: string,
        attendees: string[] | undefined,
    ): string[] {
        return normalizeAttendeeList([...(attendees ?? []), ownerAccountId]);
    }

    private scheduleStoreWrite(
        operation: (() => Promise<void> | undefined) | undefined,
    ): void {
        if (!this.store || typeof operation !== "function") return;
        this.storeWriteQueue = this.storeWriteQueue
            .then(async () => {
                await operation();
            })
            .catch((error) => {
                this.storeWriteError =
                    error instanceof Error ? error : new Error(String(error));
            });
    }
}
