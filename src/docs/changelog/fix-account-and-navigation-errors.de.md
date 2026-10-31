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

## Zwecke beim Bootstrap

SMTP-Zwecke werden während des Gateway- oder Modul-Bootstraps über `ctx` registriert. Rufen Sie `notify:registerSmtpPurpose` mit einem lokalen Zwecknamen auf, warten Sie auf das Ergebnis und bewahren Sie die zurückgegebene besitzergebundene Kennung auf. Jede Registrierung erstellt eine eigene Warteschlange samt Empfänger-Sperrzeiten. Der Adapter besitzt keine feste Zweckliste.

Jeder Aufruf von `notify:sendEmail` muss einen bestehenden `purpose` angeben. Fehlende oder unbekannte Zwecke werden vor dem SMTP-Transport abgewiesen; ein Versand erstellt keine Zwecke. Nach Abschluss, Fehler oder Zeitüberschreitung des Bootstraps ist die Registrierung gesperrt, auch über gespeicherte Rückrufe und abgetrennte asynchrone Arbeit. Nach dem Start aktivierte Module dürfen während ihres eigenen Bootstraps registrieren. Deaktivierung und Deinstallation entfernen ihre Warteschlangen, lehnen ausstehende Zustellungen ab und schließen aktive SMTP-Verbindungen.

Die Standardpause beträgt fünfzehn Sekunden je normalisiertem Empfänger und Zweck. Unabhängige Zwecke werden gleichzeitig abgearbeitet; langsame Verbindungen, Wiederholungen und Sperrzeiten blockieren keine andere Warteschlange. Nur erfolgreiche Zustellungen setzen die Sperrzeit fort. Die Übersicht kombiniert alle Zwecke, zeigt ihre Kennungen und bewahrt bis zu 200 abgeschlossene Einträge pro Warteschlange im Arbeitsspeicher auf.

Der allgemeine Umschlag enthält `purpose`; spezialisierte SMTP-Versand- und Warteschlangenmethoden erwarten den Zweck jetzt als erstes Argument. Die Gateway-Testmethode verwendet `(senderId, purpose, recipientEmail, config)`. Bestehende Gateway-Hilfsmethoden liefern ihre registrierten Zwecke selbst. Allgemeine Komponenten und Module registrieren eigene Zwecke beim Bootstrap und verwenden deren Kennungen zur Laufzeit.

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)

- [160953932a8754503224475915afd905e656919d](https://github.com/Cognis-Labs-HQ/Cognis/commit/160953932a8754503224475915afd905e656919d)

- [b379b4ac8cda27e2593bba493d5e9f13dc555b20](https://github.com/Cognis-Labs-HQ/Cognis/commit/b379b4ac8cda27e2593bba493d5e9f13dc555b20)
