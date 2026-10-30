# ACL-Matrix

## Überblick

Die ACL-Matrix definiert, welche Aktionen jede Rolle in Cognis ausführen darf. Rollen werden bei der Kontoerstellung oder nachträglich von einem Admin zugewiesen; die Selbstregistrierung ergibt immer die `user`-Rolle.

Cognis hat vier Rollen: `user` ist der Standard für normale Lernaktivitäten. `teacher` gewährt Zugriff auf lehrkraftspezifische APIs. `moderator` fügt Community-Moderationsrechte hinzu (beliebige Beiträge löschen). `admin` hat vollen Plattformzugriff.

## Rollenmatrix

| Fähigkeit                             | user | teacher | moderator | admin |
| ------------------------------------- | ---: | ------: | --------: | ----: |
| Selbstregistrierung                   |   ✅ |      ✅ |        ✅ |    ✅ |
| Eigenes Profil anzeigen/bearbeiten    |   ✅ |      ✅ |        ✅ |    ✅ |
| Beiträge erstellen                    |   ✅ |      ✅ |        ✅ |    ✅ |
| Benutzer folgen/entfolgen             |   ✅ |      ✅ |        ✅ |    ✅ |
| Benutzer blockieren/entblocken        |   ✅ |      ✅ |        ✅ |    ✅ |
| Dateien hochladen/herunterladen       |   ✅ |      ✅ |        ✅ |    ✅ |
| Lehrspezifische APIs zugreifen        |   ❌ |      ✅ |        ❌ |    ✅ |
| Beliebige Beiträge löschen            |   ❌ |      ❌ |        ✅ |    ✅ |
| Beliebige Dateien löschen             |   ❌ |      ❌ |        ❌ |    ✅ |
| Dateispeichergrenzwerte konfigurieren |   ❌ |      ❌ |        ❌ |    ✅ |
| Module installieren/verwalten         |   ❌ |      ❌ |        ❌ |    ✅ |
| Auth-Anbieter-Konfiguration verwalten |   ❌ |      ❌ |        ❌ |    ✅ |
| System-Diagnose-Endpunkte             |   ❌ |      ❌ |        ❌ |    ✅ |

## Rollennotizen

- **user** — Standardrolle bei der Selbstregistrierung; entspricht der Schülerrolle.
- **teacher** — Erhöhter API-Zugriff für Lehrkraft-Features; von einem Admin zugewiesen.
- **moderator** — Community-Moderationsrechte; kein Zugriff auf System- oder Admin-Konfiguration.
- **admin** — Vollständiger Plattformzugriff; werden außerhalb des Systems über `cognisctl user:create` erstellt.
