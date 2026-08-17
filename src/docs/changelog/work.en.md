# Meeting chat lifecycle correction

## Ended meetings unload chat immediately

Ending or leaving a Jitsi Meet meeting now stops chat polling, clears the active room and encryption key, removes participant state, and empties the visible chat before the meeting-presence request finishes.
