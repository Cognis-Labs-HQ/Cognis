# SSO-Prüfung fortsetzen

**Feature-Zweig:** feature-x-sso-tfa-handoff

## Vorhandene Prüfung fortsetzen

SSO-Konten mit TFA kehren zur normalen Anmeldung zurück und prüfen den bereits versandten Code. Erneut versuchen und Abbrechen behandeln unterbrochene Anmeldungen ohne neue Sitzung oder E-Mail. Auth 2.2.10 stellt eine kurzlebige HttpOnly-Fortsetzung bereit; X SSO 1.0.63 nutzt die ausdrückliche Markierung der Anmeldeseite.

## Ausstehende Versuche schützen

Ablauf, atomare Prüfung, Abbruch, Ersetzung und Abmelden machen den passenden serverseitigen Versuch ungültig. Ältere Tabs können neuere Versuche nicht abbrechen oder deren Cookie überschreiben. Verspätete Browserarbeit bleibt auf das aktuelle Formular beschränkt.

## Commits

- [892be808be6d9cbce88fd4dc01f493a055ef6ac7](https://github.com/Cognis-Labs-HQ/Cognis/commit/892be808be6d9cbce88fd4dc01f493a055ef6ac7)
