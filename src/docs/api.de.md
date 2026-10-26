# API

## Übersicht

`src/api/` ist die HTTP-Schicht von Cognis. Sie beherbergt den Express-kompatiblen Node.js-Server, die Routen-Registry, Authentifizierungs-Middleware und alle schlanken Routen-Handler-Module, die eingehende HTTP-Anfragen auf Gateway-Operationen abbilden. Die API-Schicht ist bewusst dünn gehalten: Routen-Handler verarbeiten und validieren Eingaben, delegieren an Gateways und geben einen stabilen Antwort-Umschlag zurück. Kein Routen-Handler hält einen direkten Verweis auf einen Datenbanktreiber oder ein externes Dienst-SDK.

Der Server wird aus dem zusammengesetzt, was beim Start vorhanden ist, nicht aus einer fest codierten Komponentenliste. Gateways registrieren ihre eigenen Routen während des Bootstraps über `ctx.routeRegistry.register(...)`. Der Server iteriert die Registry, um seine Routentabelle aufzubauen. Das Entfernen eines Gateways entfernt seine Routen automatisch.

Die Authentifizierung verwendet undurchsichtige Bearer-Token, die bei der Anmeldung ausgegeben werden. Dasselbe Token wird auch als HttpOnly-Cookie (`cognis_access_token`) für serverseitig gerenderte Seitenwächter gesetzt. Ein nicht ablaufendes CLI-Bootstrap-Token wird beim Start für vertrauenswürdige lokale Werkzeuge auf Disk geschrieben.

## Verantwortlichkeiten

- Den HTTP-Server hosten und die Routen-Registry in die Anfrageverarbeitung einbinden.
- Die Middleware `requireAuth` und `getAuthClaims` bereitstellen, die von allen geschützten Routen-Handlern verwendet wird.
- Die Antwort-Umschlag-Konvention `{ data }` / `{ error }` durchsetzen.
- Alle Gateways in Abhängigkeitsreihenfolge über `src/api/bootstrap/gateway.ts` booten.
- Das Datenbankschema beim Start über `src/api/bootstrap/db-init.ts` initialisieren.
- Wiederverwendbare Hilfsprogramme für Routen-Handler bereitstellen: `src/api/reuse/`.

Nicht verantwortlich für: Implementierung von Domänenlogik, direktes Speichern von Daten oder Kenntnisse darüber, welche Gateways installiert sind.

## Architektur

### Antwort-Umschlag

