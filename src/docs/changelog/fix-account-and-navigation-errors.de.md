# Konto- und Sitzungskorrekturen

**Feature-Zweig:** fix-account-and-navigation-errors

## Verträge der Adapter

Gateways stellen ihren Adaptern dieselbe Registry `system:contracts` über `ctx.capabilities` bereit. Adapter können `defineContracts(ctx)` exportieren; der Host ruft die Funktion beim Adapter-Bootstrap vor der Initialisierung auf. Bestehende Bootstrap-Hooks können Verträge auch direkt deklarieren. Auth, Notify, TFA, Social, Study und Calendar verwenden Adapterbereiche; die Fabriklader für DB, Files und Registration unterstützen den Definitions-Hook ebenfalls. Definitionen gehören zu `adapter:<gateway>:<adapter>` und folgen Rollback, Deaktivierung und Reaktivierung des Gateways. Verschachtelte Adapterberechtigungen enden mit dem übergeordneten Bootstrap, auch für abgekoppelte asynchrone Arbeit. Laufzeitanfragen können keine Verträge registrieren. Reine Typimporte aus dem öffentlichen Verzeichnis `contracts/` eines Anbieters dienen der Entwicklung; ausführbare komponentenübergreifende Aufrufe verwenden weiterhin ctx.

SMTP deklariert seine Verträge für E-Mail-Zwecke, Zustellung, Richtlinien und Vorlagenfabriken im eigenen Bootstrap. Laufzeitdefinitionen liegen in `contracts/declarations.ts`, optionale öffentliche Aktionstypen in `contracts/action-delivery.ts`. Das Benachrichtigungs-Gateway deklariert diese Anbieter-APIs nicht; dort bleiben allgemeine Sender- und Zustellbelegtypen. Andere Adapter verwenden denselben Registrierungsmechanismus ohne zusätzliche Core-Dateien.

## E-Mail-Kontrast und Schlüsselbund

E-Mail-Inhalte verwenden einen Blockcontainer statt verschachtelter Absätze um erzeugte Blöcke. Absätze, Codes, Listeneinträge und Tabellenzellen erhalten explizite Themenfarben. Fußzeilen im dunklen Modus und Links im hellen Modus bieten einen lesbaren Kontrast.

Die Schlüsselbund-Einstellungen lesen beim Anzeigen den aktuellen Zustand, auch beim ersten Öffnen nach Anmeldung oder Aktualisierung. Der Aufbau des Einstellungskatalogs speichert kein fehlendes Ergebnis zwischen. Die Darstellung verwendet den bestätigten Zustandsstand; Erstellung und Löschung aktualisieren den sichtbaren Abschnitt. Identitätswechsel und Navigation verhindern weiterhin verspätete Darstellung und schließen sensible Dialoge.

## Erweiterbare Anbieterverträge

Auth-Prüfmodi werden über ctx mit eigenen Funktionen, Verfügbarkeit und UI-Metadaten registriert. Administration erhält nicht verfügbare gespeicherte Auswahlen und prüft Änderungen. Eine allgemeine versionierte Laufzeitregistry ermöglicht Verträge für Gateways, Adapter und externe Module ohne Core-Domänendateien; Modulberechtigungen und Lebenszykluswiderruf bleiben erhalten. Prüfhelfer liegen in gemeinsamer Server-Wiederverwendung und Auth. SMTP besitzt Konfigurationsschema und kombinierbare Vorlagenfabriken mit Moduloptionen. E-Mails verwenden das Empfängerthema, standardmäßig hell, mit maskiertem HTML und Klartext. TFA verwendet Methodenmetadaten und Codelängen-/Intervallrichtlinien des E-Mail-Anbieters. KI-Anweisungen schreiben diesen erweiterungsorientierten Ansatz vor.

## Zuverlässige Benutzerverwaltung

Die Benutzerverwaltung erkennt das aktuelle Konto anhand der gespeicherten Konto-ID, auch bei opaken SSO-Sitzungen. Eigene Kontosteuerungen beachten den Serverschutz. Fehler beim Laden von Kontodetails verwenden eine eigene Übersetzung. Eine fehlgeschlagene Aktualisierung macht eine bestätigte Änderung nicht zum Speicherfehler; die bisherige Liste bleibt mit einer Aktualisierungswarnung sichtbar.

## Profilbearbeitung und Rollen

Profilformulare verwenden die komponenteneigenen Grenzen für Anzeigename, Biografie, Ort und Webseite. Die Rollensynchronisierung ermittelt den öffentlichen Profilnamen anhand der unveränderlichen Konto-ID, bevor Rolle und Sichtbarkeit aktualisiert werden.

