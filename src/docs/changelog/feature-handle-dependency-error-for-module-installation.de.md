# Modulabhängigkeits-Toasts

**Feature-Zweig:** feature-handle-dependency-error-for-module-installation

## Klare Abhängigkeitsfehler

Bei der Installation und Aktivierung von Modulen werden deaktivierte oder nicht verfügbare erforderliche Abhängigkeiten jetzt als lokalisierte Fehlermeldung angezeigt. Interne Details zu Abhängigkeiten verbleiben in den Serverprotokollen.

## Gestaltete Anbieter-Schaltflächen

Authentifizierungsanbieter können eine entfernbare, markenspezifische Anmeldeschaltfläche mit einem erforderlichen Symbol desselben Ursprungs und einer vollständigen lokalisierten Beschriftung registrieren. Cognis prüft den Darstellungsvertrag, lässt ungestaltete SSO-Methoden weg und zeigt das Symbol sowie die Beschriftung in voller Breite auf kleinen und großen Bildschirmen. Links in der Authentifizierungsfußzeile bleiben jetzt gemeinsam in einer inhaltsbreiten Zeile.

## SSO-Autorisierungsablauf

Markenspezifische Anbieter-Schaltflächen starten jetzt den kanonischen Ablauf `startSsoLogin`, anstatt das Formular für Benutzername und Passwort abzusenden. Anbieter-Hooks prüfen den Anbieter und geben eine sichere relative oder HTTPS-Autorisierungsumleitung zurück; Fehler werden protokolliert und als lokalisierte Meldung angezeigt.

## Token-geschützte Konten

Externe Authentifizierung durchläuft jetzt den verpflichtenden Ablauf `gateAccountCreation`, bevor Cognis ein neues Konto speichert. Die offene Registrierung autorisiert die Erstellung direkt; bei geschlossener Registrierung ist ein einmalig verwendbares Token erforderlich, das zur Anbieter-E-Mail passt. Außerdem wird gemeldet, wenn die SSO-Oberfläche eine fehlende E-Mail anfordern muss. Der vereinheitlichte Registrierungstoken-Adapter verwaltet nun Einladungs- und SSO-Autorisierungstoken, hängt vom SMTP-Versand ab, kann nicht deaktiviert werden und stellt die Einladungsaktion der Benutzerseite für Administratoren und Gründer bereit.

## Zuverlässige anonyme SSO-Fehler

Fehler beim Laden der Anmeldemethoden und beim Starten von SSO auf der anonymen Anmeldeseite rufen den authentifizierten Serverprotokoll-Endpunkt nicht mehr auf. Der ursprüngliche lokalisierte Anmeldefehler bleibt sichtbar, ohne eine zweite HTTP-401-Anfrage oder eine unbehandelte Protokollablehnung zu erzeugen.

## Kombinierbare SSO-Starthooks

Die Auflösung der SSO-Weiterleitung ignoriert nun Flow-Hooks, die absichtlich kein Ergebnis zurückgeben. Ein unabhängiger Teilnehmer von `initiateAuthorization` kann eine SSO-Anfrage daher beobachten oder ablehnen, ohne die Auswahl der Weiterleitung abstürzen zu lassen, bevor der ausgewählte Anbieter seine Autorisierungs-URL zurückgibt.

## Transaktionssichere Registrierungsautorisierung

SSO bei geschlossener Registrierung prüft Einladungen nun vor der Kontoerstellung und verbraucht das Token sowie speichert die kanonische verifizierte E-Mail erst nach erfolgreicher Kontospeicherung. Ein fehlgeschlagener Abschluss entfernt das neue Konto und stellt die Nutzbarkeit des Tokens wieder her. Fehlerhafte Token führen zu einer normalen Ablehnung. Ersatzeinladungen erhalten das vorherige nutzbare Token bis zur Zustellung der neuen E-Mail, und die Darstellung der Anmeldeschaltfläche ergänzt das bestehende Anbieterverhalten, statt es zu überschreiben.

## Geschützte Rückrufe von Authentifizierungsanbietern

Authentifizierungsadapter können nun entfernbare `GET`- und `POST`-Routen in einem validierten Anbieter-Namespace unter `/api/v1/auth` registrieren. Core-Authentifizierungs-Namespaces bleiben reserviert, sodass externe Module weiterhin keine geschützten Routen direkt beanspruchen können, während anbietereigene OAuth-Rückrufe wie `/api/v1/auth/x/callback` sicher über den registrierten Adapter weitergeleitet werden können.

## Commits

- [82b2e35e](https://github.com/Cognis-Labs-HQ/Cognis/commit/82b2e35e792e91be2924edc0ffa45d3d2c8a1c0d)
- [d6a4f6b5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6a4f6b5d0c4ae212927fd18912345ba749f837f)
- [4eb78e44](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb78e4433e7371533c1cd9d26bdca0e82f006f9)
- [5bd254bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/5bd254bb88a817bfe40e86eb32d25d53661ce5eb)
- [83ca6396](https://github.com/Cognis-Labs-HQ/Cognis/commit/83ca639667ff46fb7a66afeaa69b4145383a9da9)
- [88985bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/88985bd515cdbc7539c2326812879e67a39a1143)
- [4120a69d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4120a69d267eaf07897bed979032b2e7706e1a7c)
- [a4c928d8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a4c928d82c7c42ee4a9ec4f295199d008abc9137)
- [fa24bfec](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa24bfec261a358e17e6bbb9078b160a1b4cb903)
- [e66d75f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/e66d75f72b2e8ab4da4a4e93435f6472b4fe3903)
- [85b7f238](https://github.com/Cognis-Labs-HQ/Cognis/commit/85b7f238bd959f9c4230168ff1378eebc04bbcee)