Alle API-Antworten verwenden eine von zwei Formen:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Requires admin scope" } }
```

Interne Fehlerdetails werden niemals an den Client gesendet. Die serverseitige Protokollierung erfasst den vollständigen Fehlerkontext.

### Authentifizierungsmodell

Erhalten Sie ein Token über `POST /api/v1/auth/login`. Die Antwort enthält `data.token`. Senden Sie das Token als `Authorization: Bearer <token>` bei nachfolgenden Anfragen. Der Anmeldeendpunkt setzt auch `cognis_access_token` als HttpOnly-Cookie für serverseitig gerenderte Routenwächter.

Der Token-Ablauf wird durch `COGNIS_ACCESS_TOKEN_TTL_SECONDS` gesteuert (Standard: `43200`, zwölf Stunden). Beim Start schreibt der Server ein nicht ablaufendes CLI-Bootstrap-Token nach `COGNIS_CLI_TOKEN_PATH` (Standard `/app/config/cli-access.token`, Modus `0600`) für vertrauenswürdige lokale CLI-Nutzung.

### Standard-Persistenzeinstellungen

| `DB_TYPE`               | Backend    | Verbindung                  |
| ----------------------- | ---------- | --------------------------- |
| `postgresql` (Standard) | PostgreSQL | `DATABASE_URL` erforderlich |
| `mariadb`               | MariaDB    | `DATABASE_URL` erforderlich |

### Wichtige Quelldateien

| Pfad                                 | Zweck                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `src/api/main.ts`                    | Server-Einstiegspunkt                                                    |
| `src/api/server.ts`                  | HTTP-Server-Einrichtung und Routen-Verteilung                            |
| `src/api/reuse/route-registry.ts`    | Routen-Registry, die von Gateways zur Selbstregistrierung verwendet wird |
| `src/api/bootstrap/gateway.ts`       | Gateway-Bootstrap-Kontext und Bootstrap-Verträge                         |
| `src/gateways/auth/guard.ts`         | Middleware `requireAuth`, `getAuthClaims`                                |
| `src/gateways/auth/access-tokens.ts` | Token-Ausstellung und -Validierung                                       |
| `src/api/bootstrap/db-init.ts`       | Schema-Initialisierung beim Start                                        |
| `src/api/reuse/`                     | Gemeinsame Hilfsprogramme (Krypto, JSON-Lesen, Store-Helfer)             |

## Konfiguration

| Variable                          | Standard                       | Beschreibung                                                          |
| --------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                   | Datenbank-Backend: `postgresql` oder `mariadb`                        |
| `DATABASE_URL`                    | —                              | Verbindungszeichenfolge für PostgreSQL oder MariaDB                   |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                        | Bearer-Token-Lebensdauer in Sekunden                                  |
| `COGNIS_CLI_TOKEN_PATH`           | `/app/config/cli-access.token` | Pfad für das CLI-Bootstrap-Token                                      |
| `COGNIS_MODULE_SOURCES_PATH`      | `config/module-sources.json`   | Persistenter Pfad für die Quellenkonfiguration des Modul-Marktplatzes |
| `COGNIS_GATEWAYS_ROOT`            | `src/gateways`                 | Stammverzeichnis für Gateway-Erkennung                                |
| `COGNIS_ADAPTERS_ROOT`            | `src/adapters`                 | Stammverzeichnis für Adapter-Erkennung                                |
| `PORT`                            | `3000`                         | HTTP-Port                                                             |
| `LISTEN_HOST`                     | `0.0.0.0`                      | Bind-Adresse                                                          |

## API-Routen

### System

| Methode | Pfad                         | Beschreibung                                     | Auth  |
| ------- | ---------------------------- | ------------------------------------------------ | ----- |
| `GET`   | `/api/v1/system/health`      | Vollständiger Gesundheitsstatus mit Betriebszeit | Keine |
| `GET`   | `/api/v1/system/healthcheck` | Minimale Lebendigkeitsprüfung                    | Keine |
| `GET`   | `/api/v1/system/ui-config`   | UI-Konfigurationsobjekt                          | Keine |

### Auth

| Methode | Pfad                         | Beschreibung                                    | Auth  |
| ------- | ---------------------------- | ----------------------------------------------- | ----- |
| `GET`   | `/api/v1/auth/login-methods` | Aktivierte Authentifizierungsanbieter auflisten | Keine |
| `POST`  | `/api/v1/auth/register`      | Selbstregistrierung; vergibt Rolle `user`       | Keine |
| `POST`  | `/api/v1/auth/login`         | Authentifizierung; gibt Bearer-Token zurück     | Keine |

### Module

| Methode | Pfad                          | Beschreibung          | Auth   |
| ------- | ----------------------------- | --------------------- | ------ |
| `GET`   | `/api/v1/modules`             | Alle Module auflisten | Bearer |
| `POST`  | `/api/v1/modules/:id/enable`  | Modul aktivieren      | Admin  |
| `POST`  | `/api/v1/modules/:id/disable` | Modul deaktivieren    | Admin  |

### Gateways

| Methode | Pfad                           | Beschreibung                          | Auth  |
| ------- | ------------------------------ | ------------------------------------- | ----- |
| `GET`   | `/api/v1/gateways`             | Alle registrierten Gateways auflisten | Admin |
| `GET`   | `/api/v1/gateways/:id`         | Einzelnes Gateway-Manifest            | Admin |
| `POST`  | `/api/v1/gateways/:id/enable`  | Gateway als aktiv markieren           | Admin |
| `POST`  | `/api/v1/gateways/:id/disable` | Gateway als deaktiviert markieren     | Admin |
| `GET`   | `/api/v1/admin/sections`       | Admin-UI-Abschnitte aus Gateways      | Admin |

### UI-Erweiterungen

| Methode | Pfad                                 | Beschreibung                             | Auth   |
| ------- | ------------------------------------ | ---------------------------------------- | ------ |
| `GET`   | `/api/v1/ui/page-extensions/:pageId` | Von Gateways beigetragene Seitenelemente | Bearer |

### Dokumentation

| Methode | Pfad                           | Beschreibung                                    | Auth  |
| ------- | ------------------------------ | ----------------------------------------------- | ----- |
| `GET`   | `/api/v1/docs`                 | Alle verfügbaren Dokumentations-Slugs auflisten | Keine |
| `GET`   | `/api/v1/docs/:slugOrTreePath` | Einzelnes Dokument nach Slug abrufen            | Keine |

### Profil

| Methode  | Pfad                                   | Beschreibung                                           | Auth   |
| -------- | -------------------------------------- | ------------------------------------------------------ | ------ |
| `GET`    | `/api/v1/social/profile/ping`          | Fähigkeitsprüfung                                      | Bearer |
| `GET`    | `/api/v1/social/profile`               | Eigenes Profil                                         | Bearer |
| `PATCH`  | `/api/v1/social/profile`               | Eigene Profilfelder aktualisieren                      | Bearer |
| `PUT`    | `/api/v1/social/profile/avatar`        | Avatar hochladen                                       | Bearer |
| `DELETE` | `/api/v1/social/profile/avatar`        | Eigenen Avatar entfernen                               | Bearer |
| `PUT`    | `/api/v1/social/profile/banner`        | Banner hochladen                                       | Bearer |
| `DELETE` | `/api/v1/social/profile/banner`        | Eigenes Banner entfernen                               | Bearer |
| `GET`    | `/api/v1/social/users/:handle/profile` | Öffentliches Profil (durch Sichtbarkeit eingeschränkt) | Bearer |

### Soziales Netzwerk

| Methode  | Pfad                                     | Beschreibung                                      | Auth   |
| -------- | ---------------------------------------- | ------------------------------------------------- | ------ |
| `POST`   | `/api/v1/social/users/:handle/follow`    | Benutzer folgen                                   | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/follow`    | Entfolgen                                         | Bearer |
| `POST`   | `/api/v1/social/users/:handle/block`     | Benutzer blockieren                               | Bearer |
| `DELETE` | `/api/v1/social/users/:handle/block`     | Blockierung aufheben                              | Bearer |
| `GET`    | `/api/v1/social/users/:handle/follow`    | Follower-Liste (durch Sichtbarkeit eingeschränkt) | Bearer |
| `GET`    | `/api/v1/social/users/:handle/following` | Folge-Liste (durch Sichtbarkeit eingeschränkt)    | Bearer |

