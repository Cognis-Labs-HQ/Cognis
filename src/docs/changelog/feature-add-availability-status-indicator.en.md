# Availability Status

## See availability at a glance

Avatars now show free, busy, or tentative status in the navigation toolbar, profile previews, messages, and meetings.

## Override your status

Calendar events set your status when they begin or are created during the current timeslot. You can override the active event afterward from the profile menu.

## Availability controls in the profile menu

The profile menu now opens on hover or click and stays visible until the user clicks elsewhere. Its first row is a borderless status dropdown with matching colored dots for Free, Busy, and Tentative, while hover outlines make every menu entry easier to track.

## Status details wherever they are needed

Hovering an avatar status light now reveals its status. Components can also query calendar-aware user availability through a ctx capability.

## Status options no longer move the menu

Opening the status selector now displays its choices to the left of the profile menu, keeping the profile actions below it in place.

## Calendar status control

User Settings now includes a General option to prevent calendar events from changing availability.

## Idle presence and extensible calendar statuses

The profile adapter now greys out the current user's status light when the presence detector reports inactivity and restores it as soon as activity resumes. Idle is automatic and cannot be selected manually. Calendar event statuses are resolved from the profile adapter's ctx capability, and free events use a transparent background.
