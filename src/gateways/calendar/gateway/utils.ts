import type { IncomingMessage, ServerResponse } from "node:http";
import type { CapabilityStore, GatewayRegistry } from "@cognis/core";
import type { CoreCalendarGateway } from "../gateway.js";

export type CalendarVisibility = "private" | "public";
export type CalendarEventStatus = "busy" | "free";
export type CalendarEventRecurrence =
    | "none"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
export type CalendarEventResponse =
    | "pending"
    | "accepted"
    | "tentative"
    | "declined";

export interface CalendarRecord {
    id: string;
    ownerAccountId: string;
    name: string;
    visibility: CalendarVisibility;
    color: string;
    defaultReminderOffsetsMinutes: number[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CalendarEventRecord {
    id: string;
    calendarId: string;
    sourceEventId: string | null;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    createdBy: string;
    status: CalendarEventStatus;
    recurrence: CalendarEventRecurrence;
    recurrenceId: string | null;
    attendees: string[];
    inviteEmails: string[];
    reminderOffsetsMinutes: number[];
    meetingUrl: string | null;
    responses: Record<string, CalendarEventResponse>;
    createdAt: string;
    updatedAt: string;
}

export interface CalendarEventResponseRecord {
    rootEventId: string;
    accountId: string;
    response: CalendarEventResponse;
    createdAt: string;
    updatedAt: string;
}

export interface CaldavTokenRecord {
    token: string;
    ownerAccountId: string;
    calendarId: string;
    expiresAt: string;
    name?: string;
}

export interface ScopedMeetingAccessTokenRecord {
    token: string;
    targetUrl: string;
    createdByAccountId: string;
    eventId: string | null;
    expiresAt: string;
}

export interface CalendarAdapter {
    readonly adapterId: string;
    readonly adapterName: string;
    readonly requires?: string[];
    getConfig?(): Record<string, unknown>;
    setConfig?(config: Record<string, unknown>): void;
    isConfigured?(): boolean;
}

export interface CalendarAdapterInfo {
    id: string;
    name: string;
    active: boolean;
    requires?: string[];
}

export interface CalendarAdapterBootstrapCtx {
    gateway: CoreCalendarGateway;
    adapterId: string;
    adapterRoot: string;
    capabilities: CapabilityStore;
    gatewayRegistry: GatewayRegistry;
    registerRoute(
        handler: (
            req: IncomingMessage,
            res: ServerResponse,
            url: URL,
        ) => Promise<boolean>,
        gatewayId?: string,
    ): void;
    log?: (level: string, msg: string, meta?: Record<string, unknown>) => void;
    isGatewayEnabled(): boolean;
    isAdapterEnabled(adapterId?: string): boolean;
}

export type CalendarBootstrapBaseCtx = Omit<
    CalendarAdapterBootstrapCtx,
    "adapterId" | "adapterRoot" | "isAdapterEnabled"
>;

const DAILY_SERIES_LENGTH = 30;
const WEEKLY_SERIES_LENGTH = 26;
const MONTHLY_SERIES_LENGTH = 12;
const YEARLY_SERIES_LENGTH = 5;

export function escapeIcsText(value: string): string {
    return value
        .replaceAll("\\", "\\\\")
        .replaceAll(";", "\\;")
        .replaceAll(",", "\\,")
        .replaceAll("\n", "\\n");
}

export function formatIcsDate(dateInput: string): string {
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
        return new Date()
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(".000", "");
    }
    return parsed.toISOString().replace(/[-:]/g, "").replace(".000", "");
}

export function parseIcsDate(value: string): string | null {
    const compact = value.trim();
    const match = compact.match(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/,
    );
    if (!match) return null;
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second),
        ),
    ).toISOString();
}

export function parseIcsAttendee(value: string): string | null {
    const normalized = value.trim();
    const mailToMatch = normalized.match(/mailto:([^;\s]+)/i);
    if (mailToMatch?.[1]) {
        return mailToMatch[1].trim().toLowerCase();
    }
    if (normalized.includes(":")) {
        return normalized.split(":").at(-1)?.trim().toLowerCase() ?? null;
    }
    return normalized ? normalized.toLowerCase() : null;
}

