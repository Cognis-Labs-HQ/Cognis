# Static Module Loading Fix

## Static assets bypass route catch-alls

Static UI assets are now served before registered catch-all routes so reusable dynamic imports can no longer be intercepted by auth-protected handlers and returned as 401 responses.
