# Fix Meeting Shares

## Allow Participants to Manage Shares

Current Jitsi Meet participants can now list, create, and revoke meeting share links, not just the meeting owner. Users who are not part of the meeting still receive a forbidden response.

## Limit Approval Requests to Present Participants

Meeting share approval requests now target only participants with current presence in the room. Offline participants and stale presence rows no longer delay or block share creation.

## Expire Shares When Meetings Restart

Meeting share links now capture the active meeting instance. Restarting a meeting rotates that instance identifier so older links expire automatically instead of carrying over to a new session.
