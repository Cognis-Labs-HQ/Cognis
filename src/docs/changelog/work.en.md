# Whiteboard Persistence

## Board contents survive refresh

Whiteboard element snapshots are now saved through the Cognis API and returned with each session so valid users and share guests load the same board contents for the same URL.

## Sharing and overflow fixes

Whiteboard share hooks are registered on the system flow context so link creation can authorize correctly, and canvas overflow sizing now recomputes bounds after coordinate reclamation so the canvas can shrink again.
