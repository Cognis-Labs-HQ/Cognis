/** Query email delivery availability without exposing provider configuration. */
export async function isEmailDeliveryAvailable(apiFetchFn) {
    const response = await apiFetchFn("/api/v1/notify/email-delivery");
    if (!response.ok) throw new Error("email_delivery_status_unavailable");
    return (await response.json()).data?.available === true;
}