### Beiträge

| Methode  | Pfad                                 | Beschreibung                                       | Auth   |
| -------- | ------------------------------------ | -------------------------------------------------- | ------ |
| `POST`   | `/api/v1/social/posts`               | Beitrag erstellen                                  | Bearer |
| `GET`    | `/api/v1/social/posts`               | Eigene Beiträge auflisten                          | Bearer |
| `DELETE` | `/api/v1/social/posts/:id`           | Beitrag löschen (Eigentümer, Moderator oder Admin) | Bearer |
| `GET`    | `/api/v1/social/users/:handle/posts` | Beiträge eines Benutzers auflisten                 | Bearer |

### Dateien

| Methode  | Pfad                                         | Beschreibung                                 | Auth   |
| -------- | -------------------------------------------- | -------------------------------------------- | ------ |
| `PUT`    | `/api/v1/files/:bucket/:key`                 | Datei hochladen                              | Bearer |
| `GET`    | `/api/v1/files/:bucket/:key`                 | Datei herunterladen                          | Bearer |
| `DELETE` | `/api/v1/files/:bucket/:key`                 | Datei löschen                                | Admin  |
| `GET`    | `/api/v1/social/admin/file-limits`           | Größenbeschränkungen pro Kategorie auflisten | Admin  |
| `PUT`    | `/api/v1/social/admin/file-limits/:category` | Größenbeschränkung festlegen                 | Admin  |

### Benutzer (Admin)

