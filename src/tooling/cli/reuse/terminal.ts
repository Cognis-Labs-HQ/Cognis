import { AsyncLocalStorage } from "node:async_hooks";

const sessions = new AsyncLocalStorage<{ prompting: boolean }>();

export function withTerminalSession<T>(
    operation: () => Promise<T>,
): Promise<T> {
    return sessions.getStore()
        ? operation()
        : sessions.run({ prompting: false }, operation);
}

export function isPromptActive(): boolean {
    return sessions.getStore()?.prompting ?? false;
}

export async function withTerminalPrompt<T>(
    operation: () => Promise<T>,
): Promise<T> {
    return withTerminalSession(async () => {
        const session = sessions.getStore()!;
        session.prompting = true;
        try {
            return await operation();
        } finally {
            session.prompting = false;
        }
    });
}
