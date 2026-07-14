# Whiteboard-Persistenz

## Inhalte bleiben nach Refresh

Whiteboard-Element-Snapshots werden jetzt über die Cognis-API gespeichert und mit jeder Sitzung zurückgegeben, damit berechtigte Benutzer und Share-Gäste für dieselbe URL dieselben Inhalte laden.

## Freigabe und Overflow

Whiteboard-Share-Hooks werden im System-Flow-Kontext registriert, sodass Linkerstellung korrekt autorisiert wird, und die Canvas-Overflow-Größe berechnet Bounds nach Koordinatenrückgewinnung neu.
