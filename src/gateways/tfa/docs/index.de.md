# TFA Gateway

Adapter-Sprachressourcen werden aus installierten Methoden statt einer festen Anbieterliste ermittelt. Methoden melden `invalid_verification_code` über den gemeinsamen Fehlervertrag; ausstellerspezifische Konfiguration bleibt beim Adapter.

Eine unvollständige Einrichtung ist sofort geschützt, auch bevor ein Code eingegeben wird. Hintergrundklick, Escape, Schließen, Abbrechen und SPA-Navigation verwenden die gemeinsame Verwerfen-Bestätigung; beim Beibehalten kehrt der Fokus zurück. Die Navigation wird erst nach dem Abbruch fortgesetzt. Beim Neuladen warnt der Browser. Beim Entfernen des Einstellungsbereichs werden Ereignisbehandler und Dialoge entfernt; verpflichtende Einrichtung bleibt serverseitig durchgesetzt.

## Überblick

Das TFA-Gateway besitzt alle Zwei-Faktor-Funktionen in Cognis. Es entdeckt Methodenadapter unter `src/adapters/tfa/`, speichert Adapterzustand und Recovery-Codes, entscheidet über verpflichtende Einrichtung und verifiziert zweite Faktoren beim Login.

Das Auth-Gateway kennt keine TOTP- oder zukünftigen Methodendetails. Es prüft nur den primären Anmeldeschritt und nutzt danach die vom TFA-Gateway bereitgestellten Capabilities.

## Aufgaben

- TFA-Adapter aus `src/adapters/tfa/*` entdecken.
- Adapterkonfiguration und Aktivierungszustand speichern.
- Gespeicherten Adapterzustand laden, ohne deaktivierte Adapter wieder zu aktivieren.
- Setup-, Aktivierungs-, Präferenz- und Recovery-Code-Routen bereitstellen.
- Verpflichtende Einrichtung erzwingen, wenn globale TFA-Pflicht aktiv ist.
- Login-Challenges prüfen und Recovery-Codes atomar verbrauchen.
- Eigene Settings-/Admin-UI und statische Assets registrieren.
- Challenge-Auslösung (z. B. SMTP-E-Mail-Versand) verzögern, bis der Nutzer bei mehreren verfügbaren Methoden eine explizit auswählt.

Nicht zuständig für: Passwortregeln, Primäranmeldung oder Kontoerstellung.

## Architektur

`src/gateways/tfa/gateway.ts` definiert `CoreTfaGateway`. Diese Klasse verwaltet Adapter, delegiert methodenspezifisches Setup und Login-Verify an Adapter und zentralisiert gemeinsame Richtlinien wie Recovery-Codes, bevorzugte Methoden und globale Erzwingung.

Bootstrap in `src/gateways/tfa/bootstrap.ts`:

1. `DbTfaStore` erzeugen und Schema sicherstellen.
2. Adapter unter `src/adapters/tfa/` entdecken.
3. Persistierte Adapterkonfiguration laden.
4. API- und Adapter-Adminrouten registrieren.
5. TFA-eigene Settings-/Admin-UI registrieren.
6. TFA-Capabilities für Auth und andere Gateways beitragen.

## Capabilities

Das Gateway registriert diese Capabilities über `ctx.capabilities`:

- `tfa:getUserStatus(accountId)`
- `tfa:getLoginMethods(accountId, lifetime)`
- `tfa:verifyLogin(accountId, methodId, payload, lifetime)`
- `tfa:isSecondFactorEnabled(accountId)`
- `tfa:isSetupRequired(accountId)`
- `tfa:resetUser(accountId)`
- `tfa:getEnforceAllUsers()`
- `tfa:setEnforceAllUsers(required)`

Diese Oberfläche ist der unterstützte Integrationspunkt. Andere Komponenten dürfen keine TFA-Adapter-Interna direkt importieren.

`tfa:getLoginMethods(accountId, lifetime)` löst eine Login-Challenge (z. B. SMTP-E-Mail) nur aus, wenn genau eine Methode für den Nutzer konfiguriert ist. Bei mehreren Methoden enthält die Antwort nur Methodenidentitäten ohne Challenge-Daten. Die Login-UI löst die Challenge über `POST /api/v1/tfa/login/resend` on-demand aus, sobald der Nutzer eine Methode explizit auswählt.

