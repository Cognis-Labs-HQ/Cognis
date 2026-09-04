# Passwortwechsel gehärtet

**Feature-Zweig:** copilot/clean-up-password-change-popup

## Aktuelles Passwort Pflicht

Passwortänderungen in den Benutzereinstellungen erfordern jetzt immer das aktuelle Passwort und prüfen es serverseitig, bevor ein neues Passwort akzeptiert wird.

## Passwort-Wiederverwendung gesperrt

Die lokale Authentifizierung speichert jetzt einen gehashten Passwortverlauf und lehnt neue Passwörter ab, wenn sie bereits zuvor verwendet wurden.

## Reset Zu Ändern Umbenannt

In den Sicherheitseinstellungen wurde „Passwort Zurücksetzen“ in Abschnitt, Schaltfläche und Popup zu „Passwort Ändern“ umbenannt.

## Randfälle Bei Prüfung Behoben

Die Eingabe des aktuellen Passworts behält nun führende und nachgestellte Leerzeichen bei, migrierte Konten schreiben den Hash vor der Rotation vor dem Update in den Verlauf, bestehende Auth-Adapter mit Zwei-Parameter-Signatur bleiben kompatibel, und die Verlaufsspeicherung bleibt in DB- und Volatile-Store konsistent begrenzt.

## Änderungen

- [926f513](https://github.com/Cognis-Labs-HQ/Cognis/commit/926f513f10cade5b1e5f9367c98276b2898b4bc2)