| Methode  | Pfad                              | Beschreibung         | Auth  |
| -------- | --------------------------------- | -------------------- | ----- |
| `GET`    | `/api/v1/users`                   | Konten auflisten     | Admin |
| `POST`   | `/api/v1/users/:username/role`    | Kontorolle festlegen | Admin |
| `POST`   | `/api/v1/users/:username/disable` | Konto deaktivieren   | Admin |
| `POST`   | `/api/v1/users/:username/enable`  | Konto aktivieren     | Admin |
| `DELETE` | `/api/v1/users/:username`         | Konto löschen        | Admin |

## Erreichbarkeit

`GET /api/v1/system/healthcheck` antwortet sofort mit `{ "data": { "status": "ok" } }`, ohne Komponentenprüfungen auszuführen. Dieser Endpunkt dient zur Verbindungserkennung. `GET /api/v1/system/health` behält ausführliche Komponenteninformationen, Zeitstempel und Laufzeit bei. Langsame optionale Komponenten dürfen einen verfügbaren Server nicht als offline erscheinen lassen.

## Bereitschaft von Offline-Routen

`offline:registerSessionRoutes(ids, signal, { available })` akzeptiert eine optionale Prüfung des Anbieters, die offline Route und Pfad erhält. Abbruch des Signals entfernt die Deklaration. Der Host bereitet öffentlichen Seitencode und Styles separat über `offline:prepareRouteAssets` vor; `offline:areRouteAssetsReady` meldet den Abschluss. `createOfflineReadCache` stellt `read.has(key)` bereit, HTTP-Clients mit begrenzter Lebensdauer bieten `request.hasCachedRead(path)`, ohne private Daten zurückzugeben. Die Prüfungen berücksichtigen Konto, Sitzung, Ablauf, Cache-Generation und Anbieter-Lebensdauer. Sie gewähren keine Berechtigung und ersetzen keine gespeicherte Zustimmung zu Rechtstexten.

## Anmeldung und Übertragung

Die Übertragung beginnt erst nach erfolgreicher Sitzungsautorisierung und erforderlicher Zustimmung im Hintergrund. Eine separate Browsersperre serialisiert die Übertragung zwischen Tabs; kurze Speichersperren schützen Schnappschüsse und Bestätigungen, ohne auf Netzwerkantworten zu warten. Lesen und neue gepufferte Änderungen bleiben während langsamer Übertragungen möglich. Bestätigungen lesen den Speicher erneut, damit gleichzeitige Änderungen erhalten bleiben. Leere Warteschlangen werden bei der Authentifizierung nicht neu geschrieben; nicht authentifizierte Seiten warnen nicht vor dem Puffer eines anderen Kontos.

## Offline-Prüfung und Warnungen

Der Offline-Hinweis bietet Verbindung erneut prüfen mit gemeinsamen Schaltflächenstilen und Ladeanzeige. Die Aktion ruft sofort `/api/v1/system/healthcheck` auf, bündelt gleichzeitige Prüfungen, autorisiert bei erreichbarem Server die Sitzung erneut und versucht die Übertragung der Warteschlange. Erforderliche Zustimmung bleibt Voraussetzung. Bei Fehlern bleibt der Offline-Modus ohne Fehlerdialog aktiv. Automatische Prüfungen bleiben auf einmal je fünfzehn Minuten begrenzt; die ausdrückliche Aktion darf früher prüfen. Nach Wiederherstellung bleibt Aktualisieren verfügbar.

Hintergrundanalysen bleiben gespeichert, lösen aber keine Schließwarnung aus. Anbieter wählen `offline:outbox.register(owner, send, signal, { protectOnClose: false })`; Benutzeränderungen bleiben standardmäßig geschützt. Jeder neue Datensatz speichert die Einstufung, damit Anbieterfreigabe und Neuladen Telemetrie nicht zu einer ungespeicherten Änderung machen. Ältere Einträge nutzen die Erklärung aktiver Anbieter; unbekannte Anbieter bleiben geschützt. Die automatische Zeitzonenerkennung nutzt `saveUiPreferences(patch, { bufferOffline: false })`; der gebundene HTTP-Client lehnt dies offline ab, statt es zu puffern. Ausdrückliche Einstellungen, Nachrichten und Kalenderänderungen werden weiterhin gepuffert und geschützt.

## Entsperren und Modulladen

