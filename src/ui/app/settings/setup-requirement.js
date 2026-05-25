export const SECURITY_SETTINGS_HASH_PATH = "/settings#security";

export function resolveSettingsSetupRedirect(
    pathname,
    hash,
    authSetupRequired,
) {
    if (!authSetupRequired) {
        return null;
    }
    if (`${pathname}${hash}` === SECURITY_SETTINGS_HASH_PATH) {
        return null;
    }
    return SECURITY_SETTINGS_HASH_PATH;
}

export function getSettingsShellOptions(authSetupRequired) {
    return {
        frameless: authSetupRequired,
        showFooter: !authSetupRequired,
        showNavbar: !authSetupRequired,
        showThemeToggle: !authSetupRequired,
        showTopbar: !authSetupRequired,
    };
}
