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

Busy, free, and tentative backgrounds now apply consistently to event cards in every Calendar view, Calendar upcoming-event lists, pending summaries, and Dashboard upcoming-event summaries. Free cards remain transparent, while tentative cards use a striped background without changing their borders.

## Reliable event status updates

Updating an existing Calendar event's status now resolves the fallback from that event rather than referencing unavailable route state, preventing the status-only PATCH request from returning an internal server error.

## Calendar styles load only where needed

Calendar status styles now load through the Calendar page stylesheet or an explicit Dashboard request. Unrelated pages such as Administration no longer request Calendar status CSS through the global Calendar navigation client.

## Status backgrounds persist on hover

Hovering Calendar event cards no longer replaces their busy, free, or tentative background. Upcoming Events keep the status effect inside the rounded event card while hover feedback is limited to its border.

## Compact upcoming cards and calendar heading

Upcoming Events now apply status backgrounds to the bordered event button instead of its oversized list container, and state-specific hover backgrounds override the generic toolbar hover. The My Calendars heading now reserves a dedicated column for the New button so the controls no longer overlap.

## Hover highlights only the event accent

Calendar status backgrounds now explicitly resist generic button-hover backgrounds. Hover feedback keeps the card background and outer border unchanged, highlighting only the vertical calendar-color bar.

## Reliable attendee updates

Calendar event PATCH requests can update attendee lists again. The event route now imports the owning Calendar normalization function explicitly, preventing the missing-function server error while preserving owner attendance.

## Status indicators refresh after calendar updates

Successful Calendar event updates now invoke the profile adapter's availability renderer through UI ctx. The renderer clears cached availability and immediately repaints visible user status lights without requiring a page refresh.

## Profile menu follows effective status

Availability refreshes now notify the profile menu as well as avatar lights. The menu immediately moves its active selection when Calendar changes the effective status, and automatic Idle clears every selectable option while showing a grey Idle summary.

## Availability follows active event boundaries

Creating a Calendar event that is already active now refreshes availability immediately. The Calendar page also schedules ctx-backed refreshes at event start and end boundaries, so status lights and the profile menu change when an event begins or finishes without a page reload.

## Availability integrations remain reliable

Calendar now resolves late-bootstrapped preferences when they are used, uses UI ctx for Dashboard event data, and retains free-event behavior when Social is disabled. Presence sessions are expired and bounded per account to prevent unbounded server memory use.

## Unknown availability is neutral

Status indicators now appear grey with an Unknown label when availability cannot be loaded, rather than incorrectly suggesting that a user is free before profile visibility permits access.

## Visible statuses stay current

Availability for other users now refreshes every ten seconds while their indicators are visible across profile previews, meetings, whiteboards, and other surfaces. The Profile hero no longer overlays an availability light on its avatar, leaving the role badge unobstructed.

## Availability integration reliability

Calendar now handles unavailable preference storage without errors, its UI client owns preference requests, self status indicators stay fresh, and the reusable presence subscription is fully documented.

## Clear calendar status control

Calendar Status Updates now uses an enabled-by-default slider and appears before the Danger Zone, which remains the final section in General settings.

## Continuous General settings

Calendar Status Updates now remains in the continuous General settings card, uses the same heading and slider layout as Show Changelogs, and stays immediately above the final Danger Zone.

## Clearer, consistent status settings

Calendar Status Updates now includes an information popup explaining how events affect availability. User Settings now uses the same section heading, body, spacing, and sizing structure as Administration for a more consistent experience.
