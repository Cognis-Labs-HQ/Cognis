# Zuverlässige Modulupdates

## Modulzustände wiederherstellen

Vorübergehende Deaktivierungen für Aktualisierungen, erzwungene Aktualisierungen und Wechsel des Veröffentlichungskanals bewahren nun den aktivierten Zustand des aktualisierten Moduls und aller aktivierten zwingenden abhängigen Module. Abhängige Module werden nach einer Aktualisierung im laufenden Betrieb wieder aktiviert; bei einem erforderlichen Serverneustart werden dieselben Zustände beim Start wiederhergestellt.

## Vollständige Manifesttypen

Der kanonische Modulmanifestvertrag deklariert nun zwingende und optionale externe Abhängigkeiten, sodass TypeScript-Modulautoren und Kernkomponenten die Abhängigkeitsmetadaten ohne unsichere Typumwandlungen verwenden können.
