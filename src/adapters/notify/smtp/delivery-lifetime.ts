export interface DeliveryLifetime {
    signal: AbortSignal;
    expiresAt: number;
}

export function assertDeliveryLifetime(input: DeliveryLifetime): void {
    if (
        !(input?.signal instanceof AbortSignal) ||
        !Number.isFinite(input.expiresAt) ||
        input.expiresAt - Date.now() > 2147483647
    )
        throw new Error("smtp_delivery_lifetime_invalid");
    if (input.signal.aborted) throw new Error("smtp_delivery_cancelled");
    if (input.expiresAt <= Date.now()) throw new Error("smtp_delivery_expired");
}

export function createDeliveryLifetime(input: DeliveryLifetime): {
    signal: AbortSignal;
    dispose: () => void;
    cancel: (error: Error) => void;
} {
    assertDeliveryLifetime(input);
    const controller = new AbortController();
    const cancel = (error: Error) => controller.abort(error);
    const abort = () => cancel(new Error("smtp_delivery_cancelled"));
    const timer = setTimeout(
        () => cancel(new Error("smtp_delivery_expired")),
        input.expiresAt - Date.now(),
    );
    timer.unref();
    input.signal.addEventListener("abort", abort, { once: true });
    const dispose = () => {
        clearTimeout(timer);
        input.signal.removeEventListener("abort", abort);
    };
    controller.signal.addEventListener("abort", dispose, { once: true });
    return { signal: controller.signal, dispose, cancel };
}
