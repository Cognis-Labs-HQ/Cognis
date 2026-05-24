# Message Style in Meeting Chat

## Speech bubbles and IRC style now respected in Meetings chat

The mini-chat panel on the Meetings page now reads the user's message style preference (Default, Speech Bubbles, or IRC) and applies it to chat messages, matching the behaviour of the standalone Messages page.

## Typing indicator moved to the correct position

The "someone is typing…" notification in the Messages page has been relocated from above the message thread to directly above the composer input — the position where the next incoming message will appear.

## IRC receipts and mini-chat reactions refined

The IRC message layout on the Messages page now keeps read receipts in-line with each message and centers receipt avatars correctly. Speech bubbles were also made clearer with stronger bubble visuals. Meetings mini-chat now includes the same floating reactions menu and emoji picker interactions used in Messages.

## Speech bubbles now stand out more

Speech-bubble messages now use a more elevated surface token and a stronger shadow, so message bubbles remain clearly visible on dark backgrounds.

## Dark mode speech bubble colors

Own messages in dark mode now use a deep navy background (#1d2f4a) and others' messages use a dark teal background (#1a3336) in speech-bubbles mode, providing clear visual distinction between conversation participants.

## SVG delivery status icons

Circle delivery indicators have been replaced with SVG icons: a question-mark-in-box for the initial post-send state and a checkmark-in-box once delivery is confirmed.

## Stacked read receipt avatars

Multiple reader avatars now stack right-to-left in an overlapping pill layout. The empty pre-read circle is removed. Hovering the avatar stack opens a popup with each reader's name and read timestamp. Status avatars no longer trigger profile preview cards.

## Reactions moved outside speech bubble

Reactions now appear below the bubble with a subtle background shading when chips are active, keeping the bubble itself clean.

## IRC handle format

In IRC layout, sender identification now uses `{{handle}}` double-curly-brace notation.

## Speech bubble sender avatar

In speech-bubbles mode, own messages display a semi-large avatar overlapping the top-right corner of the bubble.

## Own-message x-overflow fixed

Own-message bubbles now size to the widest of their text body and metadata row
(timestamp + status badge), so short messages no longer cause a horizontal
scrollbar in the thread panel.

## Viewport-height layout without page scroll

The messages thread panel fills the full viewport height correctly. The
thread-list scrolls internally while the composer stays pinned at the bottom.
No page-level scroll bar appears, and navigating to other pages restores their
normal scrolling behaviour.

## Read receipt hover popup corrected

The "Seen by N people" popup that appears when hovering over read receipt avatars
was not rendering at the correct screen position. The popup element now uses
`position: fixed` so it anchors to the hovered avatar wherever it appears on screen.

## x-overflow on own messages eliminated (layout fix)

`max-width` is now applied to the message-wrap flex item rather than the bubble
itself, so the percentage resolves correctly against the thread width and own
messages no longer push a horizontal scrollbar.

## Composer no longer cut off

The full height chain from the viewport down to the content panel now enforces
`height: 100%; overflow: hidden` at every level, including `.content-panel`,
so the composer stays fully in view at the bottom of the thread.

## IRC own messages left-aligned throughout

In IRC style, emoji reaction chips, the reaction picker, and read receipt status
for own messages are all now left-aligned to match incoming messages. Gap between
messages is increased for readability.

## Speech bubble avatar overlaps corner

The sender avatar in speech bubble style now visually overlaps the top-right
corner of own-message bubbles and the top-left corner of incoming bubbles, instead
of appearing adjacent to them.

## Read receipt rendered outside speech bubble

In speech bubble style, the timestamp and read receipt row now sits below the
bubble rather than inside it.

## Emoji quick-reaction deck always shows five options

When a suggested emoji is used as a reaction, it is replaced from the emoji
pool so the picker bar maintains exactly five suggestions at all times.

## Page composer `contentScrolling` flag

A new `contentScrolling` option (default `true`) on `createPageComposer` lets a
page opt in to fill-height mode by passing `contentScrolling: false`. The content
grid then constrains the content panel to the available viewport and disables its
own scrolling, allowing the page to manage internal scrolling independently.

## Composer stays visible in long threads

The Messages page now runs in fill-height content mode so the thread list is constrained and the composer remains visible even when history is long.

## More Reactions now shows inline names and times

The More Reactions popup now renders each reaction row as: emoji + user name + reaction timestamp on one line.

## Seen-by header now includes avatars

The "Seen by X people" popup header now includes the reader avatar strip in addition to the count text.

## IRC spacing increased for reaction controls

IRC-style message spacing has been increased so the floating reaction picker and reaction tooltip area render cleanly between messages.
