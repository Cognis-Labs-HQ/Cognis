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

Die native Schließen-/Neuladen-Warnung schützt nur Datensätze, die in der aktuellen Seite und Sitzung neu erstellt wurden. Nach einem echten Neuladen ist die Warnung zurückgesetzt; gespeicherte Aufträge bleiben zur Wiederholung erhalten. Neue bewusste Änderungen aktivieren sie erneut. Study-Gesehen-Markierungen und Analysen sind Hintergrundaktivitäten ohne Warnung. Datensätze anderer Tabs, bereits gespeicherte Aufträge und bloßes Rendern lösen keine Warnung aus. Der Abbau eines Providers hebt den Schutz aktueller Seitenänderungen bis zur Übertragung oder Entfernung nicht auf.

## Entsperren und Modulladen

Die Entsperrung bleibt beim Neuladen im selben authentifizierten Tab und derselben Sitzung erhalten. Das Passwort verschlüsselt weiterhin den Tresor; weder Passwort noch unverschlüsselter Entschlüsselungsschlüssel werden gespeichert. Der Sitzungsspeicher enthält nur eine mit AES-GCM verschlüsselte Entsperrung, deren Schlüssel mit HKDF aus dem aktiven Sitzungsgeheimnis abgeleitet und an Ursprung, Konto, serverseitige Kontoinstanz und Sitzung gebunden ist. Vor Wiederherstellung muss der Server diese Bindung bestätigen. Endliche Sperrfristen sind authentifiziert und bleiben beim Neuladen absolut. Sperren, Abmelden, Konto-, Instanz- oder Sitzungswechsel und Ablauf verhindern die Wiederherstellung. Nach Schließen des Tabs oder Beginn einer neuen Sitzung ist erneutes Entsperren nötig. Der alte unverschlüsselte IndexedDB-Cache bleibt stillgelegt.

Die Vorbereitung von Routen-Assets registriert ihren Ablauf und ihre Cache-Funktionen einmal pro gemeinsamem ctx. Gebündelte Skripte und Quellimporte externer Module verwenden dieselben Registrierungen und vorbereiteten Routen. Meetings scheitert dadurch nicht mehr am doppelten Ablauf `offline:prepareRouteAssets`.

## Gemeinsame obere Hinweise

Der Host stellt `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` vor dem Einhängen von Anbietern und Seiten bereit. Beschreibungen enthalten den Klartexttitel `title`, bereinigtes `bodyHtml`, vertrauenswürdiges `actionsHtml` und die Variante `info`, `success`, `warning` oder `danger`. Der Rückgabewert bietet `element` und `remove()`. Dieselbe ID ersetzt nur den eigenen Hinweis; ein älterer Aufräumaufruf entfernt keinen Ersatz. `signal` bindet die Lebensdauer. Niedrigere Prioritäten erscheinen zuerst. Titel werden maskiert; Anbieter müssen Rich Text bereinigen. Gemeinsame obere Banner behalten beim Scrollen einen undurchsichtigen, an das Design angepassten Hintergrund. Hinweise zu wiederhergestellter Verbindung, Warnungen und Gefahren verwenden die vorhandenen Designfarben.

Offline-Modus und Broadcast verwenden einen gemeinsamen fixierten Stapel ganz oben im Dokument über dem App-Kopf. Offline-Modus hat Vorrang, ist nicht schließbar und behält Verbindungsprüfung und Aktualisieren nach Wiederherstellung. Das Entfernen einer Ankündigung entfernt Offline-Modus nicht. Broadcast überspringt Netzwerkanfragen ohne Verbindung; sein Anbieter entfernt beim Beenden Leiste und Timer.

## Leere Offline-Lernseiten

Vorbereitete Study-Seiten bleiben in einer bestätigten Offline-Sitzung mit gültiger Zustimmung auch ohne private Inhalte erreichbar. Fehlende Sprach- und Präferenzdaten ergeben eine leere Navigation. Explore zeigt seine normale leere Ansicht und den gezielten Hinweis „Keine offline gespeicherten Inhalte verfügbar“ statt einer nicht verfügbaren Route oder Fehlermeldungen. Flashcards behält eine leere Seite, wenn Kartendaten oder notwendige Ansichtsressourcen fehlen. Hinweise sind an die Seite gebunden und werden nicht doppelt angezeigt. Cache-Fehler verbergen keine Zugriffs- oder Zustimmungsverweigerung. Library und Flashcards bereiten öffentliche Übersetzungen und kleine Vorlagen online vor; private Daten bleiben in begrenzten tablokalen Caches.

