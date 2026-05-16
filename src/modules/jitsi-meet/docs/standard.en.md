# Jitsi Meet Module

## Summary

The Jitsi Meet module provides Cognis-native meeting orchestration with participant selection, meeting URL reuse, session reclaim, and Messages chat-room reuse.

## Features

- Configurable Jitsi instance URL and optional URI prefix (Administration → Components)
- `/meeting` page with:
    - meeting stage/overlay
    - participant selection and drag-and-drop
    - chat URL handoff to Messages adapter
- Meeting persistence in module-owned tables
- Participant-gated API access by username
- Classroom fallback participant authorization when `classroom_id` is set
- Active meeting monitoring section in Administration → Meetings

## Security Notes

- API calls require a valid Cognis access token.
- Meeting details are only returned to allowed participants.
- Meeting passwords are generated per meeting record.
- Session reclaim allows a user to disconnect their previous active session.
