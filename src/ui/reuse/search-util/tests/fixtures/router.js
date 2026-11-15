export const navigation = { calls: [], result: false, initializations: 0 };

export function initRouter() {
    navigation.initializations += 1;
}

export async function navigateTo(path) {
    navigation.calls.push(path);
    return await navigation.result;
}
