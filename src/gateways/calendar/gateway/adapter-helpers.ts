import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { CoreCalendarGateway } from "./index.js";
import type {
    CalendarAdapter,
    CalendarAdapterBootstrapCtx,
    CalendarBootstrapBaseCtx,
    CalendarEventRecord,
} from "./utils.js";

export function getAdapterConfig(
    registeredAdapters: Map<string, CalendarAdapter>,
    disabledAdapters: Set<string>,
    adapterId: string,
): Record<string, unknown> | null {
    const adapter = registeredAdapters.get(adapterId);
    if (!adapter) return null;
    return {
        ...(typeof adapter.getConfig === "function" ? adapter.getConfig() : {}),
        enabled: !disabledAdapters.has(adapterId),
    };
}
import {
    escapeIcsText,
    formatIcsDate,
    formatIcsDateOnly,
    isAllDayEventRange,
    normalizeAttendeeList,
    parseIcsAttendee,
    parseIcsDate,
} from "./utils.js";

export function exportCalendarAsIcs(
    gateway: CoreCalendarGateway,
    calendarId: string,
    accessMode?: "read" | "write",
): string {
    const calendar = gateway.getCalendar(calendarId);
    if (!calendar) {
        throw new Error("calendar_not_found");
    }
    const events = gateway.listEvents(calendarId);
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Cognis//Calendar Gateway//EN",
        `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
        ...(accessMode
            ? [
                  `X-CALENDARSERVER-ACCESS:${accessMode === "write" ? "READ-WRITE" : "READ"}`,
                  `X-CALENDARSERVER-READ-ONLY:${accessMode === "read" ? "TRUE" : "FALSE"}`,
              ]
            : []),
        ...events.flatMap((event) => {
            const attendeeLines = [...event.attendees, ...event.inviteEmails]
                .map((attendee) => attendee.trim())
                .filter((attendee) => attendee.includes("@"))
                .map(
                    (attendee) =>
                        `ATTENDEE;CN=${escapeIcsText(attendee)}:mailto:${escapeIcsText(attendee)}`,
                );
            const dateLines = isAllDayEventRange(event.startAt, event.endAt)
                ? [
                      `DTSTART;VALUE=DATE:${formatIcsDateOnly(event.startAt)}`,
                      `DTEND;VALUE=DATE:${formatIcsDateOnly(event.endAt)}`,
                  ]
                : [
                      `DTSTART:${formatIcsDate(event.startAt)}`,
                      `DTEND:${formatIcsDate(event.endAt)}`,
                  ];
            return [
                "BEGIN:VEVENT",
                `UID:${event.id}`,
                `DTSTAMP:${formatIcsDate(event.updatedAt)}`,
                ...dateLines,
                `SUMMARY:${escapeIcsText(event.title)}`,
                ...(event.description
                    ? [`DESCRIPTION:${escapeIcsText(event.description)}`]
                    : []),
                ...(event.meetingUrl
                    ? [`URL:${escapeIcsText(event.meetingUrl)}`]
                    : []),
                ...attendeeLines,
                "END:VEVENT",
            ];
        }),
        "END:VCALENDAR",
        "",
    ];
    return lines.join("\r\n");
}

export function importIcs(
    gateway: CoreCalendarGateway,
    input: {
        ownerAccountId: string;
        calendarId: string;
        ics: string;
    },
): { importedCount: number } {
    const calendar = gateway.getOwnedCalendar(
        input.ownerAccountId,
        input.calendarId,
    );
    if (!calendar) {
        throw new Error("calendar_not_found");
    }

    const lines = input.ics
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .split("\n");
    const importedEvents: CalendarEventRecord[] = [];
    let current: {
        summary?: string;
        description?: string | null;
        dtstart?: string;
        dtend?: string;
        attendees: string[];
    } | null = null;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (line === "BEGIN:VEVENT") {
            current = { attendees: [] };
            continue;
        }
        if (line === "END:VEVENT") {
            if (current?.summary && current.dtstart && current.dtend) {
                const startIso = parseIcsDate(current.dtstart);
                const endIso = parseIcsDate(current.dtend);
                if (!startIso || !endIso) {
                    current = null;
                    continue;
                }
                importedEvents.push(
                    gateway.addEvent({
                        ownerAccountId: input.ownerAccountId,
                        calendarId: input.calendarId,
                        title: current.summary,
                        description: current.description ?? null,
                        startAt: startIso,
                        endAt: endIso,
                        attendees: normalizeAttendeeList(current.attendees),
                    }),
                );
            }
            current = null;
            continue;
        }
        if (!current) continue;
        if (line.startsWith("SUMMARY:")) {
            current.summary = line.slice("SUMMARY:".length).trim();
        } else if (line.startsWith("DESCRIPTION:")) {
            current.description = line.slice("DESCRIPTION:".length).trim();
        } else if (line.startsWith("DTSTART")) {
            current.dtstart = line.split(":").at(-1)?.trim();
        } else if (line.startsWith("DTEND")) {
            current.dtend = line.split(":").at(-1)?.trim();
        } else if (line.startsWith("ATTENDEE")) {
            const attendee = parseIcsAttendee(line);
            if (attendee) current.attendees.push(attendee);
        }
    }

    return { importedCount: importedEvents.length };
}

export async function discoverAdapters(
    gateway: CoreCalendarGateway,
    adaptersRoot: string,
): Promise<void> {
    let entries: string[];
    try {
        entries = await readdir(adaptersRoot);
    } catch {
        return;
    }

    entries.sort((leftEntry, rightEntry) =>
        leftEntry.localeCompare(rightEntry),
    );

    for (const entry of entries) {
        const pkgPath = path.join(adaptersRoot, entry, "package.json");
        try {
            const raw = await readFile(pkgPath, "utf8");
            const pkg = JSON.parse(raw) as { main?: string; version?: string };
            if (!pkg.main) continue;

            let requires: string[] | undefined;
            let publisher: string | undefined;
            try {
                const manifestRaw = await readFile(
                    path.join(adaptersRoot, entry, "manifest.json"),
                    "utf8",
                );
                const manifest = JSON.parse(manifestRaw) as {
                    requires?: string[];
                    publisher?: string;
                };
                publisher = manifest.publisher;
                if (Array.isArray(manifest.requires)) {
                    requires = manifest.requires;
                }
            } catch {
                requires = undefined;
            }

            const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
            const mod = await import(entryPath);
            if (typeof mod.createCalendarAdapter === "function") {
                const factory =
                    mod.createCalendarAdapter as () => CalendarAdapter | null;
                const adapter = factory();
                if (adapter && pkg.version) {
                    Object.assign(adapter, { version: pkg.version });
                }
                if (adapter && publisher) {
                    Object.assign(adapter, { publisher });
                }
                if (adapter) gateway.registerAdapter(adapter, requires);
            }
        } catch {
            continue;
        }
    }
}

export async function bootstrapAdapters(
    gateway: CoreCalendarGateway,
    adaptersRoot: string,
    baseCtx: CalendarBootstrapBaseCtx,
): Promise<void> {
    let entries: string[];
    try {
        entries = await readdir(adaptersRoot);
    } catch {
        return;
    }

    entries.sort((leftEntry, rightEntry) =>
        leftEntry.localeCompare(rightEntry),
    );

    for (const entry of entries) {
        const pkgPath = path.join(adaptersRoot, entry, "package.json");

        let mod: Record<string, unknown>;
        try {
            const raw = await readFile(pkgPath, "utf8");
            const pkg = JSON.parse(raw) as { main?: string };
            if (!pkg.main) continue;
            mod = await import(path.resolve(adaptersRoot, entry, pkg.main));
        } catch {
            continue;
        }

        if (typeof mod.bootstrapCalendarAdapter !== "function") continue;
        const bootstrapFn = mod.bootstrapCalendarAdapter as (
            ctx: CalendarAdapterBootstrapCtx,
        ) => Promise<void> | void;

        const adapterCtx: CalendarAdapterBootstrapCtx = {
            ...baseCtx,
            adapterId: entry,
            adapterRoot: path.join(adaptersRoot, entry),
            isAdapterEnabled: (adapterId = entry) =>
                gateway.isAdapterEnabled(adapterId),
            registerRoute: (handler, gatewayId) => {
                baseCtx.registerRoute(async (req, res, url) => {
                    if (!gateway.isAdapterEnabled(entry)) return false;
                    return handler(req, res, url);
                }, gatewayId);
            },
        };

        try {
            await bootstrapFn(adapterCtx);
        } catch (error) {
            baseCtx.log?.(
                "error",
                `Calendar gateway: adapter "${entry}" bootstrap failed — skipping.`,
                {
                    component: "calendar-gateway",
                    adapterId: entry,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
        }
    }
}
