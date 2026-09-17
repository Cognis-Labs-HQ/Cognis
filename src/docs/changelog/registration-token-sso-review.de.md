# Registrierungstoken und SSO-Integration

**Feature-Zweig:** registration-token-sso-review

## Gestaltete Anbieter-Schaltflächen

Authentifizierungsanbieter können eine entfernbare, markenspezifische Anmeldeschaltfläche mit einem erforderlichen Symbol gleicher Herkunft und einer vollständig lokalisierten Beschriftung registrieren. Cognis validiert den Darstellungsvertrag, lässt ungestaltete SSO-Methoden weg und hält Symbol und Beschriftung auf kleinen wie großen Bildschirmen sichtbar. Die Links in der Authentifizierungsfußzeile bleiben gemeinsam in einer Zeile mit Inhaltsbreite.

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

## Explizit privilegierte Module

Module müssen `privileged: true` deklarieren, bevor sie sicherheitssensible Authentifizierungsflows erweitern oder Gateway-eigene Routen über einen Auth-Adapter weiterleiten. Die bloße Bezeichnung als SSO-Anbieter gewährt keinen zusätzlichen Zugriff. Cognis vertraut privilegierter Herkunft aus der fest eingetragenen GitHub-Organisation `Cognis-Labs-HQ` und gibt eine ausdrückliche Warnung aus, wenn eine andere Quelle Privilegien anfordert.

## Geschütztes Moduleigentum und Zusicherung

API-Routen, Fähigkeiten, Flows, Hooks, statische Präfixe und UI-Registrierungen von Modulen lehnen nun die Ersetzung durch andere Eigentümer ab und werden nur für ihren aufgezeichneten Eigentümer bereinigt. Modulübergreifende Verbraucher können eine Zusicherung mit unveränderlicher Identität, Version, Privilegienherkunft, Quelle und Laufzeitintegrität anfordern. Die Installationsherkunft versiegelt den Manifest-Hash und Cognis hasht jede deklarierte Datei erneut, sodass Integrationen manipulierte oder nicht überprüfbare Anbieter ablehnen können.

## Konforme Modulisolierung

Nicht privilegierte Module können API-Routen, Fähigkeiten und neue Flows jetzt nur in ihrem eigenen Modulnamensraum registrieren. Host- und fremde Namensräume erfordern eine ausdrückliche Privilegiendeklaration, sodass gewöhnliche Erweiterungen keine Integrationsfläche eines anderen Moduls belegen können. Die Konformitätsprüfung korrigierte außerdem lokalisierte Anmeldediagnosen und die Dokumentationsstruktur des Registrierungstokens.

## Review-Härtung und kooperative Integrationen

Gleichzeitige SSO-Rückrufe teilen sich nun ein Ergebnis der Tokenverwendung, sodass ein unterlegener Rückruf das erfolgreiche Konto nicht löschen kann. Registrierungstoken hängen vom neutralen Benachrichtigungs-Gateway statt von SMTP ab, markenspezifische Schaltflächen bleiben auf aktivierte Anbieter beschränkt und Fehler im Abhängigkeitsdialog verwenden lokalisierte Hinweise. Nicht privilegierte Module behalten einen dokumentierten und getesteten Kooperationspfad über anbietereigene namensgebundene Fähigkeiten und nicht sicherheitskritische Flows.

## Wiederherstellung verpflichtender Komponenten

Die Zusammenführung der Tokeneinlösung berücksichtigt jetzt Token und Kontoidentität, sodass ein konkurrierendes externes Konto nicht die Autorisierung eines anderen Rückrufs erbt. Eine wiederverwendbare Core-Lebenszyklusrichtlinie aktiviert verpflichtende gesperrte Komponenten trotz veralteter gespeicherter Deaktivierung; Authentifizierung, Registrierung und dauerhaft aktive Benachrichtigungsanbieter wenden sie beim Laden und an Konfigurationsgrenzen an.

## Einheitlicher Laufzeit-Authentifizierungslebenszyklus

