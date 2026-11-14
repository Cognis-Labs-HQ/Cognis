import { normalizeAttendeeList } from "./utils.js";
import type {
    CalendarEventRecord,
    CalendarEventResponse,
    CalendarEventResponseRecord,
} from "./utils.js";
import type { CalendarStore } from "../store.js";

export class ResponseTracker {
    private readonly responsesByRootEvent = new Map<
        string,
        Map<string, CalendarEventResponseRecord>
    >();
    private writeQueue: Promise<void> = Promise.resolve();

    getRootEventId(event: CalendarEventRecord): string {
        return event.sourceEventId ?? event.id;
    }

    getResponsesMap(): Map<string, Map<string, CalendarEventResponseRecord>> {
        return this.responsesByRootEvent;
    }

    refreshEventResponses(event: CalendarEventRecord): void {
        const rootEventId = this.getRootEventId(event);
        const responseRecords = this.responsesByRootEvent.get(rootEventId);
        const responses: Record<string, CalendarEventResponse> = {};
        for (const attendee of event.attendees) {
            responses[attendee] =
                responseRecords?.get(attendee)?.response ?? "pending";
        }
        event.responses = responses;
    }

    refreshResponsesForRootEvent(
        rootEventId: string,
        eventsByCalendar: Map<string, CalendarEventRecord[]>,
    ): void {
        for (const events of eventsByCalendar.values()) {
            for (const event of events) {
                if (this.getRootEventId(event) !== rootEventId) continue;
                this.refreshEventResponses(event);
            }
        }
    }

    setResponseRecord(record: CalendarEventResponseRecord): void {
        const rootResponses =
            this.responsesByRootEvent.get(record.rootEventId) ?? new Map();
        rootResponses.set(record.accountId, record);
        this.responsesByRootEvent.set(record.rootEventId, rootResponses);
    }

    syncResponsesForAttendees(
        rootEventId: string,
        attendees: string[],
        eventsByCalendar: Map<string, CalendarEventRecord[]>,
        store: CalendarStore | null,
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
            this.scheduleWrite(async () => {
                await store?.saveResponse(response);
            });
        }
        for (const accountId of currentAccountIds) {
            if (nextAccountIds.has(accountId)) continue;
            existingResponses.delete(accountId);
            this.scheduleWrite(async () => {
                await store?.deleteResponse(rootEventId, accountId);
            });
        }
        if (existingResponses.size > 0) {
            this.responsesByRootEvent.set(rootEventId, existingResponses);
        } else {
            this.responsesByRootEvent.delete(rootEventId);
        }
        this.refreshResponsesForRootEvent(rootEventId, eventsByCalendar);
    }

    scheduleWrite(operation: () => Promise<void>): void {
        this.writeQueue = this.writeQueue
            .then(async () => {
                await operation();
            })
            .catch(() => undefined);
    }
}
