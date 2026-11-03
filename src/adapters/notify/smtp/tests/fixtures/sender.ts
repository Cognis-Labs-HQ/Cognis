import { runBootstrapScope } from "@cognis/core";
import { SmtpNotificationSender } from "../../notification-sender.js";

export async function createTestSender(
    ...options: ConstructorParameters<typeof SmtpNotificationSender>
): Promise<SmtpNotificationSender> {
    const sender = new SmtpNotificationSender(...options);
    await runBootstrapScope(sender, "test", async () => {
        sender.registerPurpose("test");
    });
    return sender;
}
