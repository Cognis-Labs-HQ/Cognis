# Respect personal session timeouts

## Keep personal timeout choices within the global limit

User session timeout preferences take precedence when they are shorter than the administration limit. Logging in or resetting adopts the current global timeout as a personal value instead of continuously following later increases. A shorter global limit lowers and stores the personal value, while a longer global limit leaves it unchanged. The duration controls offer only units that fit within the limit and cap each unit's number field at its greatest permitted whole value.

## Apply longer timeouts safely

Lengthening a personal timeout keeps the current session active and displays a notice that the change applies at the next login. The current-session countdown turns orange below ten percent remaining and red at two percent remaining.