Von Modulen bereitgestellte Authentifizierungsadapter stellen nun ihre vom Gateway verwaltete gespeicherte Konfiguration und ihren Aktivierungszustand wieder her, bevor die Anbieterregistrierung abgeschlossen wird. Die Registrierungsfähigkeit ist asynchron, damit Module die Lebenszyklusbereitschaft abwarten können, bevor sie Rückrufrouten oder markenspezifische Anmeldeschaltflächen beitragen; dies entspricht der Erkennungs- und Aktivierungsreihenfolge von LDAP. Die Dokumentation beschreibt den Migrationspfad für X SSO und den Gateway-eigenen Einrichtungsvertrag.

## Token-geschützte Fortsetzung der SSO-Registrierung

Wenn eine authentifizierte SSO-Identität bei deaktivierter öffentlicher Registrierung ein Cognis-Konto benötigt, fordert die Anmeldeantwort nun ausdrücklich ein Registrierungstoken an und liefert den Endpunkt für den erneuten Versuch. Cognis bewahrt das übermittelte Token und die Ersatz-E-Mail über die erneute Anbieterauthentifizierung hinweg, damit der verpflichtende Registrierungstoken-Adapter die Kontoerstellung freigeben kann.

## Registrierungseigene SSO-Autorisierung und Einladungsrichtlinien

Unbekannte SSO-Identitäten wechseln nun zu einem undurchsichtigen, ablaufenden Registrierungsvorgang, den der Registrierungstoken-Adapter in der standardmäßigen Cognis-Registrierungshülle darstellt. Das Einladungsfenster der Benutzerseite bietet die Registerkarten E-Mail und Token; manuelle Token funktionieren ohne SMTP. Gründerregistrierungen sind auf zehn erfolgreiche Nutzungen begrenzt und können von Administratoren zurückgesetzt werden. Eigentümer steuern die Einladungsrechte von Gründern und Administratoren unter Administration → Registrierung. Die öffentliche Registrierung überspringt die Tokenautorisierung ausdrücklich.

## Build-Korrektur der Benutzerseite

Die Aktion zum Zurücksetzen von Gründereinladungen verbleibt nun innerhalb der Aktionsbehandlung der Benutzerseite, sodass Produktions-Builds wieder ein gültiges ECMAScript-Modul erzeugen.

## Fokussierter Änderungsumfang

Die unabhängigen Änderungen an Hinweisen für Modulabhängigkeiten wurden aus diesem Pull Request entfernt. Die verbleibende Implementierung beschränkt sich auf die Zusammenführung der Registrierungstoken, die Integration des SSO- und Anbieterlebenszyklus sowie die für diese Erweiterungspunkte erforderlichen Modulgrenzen.

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
- [5552b77f](https://github.com/Cognis-Labs-HQ/Cognis/commit/5552b77f945050d4e9b51e43a90c79a95d348487)
- [23517721](https://github.com/Cognis-Labs-HQ/Cognis/commit/2351772152b0d07f6c82a9683222d0d0cf6602d0)
- [d62eba99](https://github.com/Cognis-Labs-HQ/Cognis/commit/d62eba99)
- [6eec5296](https://github.com/Cognis-Labs-HQ/Cognis/commit/6eec52967246d4e0991b56691c6024cdc71c2c1e)
- [3cf4aee2](https://github.com/Cognis-Labs-HQ/Cognis/commit/3cf4aee2a35c83065d116717f71a845f36bf5416)
- [fcfbfc35](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcfbfc35a6bd698b4be409764e07bf8820f3201b)
- [2f42af60](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f42af6007a0935a99ca2860cfb893c8e9bc3c2d)
- [fb4cbefe](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb4cbefe2974a810fe5a8dabc15267d7663a58a4)
- [a7f57fd8](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7f57fd8e8d21b3783b9e316ade117343c4e5cbd)
- [06f9f746](https://github.com/Cognis-Labs-HQ/Cognis/commit/06f9f746c0b33eaab8eb3c7af57a6c9b754f4164)