## API-Routen

| Methode | Pfad                                   | Beschreibung                             | Auth   |
| ------- | -------------------------------------- | ---------------------------------------- | ------ |
| `GET`   | `/api/v1/tfa/status`                   | Setup-Status des aktuellen Nutzers lesen | Bearer |
| `GET`   | `/api/v1/tfa/methods`                  | Methoden- und Recovery-Metadaten lesen   | Bearer |
| `POST`  | `/api/v1/tfa/methods/:id/setup/begin`  | Methodensetup starten                    | Bearer |
| `POST`  | `/api/v1/tfa/methods/:id/setup/verify` | Setup verifizieren                       | Bearer |
| `POST`  | `/api/v1/tfa/methods/:id/setup/cancel` | Setup abbrechen                          | Bearer |
| `POST`  | `/api/v1/tfa/methods/:id/enable`       | Gespeicherte Methode aktivieren          | Bearer |
| `POST`  | `/api/v1/tfa/methods/:id/disable`      | Methode deaktivieren                     | Bearer |
| `PUT`   | `/api/v1/tfa/methods/preferences`      | Bevorzugte Reihenfolge speichern         | Bearer |
| `GET`   | `/api/v1/tfa/recovery-codes`           | Recovery-Code-Status lesen               | Bearer |
| `POST`  | `/api/v1/tfa/recovery-codes/rotate`    | Recovery-Codes ersetzen                  | Bearer |
| `POST`  | `/api/v1/tfa/admin/users/:id/reset`    | TFA-Zustand eines Nutzers zurücksetzen   | Admin  |
| `GET`   | `/api/v1/gateways/tfa/adapters`        | Registrierte Adapter auflisten           | Admin  |

## UI-Zuständigkeit

TFA-Browserassets liegen unter `src/gateways/tfa/ui/`. Das Gateway registriert seinen eigenen Einstellungsbereich, Administrationsbereich und statische Assets selbst. TOTP-spezifische Strings verbleiben beim TOTP-Adapter unter `src/adapters/tfa/totp/languages/`.

## Adapter-Vertrag

Jeder Adapter unter `src/adapters/tfa/<adapter-id>/` implementiert methodenspezifisches Setup und Verifikation. Gemeinsame Abläufe wie Recovery-Codes, Präferenzreihenfolge und globale Erzwingung bleiben im Gateway, damit neue Methoden ohne Richtlinien-Duplikate ergänzt werden können.

## Getrennte TFA-Verwerfungsfragen

Nach bestätigtem Abbruch der Einrichtung wird die Navigation erneut an die übrigen Seitenschutzfunktionen übergeben. Das Verwerfen der Einrichtung verwirft keine anderen Einstellungsänderungen. Ihr Beibehalten stoppt die Navigation; erst ihre ausdrückliche Verwerfung setzt sie fort. Eine entfernte Seite kann eine gespeicherte Navigation nicht wieder aufnehmen.

## Methodendarstellung

Jede Methode liefert `stringsBaseUrl` und `loginUi` mit `placeholderKey`, `supportsResend` und `challengeOnSelect`. Die Anmeldeoberfläche verwendet diese Metadaten statt Verzweigungen nach Anbieterkennungen. Konfigurationsbeschriftungen sind Übersetzungsschlüssel des Anbieters.

Antworten für Anmeldecodes können `maxLength` enthalten: eine positive ganze Zahl für die Länge des ausgegebenen Codes. Das Gateway reicht diese Metadaten auch bei erneutem Senden an die Anmeldeoberfläche weiter. Solange der Code aktiv ist, dürfen Verbraucher die Angabe nicht durch eine neuere Anbietereinstellung ersetzen. Ein Ersatzcode liefert seine eigene Länge. Diese Darstellungsmetadaten erzeugen keine Codelängeneinstellung des Gateways.

