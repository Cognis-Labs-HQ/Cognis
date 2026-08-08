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

## Visibility-aware shared status

Profile pages and previews now show another user's status according to that user's profile visibility: community status is visible to everyone, friends status to followers, and private status to people the user follows. Losing browser focus now reports Idle immediately, active sessions send heartbeats, and preview avatars retain rounded corners beneath the status light.

## Consistent calendar status backgrounds

Busy, free, and tentative backgrounds now apply consistently to event cards in every Calendar view, Calendar upcoming-event lists, pending summaries, and Dashboard upcoming-event summaries. Free cards remain transparent, while tentative cards retain their dashed treatment.

## Calendar styles load only where needed

Calendar status styles now load through the Calendar page stylesheet or an explicit Dashboard request. Unrelated pages such as Administration no longer request Calendar status CSS through the global Calendar navigation client.