## Direktes Laden und Stile

Direktes Laden und Aktualisieren behalten ihre Seitenstile, während Offline-Assets vorbereitet werden. Host- und Komponenten-Builds bewahren die Quellidentität der Stylesheets; logische und erzeugte URLs teilen sich dieselbe Verwaltung. Asset-Antworten warten nicht mehr auf Cache-Schreibvorgänge im Hintergrund; Fehler werden protokolliert und verzögern die Auslieferung nicht. Webfonts werden getrennt vom Design geladen, damit ein nicht erreichbarer Schriftserver weder die Seite noch das Laderad blockiert. Die gewählte Schrift wird angewendet, sobald sie verfügbar ist; währenddessen gilt der vorhandene Browser-Ersatz.

## Öffentliche Assets vorbereiten

Der Host stellt `ctx.capabilities.get("offline:assets")` mit `prepare(paths, { signal })` und `register(paths, { signal })` bereit. Beide nutzen den gestuften Ablauf `offline:prepareAssets`. Die Registrierung startet die Vorbereitung im Hintergrund, wiederholt sie bei Verbindungs- oder Einstellungsänderungen und liefert eine Wiederholungsfunktion. Nur öffentliche, wurzelrelative Pfade unter `/static/` oder `/assets/` sind erlaubt; Anfragen senden keine Zugangsdaten und lehnen private/no-store-Antworten ab. Vier parallele Aufgaben lesen die Antwortinhalte. Gleichzeitige Anfragen werden je Besitzersignal zusammengeführt, Fehler bleiben wiederholbar und ein Abbruch beendet Arbeit und Listener. Private API-Daten werden nicht gespeichert und Offline-Zugriff wird nicht gewährt. `restoreRead`-Rückrufe im Offline-HTTP-Client laufen nur nach einem autorisierten Cache-Fehltreffer und verwenden denselben geschützten Snapshot-Leser. Zugriffsverweigerungen werden nie in leere oder vorgemerkte Ansichten umgewandelt.

Die Vorbereitung bleibt bei deaktiviertem Offline-Modus, fehlender Verbindung oder ausstehender erforderlicher Einwilligung inaktiv. Die Registrierung wiederholt sie auch nach Einwilligungsänderungen und einem Wechsel des Worker-Controllers. Erfolgreiche Arbeit ist an Besitzer und Worker gebunden; eine Vorbereitung ohne Controller verhindert das erneute Laden nach der Übernahme durch den Worker nicht.

## Dauerhaft vorgemerkte Änderungen

Sobald eine Änderung dauerhaft vorgemerkt ist, machen Fehler bei optionaler Aktivitätserfassung oder Ansichtsaktualisierung sie nicht zu einer fehlgeschlagenen Änderung. Kalender öffnet Details aus zwischengespeicherten Terminlisten, einschließlich neuer vorgemerkter Termine und späterer Änderungen. Gleichzeitige Terminübermittlungen teilen sich eine Anfrage. Nachrichten löschen den Entwurf erst nach Bestätigung oder Speicherung; ein Fehler beim Aktualisieren des Chats erhält diesen Beleg. Auch Profiltext, Beiträge und Bilder behalten ihren abgeschlossenen Status bei Ansichtsfehlern. Die Verfügbarkeitsanzeige verzögert keine abgeschlossenen Kalenderänderungen.

Fehler im Anbieterlebenszyklus protokollieren jetzt den betroffenen Skriptpfad ohne Abfragedaten und die fehlgeschlagene Import- oder Bereitstellungsphase. Fehler optionaler Aktivitätserfassung werden getrennt von der dauerhaft gespeicherten Benutzeraktion protokolliert.

## Offline-Verfügbarkeit

Die Offline-Routenregistrierung bleibt bei wiederholten gebündelten und direkt ausgelieferten Importen erhalten. Vorbereitete Routen behalten ihre Verfügbarkeit bei neu erzeugten Beschreibungen mit denselben Skripten, Stilen und Funktionsanbietern; geänderte Assets müssen erneut vorbereitet werden. Nachrichten bereitet Chatlisten, Übersetzungen und Emoji-Kataloge nach bestätigter Anmeldung vor. Die Seite kann vor dem ersten Online-Besuch offline geöffnet werden. Automatisch öffnen nur zwischengespeicherte Chats mit zwischengespeichertem Verlauf; ein nicht gespeicherter Verlauf zeigt einen gezielten Informationstoast. Explore behält verfügbare Sammlungen, wenn eine andere Sammlung oder der Gelesen-Status fehlt. Zugriffs- und Einwilligungsverweigerungen werden weiterhin weitergegeben. Banneraktionen stehen direkt in der gemeinsamen Aktionszeile und verlieren den geerbten vertikalen Versatz.

