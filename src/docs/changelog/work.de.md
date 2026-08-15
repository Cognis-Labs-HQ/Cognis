# Einheitliche Profilavatare

## Eine profilverwaltete Avatarquelle

Das Laden und die Ersatzdarstellung von Profilavataren sowie die Erzeugung von Initialen und deren Farben erfolgen jetzt über die UI-CTX-Fähigkeit des Profiladapters. Gemeinsame UI-Aufrufer delegieren an diese Fähigkeit, statt konkurrierende Implementierungen zu pflegen, sodass Namen überall denselben Avatar erzeugen.

## Verbleibende Aufrufer geprüft

Nachrichten, Kalender, Jitsi Meet, Nextcloud Whiteboard, Teilen, Anwesenheitsanzeigen und Klassenraumavatare erreichen den Profiladapter jetzt ausschließlich über den gemeinsamen CTX-Client. Der veraltete Re-Export des Social-Gateways wurde entfernt. Ein Regressionstest verhindert neue Initialenimplementierungen, direkte Abrufe von Profildateien und Importe des früheren Anbieters.
