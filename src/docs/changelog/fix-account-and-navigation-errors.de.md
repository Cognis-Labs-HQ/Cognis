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

## Commits

- [8e09f49cab2b2920c11f680034c0b858e4557607](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e09f49cab2b2920c11f680034c0b858e4557607)
