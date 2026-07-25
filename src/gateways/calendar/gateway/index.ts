import { randomUUID } from "node:crypto";
import { normalizeCalendarColor } from "../color.js";
import type { CalendarStore } from "../store.js";
import { CalendarTokenStore } from "./token-store.js";
import {
    applyEventFieldsFromSource,
    enforceOwnerAttendance,
    normalizeAttendeeList,
    normalizeEventRecurrence,
    normalizeEventResponse,
    normalizeEventStatus,
    normalizeInviteEmails,
    resolveReminderOffsets,
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
import type {
    AddEventInput,
    AddEventToCalendarInput,
    CreateCalendarInput,
    UpdateCalendarInput,
} from "./inputs.js";
import {
    bootstrapAdapters as bootstrapCalendarAdapters,
    discoverAdapters as discoverCalendarAdapters,
    exportCalendarAsIcs as buildCalendarIcs,
    importIcs as importCalendarIcs,
} from "./adapter-helpers.js";
import { moveOwnedEvents } from "./move-owned-events.js";
import { removeDeclinedAttendee as removeDeclinedAttendeeHelper } from "./attendee-management.js";
import { upsertEventRecord as upsertEventRecordHelper } from "./event-record-ops.js";
import {
    getEventsByRecurrenceId,
    getResponseRootEventId,
    listEventsByRecurrenceIdIncludingMirrors,
    listOwnedEventsByRecurrenceId,
} from "./recurrence-event-queries.js";
import { listInvitedPendingEvents } from "./invitation-queries.js";

export class CoreCalendarGateway {
    private readonly calendarsById = new Map<string, CalendarRecord>();
    private readonly calendarIdsByOwner = new Map<string, Set<string>>();
    private readonly eventsByCalendar = new Map<
        string,
        CalendarEventRecord[]
    >();
    private readonly tokenStore = new CalendarTokenStore();
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
                ...(adapter.version ? { version: adapter.version } : {}),
                ...(adapter.publisher ? { publisher: adapter.publisher } : {}),
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

    createCalendar(input: CreateCalendarInput): CalendarRecord {
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
            defaultReminderOffsetsMinutes: resolveReminderOffsets(
                input.defaultReminderOffsetsMinutes,
            ),
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

    updateCalendar(input: UpdateCalendarInput): CalendarRecord {
        const calendar = this.getOwnedCalendar(
            input.ownerAccountId,
            input.calendarId,
        );
        if (!calendar) {
            throw new Error("calendar_not_found");
        }
        if (input.name !== undefined) {
            if (calendar.isDefault) {
                throw new Error("calendar_default_name_locked");
            }
            const normalizedName = String(input.name ?? "").trim();
            if (!normalizedName) {
                throw new Error("calendar_name_required");
            }
            calendar.name = normalizedName;
        }
        if (input.visibility !== undefined) {
            calendar.visibility = input.visibility;
        }
        if (input.color !== undefined) {
            calendar.color = normalizeCalendarColor(input.color);
        }
        if (input.defaultReminderOffsetsMinutes !== undefined) {
            calendar.defaultReminderOffsetsMinutes = resolveReminderOffsets(
                input.defaultReminderOffsetsMinutes,
            );
        }
        calendar.updatedAt = new Date().toISOString();
        this.upsertCalendarRecord(calendar);
        this.scheduleStoreWrite(() => this.store?.saveCalendar(calendar));
        return calendar;
    }

    addEvent(input: AddEventInput): CalendarEventRecord {
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
            attendees: enforceOwnerAttendance(
                input.ownerAccountId,
                input.attendees,
            ),
            inviteEmails: input.inviteEmails,
            reminderOffsetsMinutes: resolveReminderOffsets(
                input.reminderOffsetsMinutes,
                calendar.defaultReminderOffsetsMinutes,
            ),
            meetingUrl: input.meetingUrl,
            status: input.status,
            recurrence: input.recurrence,
        });
    }

    addEventToCalendar(input: AddEventToCalendarInput): CalendarEventRecord {
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

    listInvitedPendingEvents(accountId: string): CalendarEventRecord[] {
        return listInvitedPendingEvents(
            accountId,
            this.calendarsById,
            this.eventsByCalendar,
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
        reminderOffsetsMinutes?: number[];
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
                ? getEventsByRecurrenceId(
                      this.eventsByCalendar,
                      event.recurrenceId,
                  )
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
        const nextAttendees = enforceOwnerAttendance(
            input.ownerAccountId,
            input.attendees === undefined ? event.attendees : input.attendees,
        );
        const nextInviteEmails =
            input.inviteEmails === undefined
                ? [...event.inviteEmails]
                : normalizeInviteEmails(input.inviteEmails);
        const resolvedReminderOffsets = resolveReminderOffsets(
            input.reminderOffsetsMinutes === undefined
                ? event.reminderOffsetsMinutes
                : input.reminderOffsetsMinutes,
            targetCalendar.defaultReminderOffsetsMinutes,
        );
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
            targetEvent.reminderOffsetsMinutes = [...resolvedReminderOffsets];
            targetEvent.meetingUrl = nextMeetingUrl;
            targetEvent.status = nextStatus;
            targetEvent.recurrence = nextRecurrence;
            targetEvent.updatedAt = new Date().toISOString();
            this.moveEventRecord(previousCalendarId, targetEvent);
        }
        for (const targetEvent of targetEvents) {
            this.syncResponsesForAttendees(
                getResponseRootEventId(targetEvent),
                nextAttendees,
            );
            this.refreshEventResponses(targetEvent);
            this.scheduleStoreWrite(() => this.store?.saveEvent(targetEvent));
            for (const mirroredEvent of this.listMirroredEvents(
                targetEvent.id,
            )) {
                applyEventFieldsFromSource(mirroredEvent, targetEvent);
                this.refreshEventResponses(mirroredEvent);
                this.scheduleStoreWrite(() =>
                    this.store?.saveEvent(mirroredEvent),
                );
            }
        }
        return this.getEvent(targetCalendar.id, event.id) ?? event;
    }

    moveOwnedEvent(input: {
        ownerAccountId: string;
        calendarId: string;
        eventId: string;
        targetCalendarId: string;
        moveAll?: boolean;
    }): CalendarEventRecord[] {
        return moveOwnedEvents({
            ...input,
            getOwnedEvent: (ownerAccountId, calendarId, eventId) =>
                this.getOwnedEvent(ownerAccountId, calendarId, eventId),
            getOwnedCalendar: (ownerAccountId, calendarId) =>
                this.getOwnedCalendar(ownerAccountId, calendarId),
            listOwnedEventsByRecurrenceId: (ownerAccountId, recurrenceId) =>
                listOwnedEventsByRecurrenceId(
                    this.eventsByCalendar,
                    (calendarId) => this.getCalendar(calendarId),
                    ownerAccountId,
                    recurrenceId,
                ),
            moveEventRecord: (previousCalendarId, event) =>
                this.moveEventRecord(previousCalendarId, event),
            scheduleStoreWrite: (cb) => this.scheduleStoreWrite(cb),
            saveEvent: (event) => this.store?.saveEvent(event),
        });
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
                ? getEventsByRecurrenceId(
                      this.eventsByCalendar,
                      event.recurrenceId,
                  ).filter(
                      (seriesEvent) => seriesEvent.startAt >= event.startAt,
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
        const rootEventId = getResponseRootEventId(matchingEvent);
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
        const rootEventId = getResponseRootEventId(event);
        const response = normalizeEventResponse(input.response);
        const targetRootEventIds = new Set<string>();
        if (input.respondAll === true && event.recurrenceId) {
            for (const relatedEvent of listEventsByRecurrenceIdIncludingMirrors(
                this.eventsByCalendar,
                event.recurrenceId,
            )) {
                if (!relatedEvent.attendees.includes(input.accountId)) continue;
                targetRootEventIds.add(getResponseRootEventId(relatedEvent));
            }
        }
        if (targetRootEventIds.size === 0) targetRootEventIds.add(rootEventId);
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

    removeDeclinedAttendee(input: {
        eventId: string;
        accountId: string;
        removeAll: boolean;
    }): void {
        removeDeclinedAttendeeHelper({
            ...input,
            eventsByCalendar: this.eventsByCalendar,
            getResponseRootEventId,
            listEventsByRecurrenceIdIncludingMirrors,
            syncResponsesForAttendees: (rootEventId, attendees) =>
                this.syncResponsesForAttendees(rootEventId, attendees),
            refreshEventResponses: (event) => this.refreshEventResponses(event),
            scheduleStoreWrite: (task) => this.scheduleStoreWrite(task),
            saveEvent: (event) => this.store?.saveEvent(event),
        });
    }

    issuePrivateExportToken(input: {
        ownerAccountId: string;
        calendarId: string;
        ttlSeconds?: number | null;
        name?: string;
    }): CaldavTokenRecord {
        if (!this.getOwnedCalendar(input.ownerAccountId, input.calendarId)) {
            throw new Error("calendar_not_found");
        }
        return this.tokenStore.issueCaldavToken(
            {
                ownerAccountId: input.ownerAccountId,
                calendarId: input.calendarId,
                expiresAt: "",
                ...(input.name ? { name: input.name } : {}),
            },
            input.ttlSeconds,
        );
    }

    resolvePrivateExportToken(tokenValue: string): CaldavTokenRecord | null {
        return this.tokenStore.resolveCaldavToken(tokenValue);
    }

    issueScopedMeetingAccessToken(input: {
        targetUrl: string;
        createdByAccountId: string;
        eventId?: string | null;
        ttlSeconds?: number;
    }): ScopedMeetingAccessTokenRecord {
        return this.tokenStore.issueScopedMeetingToken(
            {
                targetUrl: input.targetUrl,
                createdByAccountId: input.createdByAccountId,
                eventId: input.eventId ?? null,
                expiresAt: "",
            },
            input.ttlSeconds,
        );
    }

    consumeScopedMeetingAccessToken(
        tokenValue: string,
    ): ScopedMeetingAccessTokenRecord | null {
        return this.tokenStore.consumeScopedMeetingToken(tokenValue);
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
            getResponseRootEventId(event),
            event.attendees,
            event.createdBy,
        );
        this.refreshEventResponses(event);
        this.scheduleStoreWrite(async () => {
            await this.store?.saveEvent(event);
            for (const attendee of event.attendees) {
                const response = this.responsesByRootEvent
                    .get(getResponseRootEventId(event))
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
        upsertEventRecordHelper(this.eventsByCalendar, event);
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

    private refreshEventResponses(event: CalendarEventRecord): void {
        const rootEventId = getResponseRootEventId(event);
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
                if (getResponseRootEventId(event) !== rootEventId) continue;
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
        acceptedAccountId: string | null = null,
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
                response:
                    attendee === acceptedAccountId ? "accepted" : "pending",
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