export function normalizeAttendeeList(attendees: string[]): string[] {
    return Array.from(
        new Set(
            attendees
                .map((entry) =>
                    String(entry ?? "")
                        .trim()
                        .replace(/^@/, "")
                        .toLowerCase(),
                )
                .filter(Boolean),
        ),
    );
}

export function normalizeInviteEmails(inviteEmails: string[]): string[] {
    return Array.from(
        new Set(
            inviteEmails
                .map((entry) =>
                    String(entry ?? "")
                        .trim()
                        .toLowerCase(),
                )
                .filter(Boolean),
        ),
    );
}

// Approximately one year in minutes; prevents unrealistic reminder offsets.
const MAX_REMINDER_OFFSET_MINUTES = 7 * 24 * 60 * 52;

export function normalizeReminderOffsets(value: unknown): number[] {
    const entries = Array.isArray(value) ? value : [];
    return Array.from(
        new Set(
            entries
                .map((entry) =>
                    typeof entry === "number" ? entry : Number(entry),
                )
                .filter(
                    (entry) =>
                        Number.isFinite(entry) &&
                        entry > 0 &&
                        entry <= MAX_REMINDER_OFFSET_MINUTES,
                )
                .map((entry) => Math.trunc(entry)),
        ),
    ).sort((left, right) => left - right);
}

export function resolveReminderOffsets(
    value: unknown,
    fallback: unknown = [],
): number[] {
    const normalized = normalizeReminderOffsets(value);
    if (normalized.length > 0) return normalized;
    return normalizeReminderOffsets(fallback);
}

export function normalizeEventStatus(value: unknown): CalendarEventStatus {
    return value === "free" ? "free" : "busy";
}

export function normalizeEventRecurrence(
    value: unknown,
): CalendarEventRecurrence {
    return value === "daily" ||
        value === "weekly" ||
        value === "monthly" ||
        value === "yearly"
        ? value
        : "none";
}

export function normalizeEventResponse(value: unknown): CalendarEventResponse {
    return value === "accepted" || value === "tentative" || value === "declined"
        ? value
        : "pending";
}

export function applyEventFieldsFromSource(
    targetEvent: CalendarEventRecord,
    sourceEvent: CalendarEventRecord,
): void {
    targetEvent.title = sourceEvent.title;
    targetEvent.description = sourceEvent.description;
    targetEvent.startAt = sourceEvent.startAt;
    targetEvent.endAt = sourceEvent.endAt;
    targetEvent.attendees = [...sourceEvent.attendees];
    targetEvent.inviteEmails = [...sourceEvent.inviteEmails];
    targetEvent.reminderOffsetsMinutes = [
        ...sourceEvent.reminderOffsetsMinutes,
    ];
    targetEvent.meetingUrl = sourceEvent.meetingUrl;
    targetEvent.status = sourceEvent.status;
    targetEvent.recurrence = sourceEvent.recurrence;
    targetEvent.recurrenceId = sourceEvent.recurrenceId;
    targetEvent.updatedAt = sourceEvent.updatedAt;
}

export function getSeriesLength(recurrence: CalendarEventRecurrence): number {
    if (recurrence === "daily") return DAILY_SERIES_LENGTH;
    if (recurrence === "weekly") return WEEKLY_SERIES_LENGTH;
    if (recurrence === "monthly") return MONTHLY_SERIES_LENGTH;
    if (recurrence === "yearly") return YEARLY_SERIES_LENGTH;
    return 1;
}

export function shiftDateByRecurrence(
    isoValue: string,
    recurrence: CalendarEventRecurrence,
    occurrenceIndex: number,
): string {
    const nextDate = new Date(isoValue);
    if (recurrence === "daily") {
        nextDate.setUTCDate(nextDate.getUTCDate() + occurrenceIndex);
    } else if (recurrence === "weekly") {
        nextDate.setUTCDate(nextDate.getUTCDate() + occurrenceIndex * 7);
    } else if (recurrence === "monthly") {
        nextDate.setUTCMonth(nextDate.getUTCMonth() + occurrenceIndex);
    } else if (recurrence === "yearly") {
        nextDate.setUTCFullYear(nextDate.getUTCFullYear() + occurrenceIndex);
    }
    return nextDate.toISOString();
}

export function enforceOwnerAttendance(
    ownerAccountId: string,
    attendees: string[] | undefined,
): string[] {
    return normalizeAttendeeList([...(attendees ?? []), ownerAccountId]);
}
