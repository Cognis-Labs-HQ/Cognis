# Zuverlässige Modultexte

## Keine Abfragen fehlender Texte

Der Modulkatalog gibt Lokalisierungsressourcen nur noch bekannt, nachdem die erforderliche englische Textdatei im Servercache bestätigt wurde. Die regelmäßige Marktplatzabfrage wiederholt daher keine Anfragen an Textadressen mehr, die nur 404 zurückgeben können.

Die Marktplatzoberfläche behält diese Unterdrückung nun ebenfalls bei, statt für Katalogeinträge mit fehlender Lokalisierungsressource eine konventionelle statische Adresse zu rekonstruieren.

## Unvollständige Modulcaches erkennen

Die API protokolliert eine strukturierte Warnung mit Modul, Sprache und Ressourcenkennung, wenn ein Modul Lokalisierung deklariert, aber die englische Ressource im Cache fehlt. Eine erneute Quellensuche kann den Cache auffüllen; Modulautoren müssen weiterhin `ui/languages/en/strings.xml` und die übrigen unterstützten Übersetzungen bereitstellen.

## Module vor der Prüfung konfigurieren

Routen, die ein Modul ausdrücklich als im deaktivierten Zustand verfügbar kennzeichnet, werden nun in einem eingeschränkten Konfigurationsstart registriert. Andere Routen, UI-Beiträge, Fähigkeiten und Ablauf-Hooks bleiben inaktiv. Administratoren können dadurch Module wie Jitsi Meet konfigurieren, bevor die Aktivierungsprüfung diese Konfiguration kontrolliert.
