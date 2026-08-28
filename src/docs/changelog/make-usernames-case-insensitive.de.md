# Benutzername & Passwortpolitik

**Feature Branch:** copilot/make-usernames-case-insensitive

## Benutzernamen sind jetzt Groß-/Kleinschreibung-unabhängig und nur ASCII

Benutzernamen werden bei der Registrierung und beim Login in Kleinbuchstaben normalisiert. Nur druckbare ASCII-Zeichen sind erlaubt, die Maximallänge beträgt 25 Zeichen. Ungültige Benutzernamen werden mit klaren Fehlercodes abgewiesen.

## Passwortrichtlinie konfigurierbar in Administration → Sicherheit

Administratoren können unter Administration → Sicherheit eine Passwortrichtlinie festlegen. Konfigurierbare Kriterien: Mindestlänge, Großbuchstaben, Kleinbuchstaben, Ziffer und Sonderzeichen. Die Richtlinie gilt für Registrierung und Passwortänderungen.

## Live-Passwortprüfung bei Registrierung und Passwort zurücksetzen

Während der Registrierung zeigt das Passwortfeld live Rückmeldungen, welche Kriterien das Passwort noch nicht erfüllt. Das Bestätigungsfeld zeigt in Echtzeit eine Meldung, wenn die Passwörter nicht übereinstimmen.

## Wiederverwendbares Kriterienprüfungs-Modul

Die neue Funktion `attachCriteriaCheck` in `src/ui/reuse/criteria-check.js` bietet flexible, barrierefreie Live-Validierung für beliebige Formularfelder. Jedes Kriterium kann eine eigene Fehlermeldung haben; eine konfigurierbare allgemeine Meldung wird als Fallback verwendet.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2c806b81e4aef343918c7dfa36cdf6d7a2191802