Die Anmeldeoberfläche behält einen gültigen absoluten Zeitpunkt `resendAvailableAt` beim Anzeigen oder Fortsetzen einer ausgegebenen Challenge bei, auch wenn dieser Zeitpunkt bereits verstrichen ist. Nur bei fehlendem oder ungültigem absoluten Zeitpunkt verwendet sie eine positive Dauer `retryAfterSeconds` ab dem aktuellen Anzeigezeitpunkt. Bis zur Freigabe bleibt die Aktion zum erneuten Senden deaktiviert und unterdrückt Anfragen. Die Freigabe sendet keinen Code automatisch und ersetzt keine ausgegebene Challenge; der Server entscheidet weiterhin über Versandlimits und Codeprüfung.

Die Vertragsregistrierung von Adaptern folgt dem [gemeinsamen Gateway-Bootstrap-Vertrag](/docs/gateways).

## Steuerung der Adapterverwaltung

Der ausschließlich für Administratoren zugängliche Adapterkatalog unter `GET /api/v1/gateways/tfa/adapters` veröffentlicht für jede Methode die Endpunkte `config`, `enable` und `disable`. Komponentenbefehle verwenden diese veröffentlichten Endpunkte für einzelne und gebündelte Aktionen, statt Routen zu erraten. Das Gateway prüft Administratorrechte sowohl beim Katalog als auch bei jeder Aktion. Eine Testaktion wird nicht angeboten, da das Gateway keine implementiert.

## Abgesicherter Sitzungsstart

Die Fähigkeit `tfa:assessSession` der Version 1 führt die TFA-eigenen Stufen `readPolicy` und `resolveChallenge` aus, bevor Auth eine Sitzung ausstellt. Aktive Einrichtungen bleiben bei Anbieterausfällen erforderlich; Wiederherstellungscodes bleiben verfügbar. Nur gespeicherte administrative Deaktivierung hebt die Anbieterpflicht auf. Fehlende oder fehlerhafte optionale Herausgebermetadaten deaktivieren keinen gültigen Adapter. Fehler im Statusspeicher oder fehlende Prüfung bei einem bekannten aktiven Gateway sperren die Anmeldung. Der Gateway erfasst seine Richtlinienidentität vor der Initialisierung, damit Fehler nicht wie bewusste Abwesenheit wirken. Faktorprüfung und Einrichtungsabschluss rufen `auth:completeSession` auf; gleichzeitige Abschlüsse verbrauchen jeden ausstehenden Versuch nur einmal. Während weiterer Prüfung werden weder gewöhnliche Tokens ausgestellt noch Profile aktiviert. Auth besitzt abschließende Lebenszyklusprüfung, Tokenausstellung und Bereinigung ausstehender Anmeldungen. Details zu `auth:login` und zum Sitzungsabschluss stehen in der Auth-Dokumentation.

Der Host behält außerdem nicht ausführbare Fehlernachweise für gefundene Gateways, deren gültiges Manifest sie identifiziert, deren Bootstrap aber nicht importiert werden kann. Nur erfolgreicher Bootstrap löscht diesen Nachweis. Rückabwicklung entfernt ausführbare Routen und Prüfungshooks; bewusste Deaktivierung bleibt erlaubt, erneute Aktivierung ohne erfolgreiche Initialisierung sperrt den Zugriff. Fehlende oder ungültige Manifeste ohne nutzbare Identität werden dadurch nicht klassifiziert. Auth-Aufrufer verwenden die Fähigkeit `auth:login` der Version 1 statt roher Vorbereitungsabläufe.

## Typisierte Authentifizierungsgrenzen

Die Deklarationen von Auth und TFA beschreiben die bestehenden Kontorollen, externen Identitätsfelder, Datenbankbefehle und Cookie-Sitzungsdaten. Die Prüfung des Sitzungslimits akzeptiert dieselben Zahlenwerte. Die Anmeldeabsicherung und einmalig verwendbare Faktorversuche bleiben unverändert.

## TFA-Richtlinienänderungen

Alle Zugänge zur TFA-Erzwingung verwenden den zuständigen Richtlinienablauf. Das Abschalten widerruft sämtliche Token mit ausstehender Einrichtung, einschließlich älterer Token des handelnden Administrators; normale Sitzungen bleiben erhalten. Die Bereinigung erfolgt vor dem Schreiben der Richtlinie und kann wiederholt werden. Fehlende Anbieter oder Schreibfehler melden einen Fehler; Tokendatei und Datenbank bilden keine gemeinsame Transaktion. Nach einem Richtlinienfehler können die strengere Richtlinie und bereits widerrufene Token bestehen bleiben. Lokaler atomarer Dateiersatz garantiert weder Schutz vor Hardwareausfällen noch Synchronisierung mehrerer Serverprozesse.

