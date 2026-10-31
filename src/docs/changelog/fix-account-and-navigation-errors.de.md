# Konto- und Sitzungskorrekturen

**Feature-Zweig:** fix-account-and-navigation-errors

## Zuverlässige Benutzerverwaltung

Die Benutzerverwaltung erkennt das aktuelle Konto anhand der gespeicherten Konto-ID, auch bei opaken SSO-Sitzungen. Eigene Kontosteuerungen beachten den Serverschutz. Fehler beim Laden von Kontodetails verwenden eine eigene Übersetzung. Eine fehlgeschlagene Aktualisierung macht eine bestätigte Änderung nicht zum Speicherfehler; die bisherige Liste bleibt mit einer Aktualisierungswarnung sichtbar.

## Profilbearbeitung und Rollen

Profilformulare verwenden die komponenteneigenen Grenzen für Anzeigename, Biografie, Ort und Webseite. Die Rollensynchronisierung ermittelt den öffentlichen Profilnamen anhand der unveränderlichen Konto-ID, bevor Rolle und Sichtbarkeit aktualisiert werden.

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

## Commits

- [79980d16805ac67e696ce8d6b63f4daafba73f19](https://github.com/Cognis-Labs-HQ/Cognis/commit/79980d16805ac67e696ce8d6b63f4daafba73f19)
- [d09e01858cd856a505c24061bc524d8e87b88bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d09e01858cd856a505c24061bc524d8e87b88bf0)
