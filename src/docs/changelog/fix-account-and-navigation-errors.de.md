# Konto- und Sitzungskorrekturen

**Feature-Zweig:** fix-account-and-navigation-errors

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

Quellenzugangsdaten und der Erkennungscache werden von allen Administratoren gemeinsam verwendet; Geheimnisse bleiben verborgen auf dem Server. Ein leeres Passwortfeld behält den gespeicherten Wert bei. Schlüsselbund-Einstellungen warten auf den maßgeblichen Status, unvollständige TFA-Einrichtung erfordert eine Verwerfen-Bestätigung und interne Einstellungen-/Freigabeweiterleitungen erhalten die SPA-Navigation. Schlüsselbund: **2.1.1**, TFA: **1.1.20**.

Implizites Absenden gebundener Formulare löst keine Dokumentanfrage des Browsers aus. Komponenten erhalten das Absendeereignis weiterhin. Interne Weiterleitungen verwenden den SPA-Router. Bewusste Wechsel zu serverseitig dargestellten Seiten beachten die Bestätigung ungespeicherter Änderungen und prüfen beim Fortsetzen erneut die Offline-Verfügbarkeit.

Bei der administrativen Kontoerstellung wird der vollständige Rollenname über den Bereitstellungsablauf an den Kontenspeicher übergeben. Administrator-, Moderator- und Lehrerkonten fallen nicht mehr auf die normale Benutzerrolle zurück.

## Bootstrap und Kanäle

SMTP verwaltet die Registrierung von Aktionen, deren Darstellung und Warteschlangen. `notify:registerSmtpPurpose` erhält eine lokale Kennung und eine Aktionsfunktion, die aus Variablen eine Nachricht erstellt. Gateways, Adapter und externe Module registrieren nur innerhalb ihres eigenen Bootstraps; Kennungen enthalten den Besitzer. Auth, Registration, TFA und Share besitzen ihre Nachrichteninhalte. SMTP führt keine Liste anwendungsspezifischer Zwecke oder Vorlagen.

Jeder Aufruf von `notify:sendEmail` übergibt einen bestehenden Zweck und Variablen. `templateId` entfällt. Fehlende und unbekannte Zwecke werden abgewiesen; asynchrone Aktionen werden vor dem Einreihen erneut geprüft. Nach Abschluss, Fehler oder Zeitüberschreitung des Bootstraps ist die Registrierung gesperrt. Abschluss-Hooks laufen nach dem Start der Anbieter unter demselben Besitzer.

Benachrichtigungskategorien verwenden weiterhin `notify:registerCategory`. SMTP erstellt die Warteschlange bei der Registrierung und gibt dem Gateway eine gebundene Zustellfunktion zurück. Das Gateway bleibt unabhängig vom Sender. Kein Versand erstellt oder erschließt einen Zweck; direkte SMTP-Aufrufe benötigen einen ausdrücklich registrierten Zweck.

Beim Deaktivieren eines Gateways oder Entfernen eines Moduls werden dessen Aktionen und ausstehende Zustellungen beendet. Die erneute Aktivierung stellt frische Warteschlangen her, ohne abgebrochene E-Mails zu wiederholen. Gemeinsam genutzte Kategorien bleiben aktiv, solange ein weiterer Besitzer aktiv ist. Das Deaktivieren des SMTP-Senders schließt auch Verbindungen und bricht ausstehende Zustellungen ab; die Aktivierung stellt nur noch bestehende Registrierungen wieder her.

Die Standardpause beträgt fünfzehn Sekunden je normalisiertem Empfänger und Warteschlange. Unabhängige Warteschlangen laufen gleichzeitig. Nur erfolgreiche Zustellungen setzen die Pause fort. Im Arbeitsspeicher bleiben je Warteschlange bis zu 200 abgeschlossene Einträge erhalten. `sendEmail` gibt den tatsächlichen Warteschlangeneintrag zurück; das Einreihen bestätigt keine SMTP-Zustellung.

Der Sendervertrag verwendet `test(recipient, config)` und optionale Bootstrap-, Kanal- und Lebenszyklus-Hooks. Das Gateway ruft `testSender(senderId, recipient, config)` auf und enthält keine SMTP-spezifischen Test-, Verifizierungs-, Einladungs- oder Anmeldemethoden. Die bisherigen speziellen Gateway-Hilfsmethoden und die separate Vorlagenregistrierung entfallen.

## Review-Korrekturen

Die GitLab-Repository-Prüfung berücksichtigt das konfigurierte Installationspräfix und behält Ursprungs- und Namensraumgrenzen bei. Gateway-Lebenszykluswechsel laufen asynchron und nacheinander: Aufrufer warten auf Aktivierung und Deaktivierung, Bootstrap-Ressourcen bleiben bis zur Deaktivierung ihres Besitzers erhalten, und fehlgeschlagene Aktivierungen werden zurückgenommen. Adapter erhalten eine eigene Bootstrap-Identität. SMTP TFA ist **1.0.38**.

## Sichere Laufzeitanfragen

Sprachwechsel und Einwilligungsabfragen scheitern nicht mehr daran, dass Calendar bei normalen HTTP-Anfragen Benachrichtigungen registriert. Calendar registriert seine Kategorie einmal beim Bootstrap-Abschluss, nachdem die Benachrichtigungsanbieter verfügbar sind. Share verwendet seine bereits registrierte Kategorie; Auth nutzt seinen Abschluss-Hook ohne doppelte frühzeitige Registrierung. SMTP-Registrierungen bleiben auf den Bootstrap beschränkt. Laufzeit-Handler lösen nur vorhandene Zustellfunktionen auf und nutzen sie. Calendar ist **1.5.5**.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)
- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)
- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
- [f38348a9285ed82d5cac049cf511c246a6124ac4](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38348a9285ed82d5cac049cf511c246a6124ac4)
