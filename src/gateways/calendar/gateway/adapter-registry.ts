import {
    getAdapterConfig as getAdapterConfigHelper,
    isCalendarAdapterEnabled,
    listCalendarAdapters,
    saveCalendarAdapterConfig,
} from "./adapter-helpers.js";
import type { CalendarAdapter, CalendarAdapterInfo } from "./utils.js";

export class CalendarAdapterRegistry {
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
        return listCalendarAdapters(
            this.registeredAdapters,
            this.adapterRequires,
            this.disabledAdapters,
        );
    }

    isAdapterEnabled(adapterId: string): boolean {
        return isCalendarAdapterEnabled(
            this.registeredAdapters,
            this.disabledAdapters,
            adapterId,
        );
    }

    getAdapter(adapterId: string): CalendarAdapter | undefined {
        return this.registeredAdapters.get(adapterId);
    }

    getAdapterConfig(adapterId: string): Record<string, unknown> | null {
        return getAdapterConfigHelper(
            this.registeredAdapters,
            this.disabledAdapters,
            adapterId,
        );
    }

    saveAdapterConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): void {
        saveCalendarAdapterConfig(
            this.registeredAdapters,
            this.disabledAdapters,
            adapterId,
            config,
        );
    }

    enableAdapter(adapterId: string): void {
        this.disabledAdapters.delete(adapterId);
    }

    disableAdapter(adapterId: string): void {
        this.disabledAdapters.add(adapterId);
    }
}