Beim Speichern des Profils wird vor dem Schließen des Editors die vorhandene Formularvalidierung ausgeführt. Der Anzeigename ist erforderlich; reine Leerzeichen werden abgelehnt.

## Reaktionsfähige Sitzungsnavigation

Die Abmeldung löscht private Sitzungsdaten, ohne auf die öffentliche Routenpflege des Service-Workers zu warten. Identische Richtlinienanfragen teilen einen Austausch; geänderte Zugriffsentscheidungen bleiben getrennt. Der Sprachschalter wartet auf seinen Kataloganbieter und blendet kontogebundene Steuerelemente nach der Abmeldung aus. Gebündelte und direkt geladene Router teilen Dokumentzustand, Listener und Abbruch laufender Ansichten, einschließlich Einstellungen zum Dashboard.

## Begrenzte SSO-Registrierungsversuche

Einladungspflichtige SSO-Identitäten werden vor dem Anlegen von Konto, Profil oder E-Mail zurückgehalten. Abgebrochene oder abgelaufene Versuche können nicht fortgesetzt werden; Registrierung und Zwei-Faktor-Anmeldung laufen exakt zur Frist ab. Der aktivierte öffentliche Registrierungsadapter erlaubt weiterhin SSO-Kontoerstellung unabhängig von öffentlicher nativer Registrierung. Bestehende Konten werden nicht anhand von Anbieter oder Alter gelöscht.

## E-Mail-Pausen nach Zweck

Das gemeinsame SMTP-Prüfintervall beträgt fünfzehn Sekunden. Pausen gelten je normalisiertem Empfänger und Nachrichtenzweck. Verifizierung, Anmeldecodes, Anmeldelinks, Einladungen und Tests verzögern einander nicht. Die Warteschlange berücksichtigt das konfigurierte Intervall und den tatsächlichen erfolgreichen Versand; fehlgeschlagene direkte Sendungen verbrauchen keine Pause.

## Quellen und Einrichtung

Quellenzugangsdaten und der Erkennungscache werden von allen Administratoren gemeinsam verwendet; Geheimnisse bleiben verborgen auf dem Server. Ein leeres Passwortfeld behält den gespeicherten Wert bei. Schlüsselbund-Einstellungen warten auf den maßgeblichen Status, unvollständige TFA-Einrichtung erfordert eine Verwerfen-Bestätigung und interne Einstellungen-/Freigabeweiterleitungen erhalten die SPA-Navigation. Schlüsselbund: **2.1.1**, TFA: **1.2.0**.

Implizites Absenden gebundener Formulare löst keine Dokumentanfrage des Browsers aus. Komponenten erhalten das Absendeereignis weiterhin. Interne Weiterleitungen verwenden den SPA-Router. Bewusste Wechsel zu serverseitig dargestellten Seiten beachten die Bestätigung ungespeicherter Änderungen und prüfen beim Fortsetzen erneut die Offline-Verfügbarkeit.

Bei der administrativen Kontoerstellung wird der vollständige Rollenname über den Bereitstellungsablauf an den Kontenspeicher übergeben. Administrator-, Moderator- und Lehrerkonten fallen nicht mehr auf die normale Benutzerrolle zurück.

## Bootstrap und Kanäle

SMTP verwaltet die Registrierung von Aktionen, deren Darstellung und Warteschlangen. `notify:registerEmailPurpose` erhält eine lokale Kennung und eine Aktionsfunktion, die aus Variablen eine Nachricht erstellt. Gateways, Adapter und externe Module registrieren nur innerhalb ihres eigenen Bootstraps; Kennungen enthalten den Besitzer. Auth, Registration, TFA und Share besitzen ihre Nachrichteninhalte. SMTP führt keine Liste anwendungsspezifischer Zwecke oder Vorlagen.

Jeder Aufruf von `notify:sendEmail` übergibt einen bestehenden Zweck und Variablen. `templateId` entfällt. Fehlende und unbekannte Zwecke werden abgewiesen; asynchrone Aktionen werden vor dem Einreihen erneut geprüft. Nach Abschluss, Fehler oder Zeitüberschreitung des Bootstraps ist die Registrierung gesperrt. Abschluss-Hooks laufen nach dem Start der Anbieter unter demselben Besitzer.

