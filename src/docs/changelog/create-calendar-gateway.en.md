# PR Changelog — Calendar UI Redesign

## Summary

The aside toolbar is now minimized in width to give the calendar more horizontal
space. Calendar list items now display a visibility icon (lock for private, globe
for public) inline with the calendar name.

The new-calendar creation form has been moved out of the toolbar into a popup
opened by a "+" button placed inline with the "My Calendars" heading. The color
picker in that popup now sits to the left of the name input with no separate
"Color" label.

The Event Composer has been removed as a standalone page element and is now
opened exclusively as a popup via the shared reusable popup system.

Day view now shows a single day with its name and date as a heading. Timeslots
are rendered as labeled row indices in a fixed left column. Events for each slot
appear in an adjacent right column. Clicking the empty events column or the "+"
button on a timeslot row opens the Event Composer popup; clicking the timeslot
label itself does not.

Week view now shows a month label row above the day grid. Each day column header
displays the day name and date and is clickable to jump to that day in day view.

Month view no longer shows an explicit "Open Weekly View" button. Instead, the
ISO week number is the clickable element in the leftmost cell of each week row
and loads that week in weekly view.

## Changed files/components

- `src/gateways/calendar/ui/app.js`
- `src/gateways/calendar/ui/calendar-ui-helpers.js`
- `src/gateways/calendar/ui/calendar.css`
- `src/gateways/calendar/ui/languages/en/strings.xml`
- `src/gateways/calendar/ui/languages/de/strings.xml`
- `src/gateways/calendar/ui/languages/id/strings.xml`
- `src/gateways/calendar/ui/languages/ja/strings.xml`
