# TFA-Gateway & TOTP

## Neues TFA-Gateway

Ein dediziertes `tfa`-Gateway mit Adapter-Erkennung unter `src/adapters/tfa/*`, Benutzer-Methoden-APIs, Recovery-Code-APIs und Admin-Reset-Endpunkten wurde hinzugefügt.

## TOTP-Adapter Hinzugefügt

Ein `totp`-Adapter unter `src/adapters/tfa/totp` mit Setup-Verifizierung und Login-Code-Verifizierung wurde ergänzt.

## Login und Sicherheit Integriert

Login- und Sicherheitsabläufe wurden für Zwei-Faktor-Prompts, erzwungene Setup-Weiterleitungen, TFA-Erzwingung in der Administration und benutzerbezogene TFA-Resets aktualisiert.

## TOTP-Algorithmus-Dropdown

Das Admin-Konfigurationsfenster des TOTP-Adapters zeigt jetzt ein HMAC-Algorithmus-Dropdown (SHA1, SHA256, SHA512) anstelle nicht bearbeitbarer Metadaten. Der gewählte Algorithmus wird bei der QR-Code-Generierung und Code-Verifizierung verwendet.

## TFA-Methoden als Tabellenlayout

Die Panels für verfügbare und bevorzugte Zwei-Faktor-Methoden verwenden jetzt das tabellenbasierte Drag-and-Drop-Layout wie die Spracheinstellungen, wodurch der Leerplatzhalter und das Drop-Zonen-Problem behoben werden.

## Verzögerte TFA-Methoden-Änderungen

Das Verschieben von Methoden zwischen „Verfügbar" und „Bevorzugt" speichert Änderungen lokal; Setup-Dialoge und API-Aufrufe erfolgen erst beim Speichern der Einstellungen.

## Wiederherstellungscodes-Tooltip

Ein Tooltip neben der Überschrift „Wiederherstellungscodes" erklärt, dass diese Codes den Kontenzugriff ermöglichen, wenn konfigurierte Methoden nicht verfügbar sind.

## Warnmeldung bei Deaktivierung einer Methode

Das Verschieben einer TFA-Methode von „Bevorzugt" nach „Verfügbar" zeigt jetzt eine Warnmeldung mit dem Methodennamen. Das Häkchen (✓) erscheint nur noch bei Methoden in der Tabelle „Bevorzugt".

## Erzwungener Setup-Dialog: Abstands-Korrektur

Der Abstand zwischen Anweisungstext und Methoden-Dropdown im Pflicht-TFA-Setup-Dialog wurde korrigiert.

## Nacharbeit aus dem Review

SHA256 wurde als Standardalgorithmus für TOTP gesetzt, der benutzerseitige Anzeigename des TOTP-Adapters wurde verkürzt, die TFA/TOTP-Dokumentation wurde erweitert, die QR-SVG-Objekt-URL-Erzeugung wurde nach `src/ui/reuse/qr-image-source.js` verschoben und die Security-Skriptregistrierung auf `/static/gateways/auth/security-prefs/index.js` umgestellt.

## Erzwingung und Besitzordnung Korrigiert

Der Deaktivierungsstatus von TFA-Adaptern bleibt jetzt über Neustarts erhalten, Recovery-Codes werden atomar verbraucht, Konten mit verpflichtender TFA-Einrichtung erhalten nur noch Setup-ausstehende Tokens ohne Zugriff auf geschützte Nicht-TFA-APIs, und TFA-bezogene Browser-Strings, Helfer und Styles wurden in die statischen Assets des TFA-Gateways bzw. TOTP-Adapters verschoben.

## TFA-Einstellungen im Sicherheitsbereich Integriert

Zwei-Faktor-Authentifizierungs-Einstellungen erscheinen jetzt unter Benutzereinstellungen → Sicherheit, bereitgestellt durch das TFA-Gateway über die Fähigkeit `auth:registerSecuritySection` anstatt als eigener Navigationspunkt.

## Administrations-Seite Korrigiert

Ein fehlender `extendI18n`-Import, der dazu führte, dass die Administrations-Seite bei der Navigation fehlschlug, wurde behoben.

## Strings für TFA-Reset bei Benutzern Korrigiert

Die fehlenden Schlüssel `ui.app.users.reset_tfa` und `ui.app.users.tfa_reset_done` wurden in die zentralen UI-Sprachdateien aufgenommen, damit Aktionsmenü und Erfolgs-Toast auf der Benutzerseite korrekt lokalisiert angezeigt werden.

## Login-Regression Korrigiert

Die verpflichtende E-Mail-Prüfung nach dem Login wurde wiederhergestellt und in einen Notify-Gateway-eigenen Login-Helper verlagert, sodass die Login-Seite keine direkte E-Mail-Routenverdrahtung mehr enthält und das erforderliche Validierungsverhalten erhalten bleibt.

## TFA-Setup-Weiterleitung und Sicherheitszugriff

Benutzer mit Tokens für ausstehendes TFA-Setup werden direkt zu `/settings#security` geleitet. Das vollständige Chrome der Einstellungsseite (Navigationsleiste, Kopfzeile, Fußzeile) bleibt während des erzwungenen Setup-Ablaufs sichtbar, damit der Benutzer eine korrekt gerenderte Seite zur Konfiguration seines zweiten Faktors vorfindet. Die Auth-Sicherheitsunterbereiche sowie alle TFA-API-Pfade sind für Setup-ausstehende Tokens freigegeben. Außerdem wird der Sub-Composer-ResizeObserver mit dem initialen Spaltenwert initialisiert, sodass eine Layout-Messung bei der ersten Beobachtung kein redundantes Re-Render auslöst, das das Setup-Popup erneut öffnen könnte.

## TFA in Admin zurück unter Sicherheit

Die TFA-Einstellungen der Administration werden jetzt wieder innerhalb von Administration → Sicherheit angezeigt, statt als eigener oberster Administrationsbereich.
