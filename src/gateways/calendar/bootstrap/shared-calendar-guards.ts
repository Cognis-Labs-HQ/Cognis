import type { ServerResponse } from "node:http";
import type { CoreCalendarGateway } from "../gateway/index.js";
import { sendCalendarError } from "./helpers.js";

export function rejectInactiveSharedCalendar(input: {
    gateway: CoreCalendarGateway;
    accountId: string;
    calendarId: string;
    activeShare: unknown;
    res: ServerResponse;
}): boolean {
    const calendar = input.gateway.getOwnedCalendar(
        input.accountId,
        input.calendarId,
    );
    if (calendar?.visibility !== "shared" || input.activeShare) return false;
    sendCalendarError(
        input.res,
        "share_inactive",
        "This calendar share is no longer active.",
        410,
    );
    return true;
}