Während eines serialisierten Richtlinienschreibvorgangs setzt TFA neue Sitzungsprüfungen aus und macht zuvor erteilte Prüfzusagen ungültig. Laufende Richtlinienabfragen können nach der Bereinigung keine eingeschränkten Token ausstellen; normale Sitzungen benötigen eine aktuelle Bestätigung. Der Einrichtungsabschluss prüft vor dem endgültigen Abschluss erneut die ursprüngliche Berechtigung. Ein während der Faktorprüfung widerrufenes Token kann daher keine Sitzung erhalten.

Der Richtlinienablauf verlangt einen einmaligen Vorgang und Ausführungszustand unter Kontrolle seines Eigentümers. Direkte Ablaufaufrufe und die Wiederholung erfasster Vorgänge werden vor Änderungen abgewiesen; Integrationen müssen die Richtliniencapability verwenden.

## Zeitlich begrenzte Challenge-Zustellung

Methodenadapter erhalten verpflichtend `lifetime: { id, expiresAt, signal }` für Einrichtung, Login-Challenge und Login-Prüfung. Aufrufer von `tfa:getLoginMethods(accountId, lifetime)` und `tfa:verifyLogin(accountId, methodId, payload, lifetime)` müssen migriert werden. Eine Einrichtung erhält vor dem ersten asynchronen Lesen ihre eigene Zehn-Minuten-Frist. Auth liefert die Login-Lebensdauer über `auth:getPendingLoginLifetime` Version 1. Abbruch, Ablauf, Speicherfehler, Deaktivierung, Zurücksetzen und Gateway-Bereinigung entwerten den genauen Vorgang. Alte Lesevorgänge bleiben auch nach erneuter Aktivierung ungültig. Vor Beginn des Schreibens lässt sich die Prüfung abbrechen; danach warten Abbruch und Zurücksetzen auf die weiterhin sichtbare Schreib- und Bereinigungsbarriere. Wiederherstellungscodes prüfen die Lebensdauer auch nach asynchronem Verbrauch. Neustart verliert ausstehende In-Memory-Challenges. Fortgesetzte Login-Beschreibungen sind Momentaufnahmen der Annahme, keine aktuellen Zustellbestätigungen.

### Abschließende Zustandsänderungen koordinieren

Abschlussvorgänge für Konto, Methode und Gateway sperren neue Vorgänge während Bereinigung und Speicherung. Überlappende Vorgänge besitzen jeweils eine eigene Sperre; der Abschluss eines Vorgangs öffnet keinen anderen. Eine fehlgeschlagene Registrierung bleibt ein Prüfungsfehler. Die Bereinigung wartet auf ihr Ende, ohne ein späteres Zurücksetzen oder Deaktivieren an dessen eigener Zustandsänderung zu hindern.

## Autorisierung des Kontoziels

Kontenübergreifende Verwaltung sowie alle TFA-Lesezugriffe mit Zielauswahl, Wiederherstellungscode-Aktionen, Methodenpräferenzen, Aktivierungen/Deaktivierungen und Administrator-Zurücksetzungen erfordern Auths Richtlinie `auth:authorizeAccountTarget` v1. Administratoren dürfen keine anderen Administratoren, Eigentümer oder Gründeradministratoren verwalten. Vom Eigentümer erlaubte Aktionen bleiben verfügbar. Fehlende Richtlinien oder unlesbare Kontometadaten führen vor nachgelagerten Speicherzugriffen zur Ablehnung. Die Benutzerverwaltung verbietet weiterhin Selbstverwaltung; TFA akzeptiert ein weggelassenes oder exakt angegebenes eigenes Ziel. Einrichtung und Methodendetails bleiben auf das eigene Konto beschränkt. Leere, doppelte oder fehlerhafte Zielparameter werden abgelehnt. Verwenden Sie Einstellungen für Ihre eigene Sicherheit und die Benutzerverwaltung für ein zulässiges anderes Konto.