Benachrichtigungskategorien verwenden weiterhin `notify:registerCategory`. SMTP erstellt die Warteschlange bei der Registrierung und gibt dem Gateway eine gebundene Zustellfunktion zurück. Das Gateway bleibt unabhängig vom Sender. Kein Versand erstellt oder erschließt einen Zweck; direkte SMTP-Aufrufe benötigen einen ausdrücklich registrierten Zweck.

Beim Deaktivieren eines Gateways oder Entfernen eines Moduls werden dessen Aktionen und ausstehende Zustellungen beendet. Die erneute Aktivierung stellt frische Warteschlangen her, ohne abgebrochene E-Mails zu wiederholen. Gemeinsam genutzte Kategorien bleiben aktiv, solange ein weiterer Besitzer aktiv ist. Das Deaktivieren des SMTP-Senders schließt auch Verbindungen und bricht ausstehende Zustellungen ab; die Aktivierung stellt nur noch bestehende Registrierungen wieder her.

Die Standardpause beträgt fünfzehn Sekunden je normalisiertem Empfänger und Warteschlange. Unabhängige Warteschlangen laufen gleichzeitig. Nur erfolgreiche Zustellungen setzen die Pause fort. Im Arbeitsspeicher bleiben je Warteschlange bis zu 200 abgeschlossene Einträge erhalten. `sendEmail` gibt den tatsächlichen Warteschlangeneintrag zurück; das Einreihen bestätigt keine SMTP-Zustellung.

Der Sendervertrag verwendet `test(recipient, config)` und optionale Bootstrap-, Kanal- und Lebenszyklus-Hooks. Das Gateway ruft `testSender(senderId, recipient, config)` auf und enthält keine SMTP-spezifischen Test-, Verifizierungs-, Einladungs- oder Anmeldemethoden. Die bisherigen speziellen Gateway-Hilfsmethoden und die separate Vorlagenregistrierung entfallen.

## Review-Korrekturen

Die GitLab-Repository-Prüfung berücksichtigt das konfigurierte Installationspräfix und behält Ursprungs- und Namensraumgrenzen bei. Gateway-Lebenszykluswechsel laufen asynchron und nacheinander: Aufrufer warten auf Aktivierung und Deaktivierung, Bootstrap-Ressourcen bleiben bis zur Deaktivierung ihres Besitzers erhalten, und fehlgeschlagene Aktivierungen werden zurückgenommen. Adapter erhalten eine eigene Bootstrap-Identität. SMTP TFA ist **1.1.0**.

## Sichere Laufzeitanfragen

Sprachwechsel und Einwilligungsabfragen scheitern nicht mehr daran, dass Calendar bei normalen HTTP-Anfragen Benachrichtigungen registriert. Calendar registriert seine Kategorie einmal beim Bootstrap-Abschluss, nachdem die Benachrichtigungsanbieter verfügbar sind. Share verwendet seine bereits registrierte Kategorie; Auth nutzt seinen Abschluss-Hook ohne doppelte frühzeitige Registrierung. SMTP-Registrierungen bleiben auf den Bootstrap beschränkt. Laufzeit-Handler lösen nur vorhandene Zustellfunktionen auf und nutzen sie. Calendar ist **1.5.5**.

## Study-Benachrichtigungen

Benachrichtigungen zu Study-Anfragen, Inhalten und Löschungen verwenden die beim Library-Bootstrap registrierte Kategorie. Zur Laufzeit wird nur die aktuelle Benachrichtigungsfunktion aufgelöst. Es erfolgt keine Registrierung, sodass SMTP-Bootstrap-Beschränkungen weder die Zustellung noch Hinweise zu Sichtbarkeitsänderungen unterdrücken.

## Bindung von Zugangsdaten

Die Installation löst Zugangsdaten anhand desselben Anbieter-, Endpunkt- und Namensraumstands auf, mit dem die Repository-URL geprüft wurde. Gleichzeitiges Umbinden einer Quelle bricht vor dem Checkout ab und verhindert, dass Zugangsdaten des neuen Endpunkts an den alten Host gesendet werden. Die Zuordnung zwischen GitHub-API- und Repository-Host gilt nur für GitHub-Quellen.

## Getrennte TFA-Verwerfungsfragen

Nach bestätigtem Abbruch der Einrichtung wird die Navigation erneut an die übrigen Seitenschutzfunktionen übergeben. Das Verwerfen der Einrichtung verwirft keine anderen Einstellungsänderungen. Ihr Beibehalten stoppt die Navigation; erst ihre ausdrückliche Verwerfung setzt sie fort. Eine entfernte Seite kann eine gespeicherte Navigation nicht wieder aufnehmen.

## Komponentengrenzen

