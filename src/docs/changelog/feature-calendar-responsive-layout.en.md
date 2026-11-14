# Responsive Calendar

**Feature Branch:** feature-calendar-responsive-layout

## Wider Event Composer

New Event and Edit Event use a wider dialog on computers. Start and End, then Status and Recurrence, share rows when there is enough space. Title, Description, Calendar, participants and reminders retain full width. Narrow screens stack the fields in reading order; the dialog scrolls within the viewport and keeps its existing Save, Cancel and unsaved-change protection. All Day stays immediately after End. Date validation, writable-calendar filtering, meeting availability and offline queued changes follow the same contracts.

## Readable Week Headers

Week headings wrap within their day columns and use compact stacked labels based on the calendar panel width, including beside a desktop sidebar.

## Composed Event States

Day all-day and timed rows share their minimum slot height. Compact events keep their tighter spacing. Pending invitations overlay diagonal stripes and reduced opacity on the Busy, Free or Tentative background, with a dashed border; hovering retains both states.

## Commits

- [c11e4412ada8fb25d501c8250db1822ddaa7e810](https://github.com/Cognis-Labs-HQ/Cognis/commit/c11e4412ada8fb25d501c8250db1822ddaa7e810)
