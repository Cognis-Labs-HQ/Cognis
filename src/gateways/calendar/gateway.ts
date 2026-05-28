import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CapabilityStore, GatewayRegistry } from '@cognis/core';

export type CalendarVisibility = 'private' | 'public';

export interface CalendarRecord {
    id: string;
    ownerAccountId: string;
    name: string;
    visibility: CalendarVisibility;
    createdAt: string;
    updatedAt: string;
}

export interface CalendarEventRecord {
    id: string;
    calendarId: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    createdBy: string;
    attendees: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CaldavTokenRecord {
    token: string;
    ownerAccountId: string;
    calendarId: string;
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

type CalendarBootstrapBaseCtx = Omit<
    CalendarAdapterBootstrapCtx,
    'adapterId' | 'adapterRoot' | 'isAdapterEnabled'
>;

function escapeIcsText(value: string): string {
    return value
        .replaceAll('\\', '\\\\')
        .replaceAll(';', '\\;')
        .replaceAll(',', '\\,')
        .replaceAll('\n', '\\n');
}

function formatIcsDate(dateInput: string): string {
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString().replace(/[-:]/g, '').replace('.000', '');
    }
    return parsed.toISOString().replace(/[-:]/g, '').replace('.000', '');
}

function parseIcsDate(value: string): string {
    const compact = value.trim();
    const match = compact.match(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/,
    );
    if (!match) return new Date().toISOString();
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

function parseIcsAttendee(value: string): string | null {
    const normalized = value.trim();
    const mailToMatch = normalized.match(/mailto:([^;\s]+)/i);
    if (mailToMatch?.[1]) {
        return mailToMatch[1].trim().toLowerCase();
    }
    if (normalized.includes(':')) {
        return normalized.split(':').at(-1)?.trim().toLowerCase() ?? null;
    }
    return normalized ? normalized.toLowerCase() : null;
}

export class CoreCalendarGateway {
    private readonly calendarsById = new Map<string, CalendarRecord>();
    private readonly calendarIdsByOwner = new Map<string, Set<string>>();
    private readonly eventsByCalendar = new Map<string, CalendarEventRecord[]>();
    private readonly tokensByValue = new Map<string, CaldavTokenRecord>();
    private readonly registeredAdapters = new Map<string, CalendarAdapter>();
    private readonly adapterRequires = new Map<string, string[]>();
    private readonly disabledAdapters = new Set<string>();

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
                    (typeof adapter.isConfigured === 'function'
                        ? adapter.isConfigured()
                        : true),
                ...(requires?.length ? { requires } : {}),
            };
        });
    }

    isAdapterEnabled(adapterId: string): boolean {
        const adapter = this.registeredAdapters.get(adapterId);
        if (!adapter || this.disabledAdapters.has(adapterId)) return false;
        if (typeof adapter.isConfigured === 'function') {
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
            ...(typeof adapter.getConfig === 'function'
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
        if (enabled === false || enabled === 'false') {
            this.disabledAdapters.add(adapterId);
        } else {
            this.disabledAdapters.delete(adapterId);
        }
        if (typeof adapter.setConfig === 'function') {
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
    }): CalendarRecord {
        const now = new Date().toISOString();
        const record: CalendarRecord = {
            id: randomUUID(),
            ownerAccountId: input.ownerAccountId,
            name: input.name,
            visibility: input.visibility ?? 'private',
            createdAt: now,
            updatedAt: now,
        };
        this.calendarsById.set(record.id, record);
        const ownerSet =
            this.calendarIdsByOwner.get(record.ownerAccountId) ?? new Set();
        ownerSet.add(record.id);
        this.calendarIdsByOwner.set(record.ownerAccountId, ownerSet);
        return record;
    }

    listCalendars(ownerAccountId: string): CalendarRecord[] {
        const ids = this.calendarIdsByOwner.get(ownerAccountId);
        if (!ids) return [];
        return Array.from(ids)
            .map((id) => this.calendarsById.get(id))
            .filter((calendar): calendar is CalendarRecord => Boolean(calendar));
    }

    getCalendar(calendarId: string): CalendarRecord | null {
        return this.calendarsById.get(calendarId) ?? null;
    }

    getOwnedCalendar(
        ownerAccountId: string,
        calendarId: string,
    ): CalendarRecord | null {
        const calendar = this.calendarsById.get(calendarId);
        if (!calendar || calendar.ownerAccountId !== ownerAccountId) return null;
        return calendar;
    }

    listEvents(calendarId: string): CalendarEventRecord[] {
        return [...(this.eventsByCalendar.get(calendarId) ?? [])].sort((a, b) =>
            a.startAt.localeCompare(b.startAt),
        );
    }

    addEvent(input: {
        ownerAccountId: string;
        calendarId: string;
        title: string;
        description?: string | null;
        startAt: string;
        endAt: string;
        attendees?: string[];
    }): CalendarEventRecord {
        const calendar = this.getOwnedCalendar(input.ownerAccountId, input.calendarId);
        if (!calendar) {
            throw new Error('calendar_not_found');
        }
        const startIso = new Date(input.startAt).toISOString();
        const endIso = new Date(input.endAt).toISOString();
        if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
            throw new Error('calendar_invalid_range');
        }

        const normalizedAttendees = Array.from(
            new Set(
                (input.attendees ?? [])
                    .map((entry) => String(entry ?? '').trim())
                    .filter(Boolean),
            ),
        );

        const now = new Date().toISOString();
        const event: CalendarEventRecord = {
            id: randomUUID(),
            calendarId: calendar.id,
            title: input.title,
            description:
                typeof input.description === 'string' &&
                input.description.trim().length > 0
                    ? input.description
                    : null,
            startAt: startIso,
            endAt: endIso,
            createdBy: input.ownerAccountId,
            attendees: normalizedAttendees,
            createdAt: now,
            updatedAt: now,
        };

        const existing = this.eventsByCalendar.get(calendar.id) ?? [];
        existing.push(event);
        this.eventsByCalendar.set(calendar.id, existing);
        calendar.updatedAt = now;
        return event;
    }

    issuePrivateExportToken(input: {
        ownerAccountId: string;
        calendarId: string;
        ttlSeconds?: number;
    }): CaldavTokenRecord {
        const calendar = this.getOwnedCalendar(input.ownerAccountId, input.calendarId);
        if (!calendar) {
            throw new Error('calendar_not_found');
        }
        const ttlSeconds = Math.max(60, input.ttlSeconds ?? 60 * 60 * 24 * 7);
        const now = Date.now();
        const token: CaldavTokenRecord = {
            token: randomUUID(),
            ownerAccountId: input.ownerAccountId,
            calendarId: input.calendarId,
            expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
        };
        this.tokensByValue.set(token.token, token);
        return token;
    }

    resolvePrivateExportToken(token: string): CaldavTokenRecord | null {
        const record = this.tokensByValue.get(token) ?? null;
        if (!record) return null;
        if (new Date(record.expiresAt).getTime() <= Date.now()) {
            this.tokensByValue.delete(token);
            return null;
        }
        return record;
    }

    exportCalendarAsIcs(calendarId: string): string {
        const calendar = this.calendarsById.get(calendarId);
        if (!calendar) {
            throw new Error('calendar_not_found');
        }
        const events = this.listEvents(calendarId);
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Cognis//Calendar Gateway//EN',
            `X-WR-CALNAME:${escapeIcsText(calendar.name)}`,
            ...events.flatMap((event) => {
                const attendeeLines = event.attendees.map(
                    (attendee) => `ATTENDEE;CN=${escapeIcsText(attendee)}:mailto:${escapeIcsText(attendee)}`,
                );
                return [
                    'BEGIN:VEVENT',
                    `UID:${event.id}`,
                    `DTSTAMP:${formatIcsDate(event.updatedAt)}`,
                    `DTSTART:${formatIcsDate(event.startAt)}`,
                    `DTEND:${formatIcsDate(event.endAt)}`,
                    `SUMMARY:${escapeIcsText(event.title)}`,
                    ...(event.description
                        ? [`DESCRIPTION:${escapeIcsText(event.description)}`]
                        : []),
                    ...attendeeLines,
                    'END:VEVENT',
                ];
            }),
            'END:VCALENDAR',
            '',
        ];
        return lines.join('\r\n');
    }

    importIcs(input: {
        ownerAccountId: string;
        calendarId: string;
        ics: string;
    }): { importedCount: number } {
        const calendar = this.getOwnedCalendar(input.ownerAccountId, input.calendarId);
        if (!calendar) {
            throw new Error('calendar_not_found');
        }

        const lines = input.ics
            .replaceAll('\r\n', '\n')
            .replaceAll('\r', '\n')
            .split('\n');
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
            if (line === 'BEGIN:VEVENT') {
                current = { attendees: [] };
                continue;
            }
            if (line === 'END:VEVENT') {
                if (current?.summary && current.dtstart && current.dtend) {
                    importedEvents.push(
                        this.addEvent({
                            ownerAccountId: input.ownerAccountId,
                            calendarId: input.calendarId,
                            title: current.summary,
                            description: current.description ?? null,
                            startAt: parseIcsDate(current.dtstart),
                            endAt: parseIcsDate(current.dtend),
                            attendees: current.attendees,
                        }),
                    );
                }
                current = null;
                continue;
            }
            if (!current) continue;
            if (line.startsWith('SUMMARY:')) {
                current.summary = line.slice('SUMMARY:'.length).trim();
            } else if (line.startsWith('DESCRIPTION:')) {
                current.description = line.slice('DESCRIPTION:'.length).trim();
            } else if (line.startsWith('DTSTART:')) {
                current.dtstart = line.slice('DTSTART:'.length).trim();
            } else if (line.startsWith('DTEND:')) {
                current.dtend = line.slice('DTEND:'.length).trim();
            } else if (line.startsWith('ATTENDEE')) {
                const attendee = parseIcsAttendee(line);
                if (attendee) current.attendees.push(attendee);
            }
        }

        return { importedCount: importedEvents.length };
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        entries.sort((a, b) => a.localeCompare(b));

        for (const entry of entries) {
            const pkgPath = path.join(adaptersRoot, entry, 'package.json');
            try {
                const raw = await readFile(pkgPath, 'utf8');
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;

                let requires: string[] | undefined;
                try {
                    const manifestRaw = await readFile(
                        path.join(adaptersRoot, entry, 'manifest.json'),
                        'utf8',
                    );
                    const manifest = JSON.parse(manifestRaw) as {
                        requires?: string[];
                    };
                    if (Array.isArray(manifest.requires)) {
                        requires = manifest.requires;
                    }
                } catch {
                    // Adapter has no manifest requires
                }

                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                const mod = await import(entryPath);
                if (typeof mod.createCalendarAdapter === 'function') {
                    const factory =
                        mod.createCalendarAdapter as () => CalendarAdapter | null;
                    const adapter = factory();
                    if (adapter) this.registerAdapter(adapter, requires);
                }
            } catch {
                // Adapter load failure is non-fatal.
            }
        }
    }

    async bootstrapAdapters(
        adaptersRoot: string,
        baseCtx: CalendarBootstrapBaseCtx,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        entries.sort((a, b) => a.localeCompare(b));

        for (const entry of entries) {
            const pkgPath = path.join(adaptersRoot, entry, 'package.json');

            let mod: Record<string, unknown>;
            try {
                const raw = await readFile(pkgPath, 'utf8');
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                mod = await import(path.resolve(adaptersRoot, entry, pkg.main));
            } catch {
                continue;
            }

            if (typeof mod.bootstrapCalendarAdapter !== 'function') continue;
            const bootstrapFn = mod.bootstrapCalendarAdapter as (
                ctx: CalendarAdapterBootstrapCtx,
            ) => Promise<void> | void;

            const adapterCtx: CalendarAdapterBootstrapCtx = {
                ...baseCtx,
                adapterId: entry,
                adapterRoot: path.join(adaptersRoot, entry),
                isAdapterEnabled: (adapterId = entry) =>
                    this.isAdapterEnabled(adapterId),
                registerRoute: (handler, gatewayId) => {
                    baseCtx.registerRoute(async (req, res, url) => {
                        if (!this.isAdapterEnabled(entry)) return false;
                        return handler(req, res, url);
                    }, gatewayId);
                },
            };

            try {
                await bootstrapFn(adapterCtx);
            } catch (error) {
                baseCtx.log?.(
                    'error',
                    `Calendar gateway: adapter "${entry}" bootstrap failed — skipping.`,
                    {
                        component: 'calendar-gateway',
                        adapterId: entry,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
            }
        }
    }
}
