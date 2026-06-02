import type { CapabilityStore } from "@cognis/core";
import type { NotificationDispatcher } from "./helpers.js";

export function createCalendarNotificationResolver(
    capabilities: CapabilityStore,
): {
    ensureCategory(): void;
    getDispatchNotification(): NotificationDispatcher | null;
} {
    let notificationCategoryRegistered = false;
    return {
        ensureCategory() {
            if (notificationCategoryRegistered) return;
            const registerNotificationCategory = capabilities.get<
                (id: string, label: string) => void
            >("notify:registerCategory");
            if (!registerNotificationCategory) return;
            registerNotificationCategory("calendar", "Calendar Events");
            notificationCategoryRegistered = true;
        },
        getDispatchNotification() {
            return (
                capabilities.get<NotificationDispatcher>("notify:dispatch") ??
                null
            );
        },
    };
}
