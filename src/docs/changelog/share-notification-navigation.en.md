# Share notifications open reliably

## Share actions load the complete share page

Opening a Share notification now performs a full document navigation for its `/share/…` action. This ensures the share page installs its authentication, password-keyring, and renderer hooks instead of being ignored by the dashboard SPA router.
