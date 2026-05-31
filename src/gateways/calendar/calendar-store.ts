import type { DbExecutor, RawDbExecutor } from "../db/reuse/db-executor.js";
import type {
    CalendarEventRecord,
    CalendarEventResponseRecord,
    CalendarRecord,
} from "./gateway.js";

export interface CalendarStore {
    ensureSchema(): Promise<void>;
    listCalendars(): Promise<CalendarRecord[]>;
    saveCalendar(calendar: CalendarRecord): Promise<void>;
    deleteCalendar(calendarId: string): Promise<void>;
    listEvents(): Promise<CalendarEventRecord[]>;
    saveEvent(event: CalendarEventRecord): Promise<void>;
    deleteEvent(eventId: string): Promise<void>;
    listResponses(): Promise<CalendarEventResponseRecord[]>;
    saveResponse(response: CalendarEventResponseRecord): Promise<void>;
    deleteResponse(rootEventId: string, accountId: string): Promise<void>;
    deleteResponsesForRootEvent(rootEventId: string): Promise<void>;
}

function parseJsonStringArray(value: unknown): string[] {
    if (typeof value !== "string" || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => String(entry ?? "").trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

function parseJsonNumberArray(value: unknown): number[] {
    if (typeof value !== "string" || !value.trim()) return [];
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) =>
                typeof entry === "number" ? Math.trunc(entry) : Number(entry),
            )
            .filter((entry) => Number.isFinite(entry) && entry > 0)
            .map((entry) => Math.trunc(entry));
    } catch {
        return [];
    }
}

export class DbCalendarStore implements CalendarStore {
    constructor(private readonly db: DbExecutor) {}

