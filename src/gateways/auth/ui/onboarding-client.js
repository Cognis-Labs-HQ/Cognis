function responseError(response, payload) {
    const code = String(payload?.error?.code ?? "onboarding_unavailable");
    const error = new Error(code);
    error.code = code;
    error.status = response.status;
    error.accountCreated = payload?.data?.accountCreated === true;
    return error;
}

export async function registerPublicAccount(input, fetchImpl = fetch) {
    const response = await fetchImpl("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
    });
    const payload = await response.json();
    if (!response.ok) throw responseError(response, payload);
    return payload.data;
}

export function createOnboardingClient(
    token,
    { signal, fetchImpl = fetch } = {},
) {
    if (typeof token !== "string" || !token)
        throw new Error("registration_session_unavailable");
    let closed = false;
    let completion;
    let completed = false;
    const headers = {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
    };
    return {
        async execute(operation, input) {
            if (closed || signal?.aborted) throw new Error("onboarding_closed");
            const response = await fetchImpl(
                "/api/v1/auth/onboarding/operations",
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ operation, input }),
                    signal,
                    cache: "no-store",
                },
            );
            const payload = await response.json();
            if (closed || signal?.aborted) throw new Error("onboarding_closed");
            if (!response.ok) throw responseError(response, payload);
            return payload.data;
        },
        complete() {
            closed = true;
            if (completed) return Promise.resolve();
            if (completion) return completion;
            completion = (async () => {
                const response = await fetchImpl(
                    "/api/v1/auth/onboarding/complete",
                    {
                        method: "POST",
                        headers,
                        keepalive: true,
                        cache: "no-store",
                    },
                );
                if (!response.ok) {
                    const payload = await response.json();
                    throw responseError(response, payload);
                }
                completed = true;
            })().finally(() => {
                completion = undefined;
            });
            return completion;
        },
    };
}
