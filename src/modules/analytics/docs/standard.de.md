# Analytics Content

Modul-eigene Inhalte liegen unter Modulpfaden und werden nur geladen, wenn das Modul aktiviert ist.

## Externe Bereitstellung

Analytics ist für die Auslagerung nach `Cognis-Labs-HQ/cognis-module-analytics` vollständig eigenständig. Das Manifest deklariert `db:executor` unter `requiresCapabilities`; das Modul darf erst starten, wenn Cognis diese Capability anbietet. Root-Manifest, Paket, Routen, Lizenz, Assets, CLI, API, UI, Migration, übersetzte Dokumentation und Integritäts-Hashes werden gemeinsam ausgeliefert.
