# SMTP Validation Guard

## SMTP User Validation blocked when SMTP adapter is not enabled

The User Validation Method dropdown in Administration > Security now disables the SMTP option and labels it as unavailable when no active SMTP adapter is registered in the notification gateway. If an admin attempts to save the setting via the API while SMTP is unavailable, the server rejects the request with an explicit error, preventing a broken configuration from being persisted.
