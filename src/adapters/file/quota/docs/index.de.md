# Kontingent-Adapter für Dateien

## Übersicht

Der Kontingent-Adapter für Dateien ist ein datenbankgestützter Richtlinienspeicher, der intern vom Datei-Gateway vor jedem Schreibvorgang konsultiert wird. Er verwaltet zwei Dinge: von Administratoren einstellbare Standardkontingente (pro Namensraum sowie ein einzelnes globales Standardkontingent über alle Namensräume hinweg) und Pro-Benutzer-Kontingent-Schnappschüsse, die zum Zeitpunkt der Kontoerstellung aus diesen Standardwerten erstellt werden. Er verfolgt **nicht**, wie viel Speicherplatz ein Benutzer tatsächlich verbraucht hat — die Nutzungsabrechnung erfolgt in der eigenen Metadatentabelle der Dateiobjekte des Datei-Gateways, da diese naturgemäß mit den Größendaten pro Objekt kolokiert ist.

## Zuständigkeiten

- Speichern eines Standardkontingents pro registriertem Namensraum, das beim ersten Anzeigen der Namensraum-Standardliste durch einen Administrator träge erzeugt wird (`ensureNamespaceDefault`).
- Speichern eines einzelnen globalen Standardkontingents über alle Namensräume hinweg.
- Schnappschuss der aktuellen Standardwerte in Pro-Benutzer-Override-Zeilen zum Zeitpunkt der Kontoerstellung (`provisionUser`), sodass das Kontingent eines Benutzers widerspiegelt, was bei der Registrierung galt, anstatt sich mit späteren Administratoränderungen zu verschieben.
- Administratoren erlauben, das Namensraum- oder globale Kontingent eines Benutzers nach der Bereitstellung zu bearbeiten.

Nicht zuständig für: Nutzungsabrechnung (das erledigt `DbFileObjectStore` des Datei-Gateways) oder die Durchsetzung des Kontingents (die `NamespaceFileService` des Datei-Gateways vergleicht die Nutzung vor jedem Schreibvorgang mit diesen Werten).

## Architektur

`DbFileQuotaStore` in `src/adapters/file/quota/index.ts` implementiert den `FileQuotaStore`-Vertrag (`src/gateways/files/reuse/quota-store-contract.ts`) anhand von vier Tabellen:

| Tabelle                         | Zweck                                                                  |
| ------------------------------- | ---------------------------------------------------------------------- |
| `file_namespace_quota_defaults` | Von Administratoren einstellbares Standardkontingent pro Namensraum-ID |
| `file_global_quota_default`     | Einzelzeiliges globales Standardkontingent (ID `"global"`)             |
| `file_user_namespace_quotas`    | Pro-Benutzer-, Pro-Namensraum-Kontingent-Override                      |
| `file_user_global_quotas`       | Pro-Benutzer-globales Kontingent-Override                              |

Eingebaute Fallback-Konstanten gelten, wenn noch nie ein Standardwert festgelegt wurde: `1 GiB` pro Namensraum, `5 GiB` global. Dies sind konservative Ausgangswerte für persönliche Dokumente und kleine Medienanhänge (Profilbilder/-banner); Administratoren sollten sie über die unten stehenden Admin-Routen erhöhen, sobald Namensräume für größere Inhalte (z. B. Kursmaterialien) genutzt werden.

### Träge Schemainitialisierung

Wie das Datei-Gateway selbst bootstrapt dieser Adapter, bevor das Datenbank-Gateway garantiert bereit ist (siehe die feste Reihenfolge von `GatewayService.bootstrap()`). Die Schemaerstellung (`ensureSchema()`) wird daher auf den ersten tatsächlichen Aufruf verschoben und zwischengespeichert, anstatt eifrig beim Bootstrap ausgeführt zu werden.

### Bereitstellung ist idempotent

`provisionUser(username)` fügt eine Zeile pro registriertem Namensraum sowie eine globale Zeile ein, wobei `conflict: { action: "ignore" }` verwendet wird, sodass wiederholte Aufrufe (z. B. bei jeder Anmeldung, nicht nur bei der ersten Registrierung) niemals einen bestehenden Override überschreiben.

## Konfiguration

Dieser Adapter hat keine Konfiguration über Umgebungsvariablen; Standardkontingente werden über die Admin-Routen des Datei-Gateways (`/api/v1/files/admin/namespace-defaults`, `/api/v1/files/admin/global-default`) statt über Umgebungsvariablen festgelegt, sodass sie zur Laufzeit ohne Neustart geändert werden können.