E-Mail-Aktionen verwenden transportunabhängig `notify:registerEmailPurpose`. Sender-Verträge sind öffentliche Core-Typen; der Adapter-Bootstrap erhält ctx statt einer konkreten Gateway-Instanz. Die Verifizierung liest die Codelänge vom E-Mail-Anbieter und benötigt kein TFA. Die authentifizierte Verfügbarkeitsabfrage legt keine Konfiguration offen. Sender-Anforderungen steuern E-Mail-Prüfungen; gespeicherte Adressen bleiben ohne Versand lesbar. Die Richtlinie verwendet `email`; eine bestehende Anforderung wird nicht stillschweigend deaktiviert.

Registrierungs- und Sharing-Adapter deklarieren ihre eigenen Browserbeiträge. TFA ermittelt Adapter-Sprachressourcen und nutzt gemeinsame Verifizierungsfehler; Ausstellerkonfiguration bleibt beim Adapter. Share-Wartung folgt Deaktivierung und Reaktivierung. Share-UI-Tests sind nach Komponentenzuständigkeit getrennt.

## Ruhiges Marketplace-Polling

Der Marketplace prüft alle fünfzehn Sekunden einen nur für Administratoren zugänglichen Snapshot unter `/api/v1/modules/marketplace-state`. Sein ETag umfasst Quellen, Installationszustand, zwischengespeicherte Entdeckungen, Empfehlungen und Neustartanforderungen. Unveränderte Antworten liefern `304` ohne Inhalt; der vorbereitete Katalog bleibt ohne erneutes Laden von Übersetzungen oder Neuzeichnen erhalten. Die Quellensuche läuft einmal nach dem Einhängen, stündlich und nach Quellenänderungen; manuelles Aktualisieren erzwingt weiterhin einen Scan. Ausgeblendete, offline befindliche und beschäftigte Seiten pausieren Abfragen; beim Aushängen werden Anfragen abgebrochen und der Timer entfernt.

Katalogeinträge enthalten eine aus dem Inhalt abgeleitete `ui.stringsRevision`. `extendI18n(base, stringsBaseUrl, { revision })` kann versionierte authentifizierte Sprachpakete innerhalb desselben Kontos und derselben Sitzung wiederverwenden. Neue Revisionen laden neue Texte; ein Identitätswechsel leert private Pakete, verspätete Antworten können keine andere Sitzung befüllen, und fehlgeschlagene Ladevorgänge bleiben wiederholbar. Öffentliche Pakete behalten ihren bisherigen Cache und die Lebenszyklusinvalidierung.

Empfehlungsfeeds werden vom Marketplace-Dienst gemeinsam genutzt, bündeln gleichzeitige Lesezugriffe und bleiben fünf Minuten aktuell. Fehlgeschlagene Aktualisierungen behalten die letzte erfolgreiche Liste und warten vor dem nächsten Versuch eine Minute. Eine geänderte konfigurierte URL wählt ein eigenes Ergebnis; manuelles Aktualisieren umgeht die Gültigkeitsdauer.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)
- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)
- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
- [f38348a9285ed82d5cac049cf511c246a6124ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38348a9285ed82d5cac049cf511c246a6124ac4)
- [1597944b8e745acf4c2116c2786df7cd0b7dc1a9](https://github.com/Cognis-Labs-HQ/Cognis/commit/1597944b8e745acf4c2116c2786df7cd0b7dc1a9)
- [f0e2f4e0fdc2f5d1acbfc13c275b9726c9dd0e5d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f0e2f4e0fdc2f5d1acbfc13c275b9726c9dd0e5d)
- [9d818cedbcf80b2366c94b19d909adb55e191015](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d818cedbcf80b2366c94b19d909adb55e191015)
- [b9f8ff7](https://github.com/Cognis-Labs-HQ/Cognis/commit/b9f8ff7a5741bc4998bd416eefe89323532f68b1)
- [d9f39dd9958cd0411ff1df222e085c68252c6f0b](https://github.com/Cognis-Labs-HQ/Cognis/commit/d9f39dd9958cd0411ff1df222e085c68252c6f0b)
- [6883ce70fc43b89c24305874461d66d81b388bf2](https://github.com/Cognis-Labs-HQ/Cognis/commit/6883ce70fc43b89c24305874461d66d81b388bf2)
- [570d9de94e14d35bbaeae7e72bfaad6073e4115e](https://github.com/Cognis-Labs-HQ/Cognis/commit/570d9de94e14d35bbaeae7e72bfaad6073e4115e)
