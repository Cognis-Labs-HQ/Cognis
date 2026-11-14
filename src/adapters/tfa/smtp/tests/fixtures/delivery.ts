import { createAdapter } from "../../index.js";
import type { DeliveryReceipt, SmtpTfaAdapterContext } from "../../delivery.js";

export function lifetime(id = "login", duration = 300_000) {
    const controller = new AbortController();
    return {
        id,
        expiresAt: Date.now() + duration,
        signal: controller.signal,
        controller,
    };
}

export function createDeliveryFixture(overrides: SmtpTfaAdapterContext = {}) {
    const owner = lifetime();
    const deliveries: Array<{
        code: string;
        signal: AbortSignal;
        expiresAt: number;
        receipt: DeliveryReceipt;
        complete: (status: DeliveryReceipt["status"], error?: string) => void;
        reject: () => void;
    }> = [];
    const state = {
        length: 6,
        status: "queued" as DeliveryReceipt["status"],
        failAdmission: false,
        admissionGate: undefined as Promise<void> | undefined,
        availableAt: undefined as string | undefined,
    };
    let setupCount = 0;
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: state.length,
            minimumIntervalMs: 15_000,
        }),
        canSendVerificationEmail: () => true,
        getPrimaryEmail: async () => "alice@example.test",
        deliverVerificationEmail: async (_email, code, input) => {
            if (state.failAdmission)
                throw new Error("synthetic_admission_failure");
            const receipt: DeliveryReceipt = {
                notificationId: String(deliveries.length + 1),
                status: state.status,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                availableAt: state.availableAt,
            };
            let resolve!: (value: DeliveryReceipt) => void;
            let reject!: (error: Error) => void;
            const completion = new Promise<DeliveryReceipt>((yes, no) => {
                resolve = yes;
                reject = no;
            });
            const complete = (
                status: DeliveryReceipt["status"],
                error?: string,
            ) => resolve({ ...receipt, status, error });
            input.signal.addEventListener(
                "abort",
                () => complete("failed", "smtp_delivery_cancelled"),
                { once: true },
            );
            deliveries.push({
                code,
                ...input,
                receipt,
                complete,
                reject: () => reject(new Error("synthetic_completion_failure")),
            });
            if (state.admissionGate) await state.admissionGate;
            return { receipt, completion };
        },
        ...overrides,
    });
    const loginInput = {
        accountId: "alice",
        state: { email: "alice@example.test" },
        lifetime: owner,
    };
    return {
        adapter,
        owner,
        state,
        deliveries,
        begin: () => adapter.beginLoginChallenge!(loginInput),
        verify: (code: string) =>
            adapter.verifyLogin({ ...loginInput, payload: { code } }),
        setup: () =>
            adapter.beginSetup({
                accountId: "alice",
                displayName: "Alice",
                issuer: "Cognis",
                lifetime: lifetime(`setup-${++setupCount}`, 600_000),
            }),
    };
}