## Gemeinsame Lernfavoriten

Der Study-Anbieter stellt `study:favourites` mit lebenszyklusgebundenen Operationen `load`, `toggle` und `has` bereit. Darstellungsfunktionen verwenden diese ctx-Funktion statt eines eigenen Caches pro Lader. Favoriten werden nach bestätigter Anmeldung vorbereitet, berücksichtigen vorgemerkte Änderungen und teilen konto- und sitzungsgebundenen Zustand zwischen Explore, Lernkarten und wiederholten Importen. Fehlt ein optionaler Favoriten-Snapshot, bleibt die Auswahl mit vorgemerkten Änderungen nutzbar; Inhalte werden nicht verborgen und kein Aktualisierungsfehler angezeigt. Ein Kontowechsel leert die sichtbare Auswahl. Zugriffsverweigerungen gelten niemals als Cache-Fehltreffer.

## Öffentliche Ressourcen im Cache

Gemeinsame Styles für Wiederverwendung, einschließlich Toasts und Sichtbarkeitssteuerung für Geheimnisse, stehen im Startmanifest des Workers sowohl mit logischen als auch gebauten URLs. Calendar bereitet sein verzögert geladenes Status-Stylesheet über seinen Provider vor. Der SPA-Routenkatalog wird über ctx zwischen gebündelten und direkt bereitgestellten Importen geteilt. Dadurch bleiben autorisierte Study-Routen erhalten, wenn ein weiterer Loader den Katalog erstmals offline liest. Private Seitenschnappschüsse bleiben an Konto und Sitzung gebunden; Berechtigungs- und Zustimmungsprüfungen gelten weiterhin.

Öffentliche Ressourcen aus dem Cache werden sofort geliefert. Hintergrundprüfungen bei Bedarf werden zusammengefasst und gedrosselt. Vor einem Austausch werden vollständige Antwortinhalte verglichen; unveränderte Daten bleiben bestehen. Eine Antwort mit älterem Last-Modified-Datum ersetzt keine neuere Datei. Fehlende Dateien, Verbindungsfehler, abgebrochene Übertragungen und fehlgeschlagene Cache-Schreibvorgänge behalten die zuvor vollständige Datei. Geänderte Inhalte ersetzen sie erst nach erfolgreichem atomarem Schreiben. Explizite Zugriffsverweigerung, private/no-store-Antworten, Zustimmungsänderungen und entzogener Modulzugriff setzen die Richtlinien weiterhin durch. API-Antworten und authentifizierte Dokumente bleiben im Worker ausschließlich netzwerkbasiert.

## Dauerhafter Ressourcen-Cache

Der Worker bereitet alle gebauten öffentlichen Seiten-Bundles, dynamischen Chunks, Styles und ausgegebenen Medien vor, ohne Seiten auszuführen oder private Daten abzurufen. Später abgerufene öffentliche Antworten werden automatisch gespeichert. Bei der Aktivierung werden vollständige öffentliche Dateien in die neue Generation übernommen, bevor alter Speicher freigegeben wird. Modulrevisionen werden nur übernommen, wenn der aktuelle Katalog sie erlaubt. Für das Herunterladen öffentlicher Bundles ist kein Seitenbesuch erforderlich. Private Inhalte benötigen weiterhin einen autorisierten, vom zuständigen Provider vorbereiteten Schnappschuss.

## Offline-Arbeitsbereich

Nach bestätigter Anmeldung bereitet Study Schemas, lesbare Speicherorte, Formulare, Gesehen-Markierungen und ausdrücklich erlaubte leichte Sammlungen für eingeschriebene Lern- und Unterrichtssprachen vor. Flashcards bereitet jeden sichtbaren Stapel eingeschriebener Lern- und Unterrichtssprachen mit zwei Workern und ohne Grenze von 80 Stapeln vor. Der eigene Cache ist auf 64 MB und 10.001 Leseeinträge begrenzt, damit Galerie und übliche Stapelsammlungen zusammen hineinpassen; größere Sammlungen unterliegen weiterhin dieser Grenze. Nicht eingeschriebene Sprachen sind ausgeschlossen. Der gemeinsame Schemakatalog wird auch ohne Einschreibung vorbereitet. Fehlende optionale Library-Sammlungen verhindern nicht den Übungsstart eines vorbereiteten Stapels. Änderungen der Einschreibung starten die Vorbereitung erneut. Zwei Worker begrenzen gleichzeitige Lesevorgänge; Provider-Abbau, Kontowechsel, Zugriffsverweigerung und zwischengespeicherte rechtliche Zustimmung bleiben wirksam. Ein vorheriger Seitenbesuch ist nicht erforderlich. Private Schnappschüsse bleiben an den bestätigten Tab und die Sitzung gebunden.

