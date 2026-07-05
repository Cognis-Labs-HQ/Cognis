# Nextcloud Whiteboard: Native WSS-Canvas

## Nativer Whiteboard-Canvas verbindet sich direkt per WebSocket mit dem Nextcloud-Whiteboard-Kollaborationsserver

Die frühere Implementierung leitete Benutzer an das eigene Frontend von Nextcloud weiter. Das Whiteboard öffnet sich nun als nativer Canvas in einem Popup-Fenster und verbindet sich direkt mit dem Nextcloud-Whiteboard-Kollaborationsserver (Socket.IO / WSS) — kein iFrame erforderlich.

## JWT-Sitzungstoken werden serverseitig für sichere, schlüsselfreie Client-Verbindungen ausgestellt

Wenn ein Benutzer ein Whiteboard öffnet, stellt der Cognis-Server einen kurzlebigen JWT aus (signiert mit dem konfigurierten API-Schlüssel) und gibt ihn an den Client zurück. Der Client authentifiziert sich dann beim Nextcloud-Whiteboard-Server mit diesem Token, sodass der API-Schlüssel strikt serverseitig bleibt.

## Separate Kollaborationsserver-URL in den Admin-Einstellungen

Administratoren konfigurieren nun eine eigene **Whiteboard-Server-URL**, die auf den eigenständigen Nextcloud-Whiteboard-Kollaborationsserver-Endpunkt zeigt. Dies entkoppelt die Nextcloud-Instanz-URL von der Socket.IO-Serveradresse und unterstützt beliebige Port- oder Host-Konfigurationen.

## Whiteboard-Listenseite zeigt eine Öffnen-Schaltfläche pro Board

Jede Board-Karte auf der Whiteboards-Seite zeigt nun eine **Öffnen**-Schaltfläche, die den nativen Canvas in einem Popup-Fenster startet.

## Neue Fähigkeiten: `whiteboard:getEmbedUrl` und `whiteboard:fetchBoardData`

Andere Module und Adapter können über diese öffentlichen Fähigkeiten nun die Einbettungs-URL oder Metadaten eines Whiteboards abrufen, was zukünftige Classroom- und Meeting-Integrationen ermöglicht.
