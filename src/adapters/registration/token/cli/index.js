import { apiRequest } from "../../../../tooling/cli/http.ts";
import { collectWizardFields } from "../../../../tooling/cli/wizard.ts";
import { renderStructuredSummary } from "../../../../tooling/cli/formatters.ts";

/** Registers token issuance and email delivery through the gateway's authorized API. */
export function registerCommands({ register }) {
    register(
        "invite:token:generate",
        async ({ args, apiBaseUrl, getApiToken }) => {
            if (args.length)
                throw new Error("Usage: cognisctl invite:token:generate");
            return apiRequest(apiBaseUrl, "/api/v1/registration/tokens", {
                method: "POST",
                apiToken: await getApiToken(),
                body: { deliverEmail: false },
            });
        },
        {
            section: "Registration Token Adapter",
            usage: "cognisctl invite:token:generate",
            description: "Generate a registration token without sending email.",
            render: renderStructuredSummary,
        },
    );
    register(
        "invite:email:send",
        async ({ args, apiBaseUrl, getApiToken }) => {
            if (args.length > 1)
                throw new Error("Usage: cognisctl invite:email:send <email>");
            const email = String(
                args.length
                    ? args[0]
                    : ((
                          await collectWizardFields("invite:email:send", [
                              { name: "email", required: true },
                          ])
                      ).email ?? ""),
            ).trim();
            if (!email) throw new Error("Email is required.");
            return apiRequest(apiBaseUrl, "/api/v1/registration/tokens", {
                method: "POST",
                apiToken: await getApiToken(),
                body: { email, deliverEmail: true },
            });
        },
        {
            section: "Registration Token Adapter",
            usage: "cognisctl invite:email:send <email>",
            description: "Send a registration invitation email.",
            render: renderStructuredSummary,
        },
    );
}
