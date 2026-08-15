# Reliable profile avatar rendering

## Messages load profile avatar support before rooms render

Direct Messages page loads now wait for registered navigation contributions, ensuring the Profile avatar capability is available before rooms with avatars or initials are rendered.

## Study classrooms bind the Profile UI context correctly

Classroom pages now import the UI context as executable module code, so teacher and occupied-seat initials render without a missing-variable error.
