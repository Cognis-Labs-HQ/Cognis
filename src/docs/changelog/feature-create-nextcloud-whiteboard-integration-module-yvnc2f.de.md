# Whiteboard im Dashboard

## Der Canvas ist jetzt direkt in das Dashboard-Layout eingebettet

Der Whiteboard-Canvas öffnet sich nicht mehr als Browser-Popup. Ein Klick auf ein Board aus der Board-Liste lädt den vollständigen Zeichen-Canvas direkt im Dashboard, sodass die gesamte Zusammenarbeit in einem Tab bleibt.

## Vorab-Prüfung bestätigt die Server-Erreichbarkeit vor jedem Canvas-Start

Bevor der Canvas eine Verbindung aufbaut, wird überprüft, ob die Whiteboard-Server-URL konfiguriert und erreichbar ist. Bei fehlender Konfiguration oder nicht erreichbarem Server wird eine klare Fehlermeldung angezeigt.

## Vollständiges Zeichenwerkzeug im Dashboard erhalten

Der eingebettete Canvas enthält die vollständige Werkzeugleiste — Stift, Radierer, Strichfarbe, Strichbreite und Löschen — und entspricht damit dem vollen Funktionsumfang des bisherigen Popup-Fensters.

## Echtzeit-Zusammenarbeit via Socket.IO bleibt unverändert

Die Socket.IO-Verbindung und die Element-Synchronisierung funktionieren wie bisher; der einzige Unterschied ist, dass der Canvas jetzt innerhalb des Seiten-Composer-Grid-Elements statt in einem separaten Browserfenster eingebunden wird.

## JWT-Sitzungstoken werden serverseitig für sichere, schlüsselfreie Client-Verbindungen ausgestellt

Wenn ein Benutzer ein Whiteboard öffnet, stellt der Cognis-Server einen kurzlebigen JWT aus (signiert mit dem konfigurierten API-Schlüssel) und gibt ihn an den Client zurück. Der Client authentifiziert sich dann beim Nextcloud-Whiteboard-Server mit diesem Token, sodass der API-Schlüssel strikt serverseitig bleibt.

## Separate Kollaborationsserver-URL in den Admin-Einstellungen

Administratoren konfigurieren eine eigene **Whiteboard-Server-URL**, die auf den eigenständigen Nextcloud-Whiteboard-Kollaborationsserver-Endpunkt zeigt. Dies entkoppelt die Nextcloud-Instanz-URL von der Socket.IO-Serveradresse.

## Neue Fähigkeiten: `whiteboard:getEmbedUrl` und `whiteboard:fetchBoardData`

Andere Module und Adapter können über diese öffentlichen Fähigkeiten die Einbettungs-URL oder Metadaten eines Whiteboards abrufen und so zukünftige Classroom- und Meeting-Integrationen ermöglichen.