Offline-Profilzugriff erfordert einen vollständig vorbereiteten Schnappschuss des eigenen Profils: Text, Beiträge, Verbindungen, Einstellungen sowie begrenzte Avatar- und Bannerbilder. Fremde Profile sind auch bei vorhandenem Cache gesperrt. Administration, Modules, Users und Shares bleiben offline nicht verfügbar. Settings öffnet seine lokalen Kernfunktionen. Gespeicherte Schrift-, Design-, Sprach-, Zeitzonen- und Anzeigeeinstellungen gelten lokal und werden zur Serverübertragung gepuffert. E-Mail-Verifizierung, Kontoaktionen und beitragende Einstellungen mit Serverbedarf bleiben offline nicht verfügbar.

Die native Schließen-/Neuladen-Warnung schützt nur Datensätze, die in der aktuellen Seite und Sitzung neu erstellt wurden. Nach einem echten Neuladen ist die Warnung zurückgesetzt; gespeicherte Aufträge bleiben zur Wiederholung erhalten. Neue bewusste Änderungen aktivieren sie erneut. Study-Gesehen-Markierungen und Analysen sind Hintergrundaktivitäten ohne Warnung. Datensätze anderer Tabs, bereits gespeicherte Aufträge und bloßes Rendern lösen keine Warnung aus. Der Abbau eines Providers hebt den Schutz aktueller Seitenänderungen bis zur Übertragung oder Entfernung nicht auf.

Der Host stellt `ui:languageCatalog.load` über ctx bereit und bereitet den gemeinsamen Sprachkatalog nach bestätigter Anmeldung vor. Die Kern-Sprachkataloge gehören zum öffentlichen Startbestand. Settings und die Navigationsleiste nutzen denselben lebenszyklusgebundenen Lesezugriff. Das Offline-Speichern einer Sprachpräferenz hält die nutzbare Seite offen und wendet die Präferenz bei späterer clientseitiger Navigation an.

## Offline-Übungen

Die Library-Verwaltung und ihre Bearbeitungs-, Such- und Anfrageseiten benötigen eine Verbindung. Study-Startseite und Untermenü blenden diese Links offline aus, auch unmittelbar nach einem Verbindungsabbruch. Explore bleibt zum Lesen gespeicherter Inhalte und zum Zeichnen verfügbar. Der Library-Provider meldet nur Explore als Offline-Sitzungsroute an.

Die Vorbereitung eingeschriebener Sprachen speichert den gemeinsamen Schemakatalog zusätzlich zu den sprachspezifischen Katalogen. Zeichnen und Flashcards können ihre üblichen Schemaabfragen ohne vorherigen Online-Seitenbesuch nutzen. Flashcards bereitet Share- und Study-Übersetzungen sowie die Galerievorlage vor und liest Sammlungen der ausgewählten Sprache mit denselben schemaqualifizierten Anfragen wie die Einschreibungsvorbereitung. Vorbereitete Stapel öffnen Galerie und Übungen offline. Audio, Wörterbuchabrufe, Inhaltsbearbeitung sowie Zugriffs- und Zustimmungsprüfungen behalten ihre bisherigen Beschränkungen.

## Persönliche Offline-Optionen

Die bestätigte Anmeldung bereitet E-Mail-Liste und Richtlinie vertrauenswürdiger Domains ohne Besuch der Einstellungen vor. Hinzufügen, Entfernen und Auswahl der primären Adresse werden lokal dargestellt und über `notify:emailClient` sowie den geschützten Warteschlangeneigentümer `notify.emails` gespeichert. Die Serverprüfung bleibt maßgeblich. E-Mail-Verifizierung, erneutes Senden und Kontolöschung oder -deaktivierung benötigen eine Verbindung; Codes, Beobachtungstoken und Passwörter gelangen nicht in die Warteschlange. Neue Adressen bleiben bis zur Online-Verifizierung unbestätigt. Erfolgreiche Zustellung aktualisiert den E-Mail-Schnappschuss; optionale Aktualisierungsfehler machen gespeicherte Änderungen nicht nachträglich zu Fehlern. Die begrenzten privaten Schnappschüsse sind an Tab und Sitzung gebunden.

