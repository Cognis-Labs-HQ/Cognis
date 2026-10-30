import { randomUUID } from "node:crypto";
import { normalizeCalendarColor, randomCalendarColor } from "../color.js";
import type { CreateCalendarInput } from "./inputs.js";
import { resolveReminderOffsets, type CalendarRecord } from "./utils.js";

export function buildCalendarRecord(
    input: CreateCalendarInput,
): CalendarRecord {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("calendar_name_required");
    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        ownerAccountId: input.ownerAccountId,
        name,
        visibility: input.visibility ?? "private",
        color:
            input.color === undefined
                ? randomCalendarColor()
                : normalizeCalendarColor(input.color),
        defaultReminderOffsetsMinutes: resolveReminderOffsets(
            input.defaultReminderOffsetsMinutes,
        ),
        isDefault: input.isDefault === true,
        createdAt: now,
        updatedAt: now,
    };
}