    private async ensureEventTableColumns(): Promise<void> {
        const rawDb = this.db as Partial<RawDbExecutor>;
        if (typeof rawDb.execute !== "function") return;
        await rawDb.execute(
            "ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminder_offsets_json TEXT NOT NULL DEFAULT '[]'",
        );
    }

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "calendar_calendars",
            columns: [
                { name: "id", type: "text", notNull: true, primaryKey: true },
                { name: "owner_account_id", type: "text", notNull: true },
                { name: "name", type: "text", notNull: true },
                { name: "visibility", type: "text", notNull: true },
                { name: "color", type: "text", notNull: true },
                {
                    name: "is_default",
                    type: "boolean",
                    notNull: true,
                    default: "false",
                },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
            indexes: [
                {
                    name: "idx_calendar_calendars_owner",
                    columns: ["owner_account_id", "created_at"],
                },
            ],
        });
        await this.db.ensureTable({
            name: "calendar_events",
            columns: [
                { name: "id", type: "text", notNull: true, primaryKey: true },
                { name: "calendar_id", type: "text", notNull: true },
                { name: "source_event_id", type: "text" },
                { name: "title", type: "text", notNull: true },
                { name: "description", type: "text" },
                { name: "start_at", type: "text", notNull: true },
                { name: "end_at", type: "text", notNull: true },
                { name: "created_by", type: "text", notNull: true },
                { name: "status", type: "text", notNull: true },
                { name: "recurrence", type: "text", notNull: true },
                { name: "recurrence_id", type: "text" },
                { name: "attendees_json", type: "text", notNull: true },
                { name: "invite_emails_json", type: "text", notNull: true },
                {
                    name: "reminder_offsets_json",
                    type: "text",
                    notNull: true,
                    default: "'[]'",
                },
                { name: "meeting_url", type: "text" },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
            indexes: [
                {
                    name: "idx_calendar_events_calendar",
                    columns: ["calendar_id", "start_at"],
                },
                {
                    name: "idx_calendar_events_source",
                    columns: ["source_event_id"],
                },
                {
                    name: "idx_calendar_events_recurrence",
                    columns: ["recurrence_id", "start_at"],
                },
            ],
        });
        await this.ensureEventTableColumns();
        await this.db.ensureTable({
            name: "calendar_event_responses",
            columns: [
                { name: "root_event_id", type: "text", notNull: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "response", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
            primaryKey: ["root_event_id", "account_id"],
            indexes: [
                {
                    name: "idx_calendar_event_responses_root",
                    columns: ["root_event_id", "account_id"],
                },
            ],
        });
    }

    async listCalendars(): Promise<CalendarRecord[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_calendars",
            columns: [
                "id",
                "owner_account_id",
                "name",
                "visibility",
                "color",
                "is_default",
                "created_at",
                "updated_at",
            ],
            orderBy: [
                { column: "owner_account_id", direction: "ASC" },
                { column: "created_at", direction: "ASC" },
            ],
        });
        return (result.rows ?? []).map((row) => ({
            id: String(row.id ?? ""),
            ownerAccountId: String(row.owner_account_id ?? ""),
            name: String(row.name ?? ""),
            visibility: row.visibility === "public" ? "public" : "private",
            color: String(row.color ?? "#1f8ceb"),
            isDefault: Boolean(row.is_default),
            createdAt: String(row.created_at ?? ""),
            updatedAt: String(row.updated_at ?? ""),
        }));
    }

    async saveCalendar(calendar: CalendarRecord): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "calendar_calendars",
            values: {
                id: calendar.id,
                owner_account_id: calendar.ownerAccountId,
                name: calendar.name,
                visibility: calendar.visibility,
                color: calendar.color,
                is_default: calendar.isDefault,
                created_at: calendar.createdAt,
                updated_at: calendar.updatedAt,
            },
            conflict: {
                action: "update",
                target: ["id"],
                update: {
                    owner_account_id: calendar.ownerAccountId,
                    name: calendar.name,
                    visibility: calendar.visibility,
                    color: calendar.color,
                    is_default: calendar.isDefault,
                    created_at: calendar.createdAt,
                    updated_at: calendar.updatedAt,
                },
            },
        });
    }

    async deleteCalendar(calendarId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "calendar_calendars",
            where: [{ column: "id", value: calendarId }],
        });
    }

    async listEvents(): Promise<CalendarEventRecord[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_events",
            columns: [
                "id",
                "calendar_id",
                "source_event_id",
                "title",
                "description",
                "start_at",
                "end_at",
                "created_by",
                "status",
                "recurrence",
                "recurrence_id",
                "attendees_json",
                "invite_emails_json",
                "reminder_offsets_json",
                "meeting_url",
                "created_at",
                "updated_at",
            ],
            orderBy: [
                { column: "calendar_id", direction: "ASC" },
                { column: "start_at", direction: "ASC" },
            ],
        });
        return (result.rows ?? []).map((row) => ({
            id: String(row.id ?? ""),
            calendarId: String(row.calendar_id ?? ""),
            sourceEventId:
                row.source_event_id == null
                    ? null
                    : String(row.source_event_id),
            title: String(row.title ?? ""),
            description:
                row.description == null ? null : String(row.description),
            startAt: String(row.start_at ?? ""),
            endAt: String(row.end_at ?? ""),
            createdBy: String(row.created_by ?? ""),
            status: row.status === "free" ? "free" : "busy",
            recurrence:
                row.recurrence === "daily" ||
                row.recurrence === "weekly" ||
                row.recurrence === "monthly" ||
                row.recurrence === "yearly"
                    ? row.recurrence
                    : "none",
            recurrenceId:
                row.recurrence_id == null ? null : String(row.recurrence_id),
            attendees: parseJsonStringArray(row.attendees_json),
            inviteEmails: parseJsonStringArray(row.invite_emails_json),
            reminderOffsetsMinutes: parseJsonNumberArray(
                row.reminder_offsets_json,
            ),
            meetingUrl:
                row.meeting_url == null ? null : String(row.meeting_url),
            responses: {},
            createdAt: String(row.created_at ?? ""),
            updatedAt: String(row.updated_at ?? ""),
        }));
    }

    async saveEvent(event: CalendarEventRecord): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "calendar_events",
            values: {
                id: event.id,
                calendar_id: event.calendarId,
                source_event_id: event.sourceEventId,
                title: event.title,
                description: event.description,
                start_at: event.startAt,
                end_at: event.endAt,
                created_by: event.createdBy,
                status: event.status,
                recurrence: event.recurrence,
                recurrence_id: event.recurrenceId,
                attendees_json: JSON.stringify(event.attendees),
                invite_emails_json: JSON.stringify(event.inviteEmails),
                reminder_offsets_json: JSON.stringify(
                    event.reminderOffsetsMinutes,
                ),
                meeting_url: event.meetingUrl,
                created_at: event.createdAt,
                updated_at: event.updatedAt,
            },
            conflict: {
                action: "update",
                target: ["id"],
                update: {
                    calendar_id: event.calendarId,
                    source_event_id: event.sourceEventId,
                    title: event.title,
                    description: event.description,
                    start_at: event.startAt,
                    end_at: event.endAt,
                    created_by: event.createdBy,
                    status: event.status,
                    recurrence: event.recurrence,
                    recurrence_id: event.recurrenceId,
                    attendees_json: JSON.stringify(event.attendees),
                    invite_emails_json: JSON.stringify(event.inviteEmails),
                    reminder_offsets_json: JSON.stringify(
                        event.reminderOffsetsMinutes,
                    ),
                    meeting_url: event.meetingUrl,
                    created_at: event.createdAt,
                    updated_at: event.updatedAt,
                },
            },
        });
    }

    async deleteEvent(eventId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "calendar_events",
            where: [{ column: "id", value: eventId }],
        });
    }

    async listResponses(): Promise<CalendarEventResponseRecord[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_event_responses",
            columns: [
                "root_event_id",
                "account_id",
                "response",
                "created_at",
                "updated_at",
            ],
            orderBy: [
                { column: "root_event_id", direction: "ASC" },
                { column: "account_id", direction: "ASC" },
            ],
        });
        return (result.rows ?? []).map((row) => ({
            rootEventId: String(row.root_event_id ?? ""),
            accountId: String(row.account_id ?? ""),
            response:
                row.response === "accepted" ||
                row.response === "tentative" ||
                row.response === "declined"
                    ? row.response
                    : "pending",
            createdAt: String(row.created_at ?? ""),
            updatedAt: String(row.updated_at ?? ""),
        }));
    }

    async saveResponse(response: CalendarEventResponseRecord): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "calendar_event_responses",
            values: {
                root_event_id: response.rootEventId,
                account_id: response.accountId,
                response: response.response,
                created_at: response.createdAt,
                updated_at: response.updatedAt,
            },
            conflict: {
                action: "update",
                target: ["root_event_id", "account_id"],
                update: {
                    response: response.response,
                    created_at: response.createdAt,
                    updated_at: response.updatedAt,
                },
            },
        });
    }

    async deleteResponse(
        rootEventId: string,
        accountId: string,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "calendar_event_responses",
            where: [
                { column: "root_event_id", value: rootEventId },
                { column: "account_id", value: accountId },
            ],
        });
    }

    async deleteResponsesForRootEvent(rootEventId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "calendar_event_responses",
            where: [{ column: "root_event_id", value: rootEventId }],
        });
    }
}