## Vorbereitete Lernkarten

Flashcards bereitet jeden sichtbaren Stapel eingeschriebener Lern- und Unterrichtssprachen mit zwei Workern und ohne Grenze von 80 Stapeln vor. Der eigene Cache ist auf 64 MB und 10.001 Leseeinträge begrenzt, damit Galerie und übliche Stapelsammlungen zusammen hineinpassen; größere Sammlungen unterliegen weiterhin dieser Grenze. Nicht eingeschriebene Sprachen sind ausgeschlossen. Der gemeinsame Schemakatalog wird auch ohne Einschreibung vorbereitet. Fehlende optionale Library-Sammlungen verhindern nicht den Übungsstart eines vorbereiteten Stapels.

## Orbitron offline

Orbitron wird als variable Schrift mit Gewichten 400–900 von Google Fonts unter der SIL Open Font License in `src/ui/styles/fonts/OFL.txt` mitgeliefert. Stylesheet und Schriftdatei werden vor dem Offline-Wechsel vom öffentlichen Worker vorbereitet. Zwischengespeicherte öffentliche Ressourcen werden online und offline zuerst verwendet; bestehende gebündelte Hintergrundprüfungen aktualisieren veränderliche Ressourcen. Orbitron benötigt zur Laufzeit keine Google-Anfrage. Andere optionale Google-Schriften laden getrennt und verzögern die lokale Schrift nicht.

## Konfigurierbare obere Banner

Der Deskriptor von `ui:broadcast.publish` akzeptiert eine CSS-Hintergrundfarbe oder einen Verlauf über `background` sowie das boolesche Flag `collapsible`, dessen Standardwert false ist. Ungültige Deskriptortypen und Hintergrundwerte, die Deklarationen aufbrechen, werden abgelehnt. Ein einklappbares Banner schrumpft beim Herunterscrollen auf einen gemusterten Streifen von 2 px, öffnet sich beim Hochscrollen und bleibt per Tastatur fokussierbar. Mauszeiger oder Tastaturfokus zeigen Inhalt und Aktionen. Der Stapel reserviert seinen aufgeklappten Platz im Dokument gegen Scrollsprünge; seine sichtbare Höhe verschiebt den fixierten Kopfbereich und die Seitenleiste. Nicht einklappbare Banner bleiben vollständig sichtbar. Beim Entfernen des letzten Banners werden Beobachter, Scrolllistener und Layoutversätze freigegeben. Der Offline-Modus verwendet ein orange-weißes Warnmuster und klappt ein; nach Wiederverbindung bleibt die geschützte Aktualisieren-Aktion erhalten.

## Sanfte Übergänge und Navigation

Der Offline-Hinweis verwendet einen schmalen orange-weißen Streifen über einer undurchsichtigen Designfläche. Einklappbare Banner animieren die Höhe ihres abgeschnittenen Rahmens und die Deckkraft des Inhalts, während ihr natürlicher Platz im Dokument erhalten bleibt. Tastaturbedienung bleibt möglich; reduzierte Bewegung deaktiviert Übergänge. Öffentliche Ressourcen einschließlich des beim Start vorbereiteten Webmanifests dürfen vor rechtlicher Zustimmung aus dem Cache geladen werden; private Dokumente und API-Daten behalten ihre Zugriffsprüfungen. Bei ausdrücklich deaktiviertem Offline-Modus wird weiterhin das Netzwerk verwendet. Ein einzelner Ressourcenfehler löst erst nach fehlgeschlagener Zustandsprüfung den Offline-Modus aus. Nach Bestätigung prüft der Worker erst wieder, wenn die Wiederherstellung seinen Katalog aktualisiert. Study verwendet bestätigte Sitzungsschnappschüsse sofort und prüft sie gebündelt höchstens alle dreißig Sekunden neu. Neue Metadatenanfragen sind auf fünf Sekunden begrenzt, optionale Wörterbucherkennung auf drei Sekunden. Verbindliche Zugriffsverweigerungen löschen Schnappschüsse; Einschreibungs- und Moduländerungen verwerfen Navigationsdaten, und fehlgeschlagene Unterseitenerkennung kann erneut versucht werden.
