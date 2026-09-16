import {
    parseAuthLoginButton,
    type AuthLoginButtonDescriptor,
} from "../login-button.js";
import type { AuthBootstrapHookContext } from "./index.js";

export async function registerAuthBootstrapHook({
    authGateway,
    ctx,
}: AuthBootstrapHookContext): Promise<void> {
    const buttons = new Map<string, AuthLoginButtonDescriptor>();
    ctx.capabilities.contribute(
        "auth:registerLoginButton",
        (descriptor: AuthLoginButtonDescriptor) => {
            const button = parseAuthLoginButton(descriptor);
            if (!button) throw new Error("auth_login_button_invalid");
            if (!authGateway.getEnabledAdapter(button.providerId)) {
                throw new Error("auth_login_button_provider_unavailable");
            }
            buttons.set(button.providerId, button);
            ctx.log?.("info", "Registered an authentication login button.", {
                component: "auth-gateway",
                operation: "register_login_button",
                providerId: button.providerId,
            });
            return () => {
                if (!buttons.delete(button.providerId)) return;
                ctx.log?.(
                    "info",
                    "Unregistered an authentication login button.",
                    {
                        component: "auth-gateway",
                        operation: "unregister_login_button",
                        providerId: button.providerId,
                    },
                );
            };
        },
    );
    ctx.flow.extend(
        "construct-login-ui",
        "augment-methods",
        { id: "auth-gateway:login-buttons" },
        () => ({
            methods: [...buttons.values()]
                .filter((button) =>
                    authGateway.getEnabledAdapter(button.providerId),
                )
                .map((button) => ({
                    id: button.providerId,
                    name: button.label,
                    loginButton: button,
                })),
        }),
    );
}