Die Entsperrung bleibt beim Neuladen im selben authentifizierten Tab und derselben Sitzung erhalten. Das Passwort verschlüsselt weiterhin den Tresor; weder Passwort noch unverschlüsselter Entschlüsselungsschlüssel werden gespeichert. Der Sitzungsspeicher enthält nur eine mit AES-GCM verschlüsselte Entsperrung, deren Schlüssel mit HKDF aus dem aktiven Sitzungsgeheimnis abgeleitet und an Ursprung, Konto, serverseitige Kontoinstanz und Sitzung gebunden ist. Vor Wiederherstellung muss der Server diese Bindung bestätigen. Endliche Sperrfristen sind authentifiziert und bleiben beim Neuladen absolut. Sperren, Abmelden, Konto-, Instanz- oder Sitzungswechsel und Ablauf verhindern die Wiederherstellung. Nach Schließen des Tabs oder Beginn einer neuen Sitzung ist erneutes Entsperren nötig. Der alte unverschlüsselte IndexedDB-Cache bleibt stillgelegt.

Die Vorbereitung von Routen-Assets registriert ihren Ablauf und ihre Cache-Funktionen einmal pro gemeinsamem ctx. Gebündelte Skripte und Quellimporte externer Module verwenden dieselben Registrierungen und vorbereiteten Routen. Meetings scheitert dadurch nicht mehr am doppelten Ablauf `offline:prepareRouteAssets`.

## Gemeinsame obere Hinweise

Der Host stellt `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` vor dem Einhängen von Anbietern und Seiten bereit. Beschreibungen enthalten den Klartexttitel `title`, bereinigtes `bodyHtml`, vertrauenswürdiges `actionsHtml` und die Variante `info`, `success`, `warning` oder `danger`. Der Rückgabewert bietet `element` und `remove()`. Dieselbe ID ersetzt nur den eigenen Hinweis; ein älterer Aufräumaufruf entfernt keinen Ersatz. `signal` bindet die Lebensdauer. Niedrigere Prioritäten erscheinen zuerst. Titel werden maskiert; Anbieter müssen Rich Text bereinigen.

Offline-Modus und Broadcast verwenden einen gemeinsamen fixierten Stapel ganz oben im Dokument über dem App-Kopf. Offline-Modus hat Vorrang, ist nicht schließbar und behält Verbindungsprüfung und Aktualisieren nach Wiederherstellung. Das Entfernen einer Ankündigung entfernt Offline-Modus nicht. Broadcast überspringt Netzwerkanfragen ohne Verbindung; sein Anbieter entfernt beim Beenden Leiste und Timer.

## Leere Offline-Lernseiten

Vorbereitete Study-Seiten bleiben in einer bestätigten Offline-Sitzung mit gültiger Zustimmung auch ohne private Inhalte erreichbar. Fehlende Sprach- und Präferenzdaten ergeben eine leere Navigation. Explore zeigt seine normale leere Ansicht und den gezielten Hinweis „Keine offline gespeicherten Inhalte verfügbar“ statt einer nicht verfügbaren Route oder Fehlermeldungen. Flashcards behält eine leere Seite, wenn Kartendaten oder notwendige Ansichtsressourcen fehlen. Hinweise sind an die Seite gebunden und werden nicht doppelt angezeigt. Cache-Fehler verbergen keine Zugriffs- oder Zustimmungsverweigerung. Library und Flashcards bereiten öffentliche Übersetzungen und kleine Vorlagen online vor; private Daten bleiben in begrenzten tablokalen Caches.

## Direktes Laden und Stile

Direktes Laden und Aktualisieren behalten ihre Seitenstile, während Offline-Assets vorbereitet werden. Host- und Komponenten-Builds bewahren die Quellidentität der Stylesheets; logische und erzeugte URLs teilen sich dieselbe Verwaltung. Asset-Antworten warten nicht mehr auf Cache-Schreibvorgänge im Hintergrund; Fehler werden protokolliert und verzögern die Auslieferung nicht. Webfonts werden getrennt vom Design geladen, damit ein nicht erreichbarer Schriftserver weder die Seite noch das Laderad blockiert. Die gewählte Schrift wird angewendet, sobald sie verfügbar ist; währenddessen gilt der vorhandene Browser-Ersatz.
