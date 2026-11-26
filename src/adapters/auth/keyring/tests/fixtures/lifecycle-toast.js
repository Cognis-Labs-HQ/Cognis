export const notifications = [];
export function showToast(message, options) {
    notifications.push({ message, ...options });
}
