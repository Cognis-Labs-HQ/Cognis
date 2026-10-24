# Offline-Navigation

**Feature-Zweig:** feature-offline-navigation

## Offline-Vertrag

Produktions-Builds bereiten eine neutrale Wiederherstellungsseite vor. Lizenz und Fehlerseite funktionieren offline; nicht verfügbare Routenlinks werden deaktiviert und direkte Aufrufe öffnen das Laufzeitfehler-Popup. Ein tatsächlicher Server-Verbindungsfehler aktiviert den Ersatzbetrieb auch bei einer vom Browser gemeldeten Netzwerkverbindung.

Deklarieren Sie `public: true` und `offline: { assets: [...] }` für eine SPA-Route. Listen Sie alle öffentlichen Laufzeitabhängigkeiten einschließlich Sprachkatalogen und Datendateien auf. Seiten müssen ohne API-Aufrufe, private Kontodaten oder die Erkennung sämtlicher Host-Anbieter funktionieren. Private Routen dürfen dies nicht aktivieren. Verwenden Sie Routenlinks für die Navigation. Unbekannte oder noch nicht geladene Abhängigkeiten bleiben nicht verfügbar.

API-Antworten, Zugangsdaten und authentifiziertes HTML werden nicht gespeichert. Die Modulinvalidierung entfernt den öffentlichen Routenkatalog und Modulressourcen; Ressourcen mit Revision müssen dem aktuellen Katalog entsprechen. Entfernte Änderungen sind ohne Verbindung nicht erkennbar: Nur die zuletzt bekannte öffentliche Revision ist verfügbar. Bei Wiederherstellung werden der Katalog aktualisiert und ungespeicherte Änderungen vor dem Neuladen geprüft; danach gilt wieder die Serverautorisierung. Worker-Aktualisierungen warten auf das Schließen bestehender Tabs und bereiten die Wiederherstellungsressourcen vor der Aktivierung vor. Ein erster Besuch ohne installierten Worker funktioniert nicht offline.

## Commits
