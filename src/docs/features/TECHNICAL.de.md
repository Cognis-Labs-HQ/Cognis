# Technische Referenz

Dieser Katalog ordnet installierte Funktionen den Komponenten ihrer Schnittstellen und Zugriffsregeln zu.

## Schnittstellen

[Study](/docs/gateways/study/technical) erkennt Sprachanbieter, [Library](/docs/adapters/study/library/technical) besitzt Inhalte und Importe, [Flashcards](/docs/adapters/study/flashcards/technical) Decks und Übungen. [Calendar](/docs/gateways/calendar/technical) besitzt Termine, [Messages](/docs/adapters/social/messages/technical) Gespräche und [Share](/docs/gateways/share/technical) delegierte Links und Empfänger.

## Konfiguration

Administratoren wählen Komponenten und Anbietereinstellungen. Konten wählen Lernsprachen und Präferenzen. E-Mail benötigt einen konfigurierten Sender und passende Kontorichtlinien; ein SMTP-Schema oder installierter SSO-Adapter stellt allein keine externe Verbindung her.

## Verhalten

Navigation und Aktivitäten folgen aktiven Beiträgen und Kontorechten. Funktionsdokumentation ist keine Installationsliste. [UI](/docs/ui/technical) definiert Routing, öffentliche Offline-Ressourcen und kontogebundenes Offline-Verhalten. Fachreferenzen legen fest, welche Aktionen vorgemerkt werden dürfen und welche Verbindung benötigen.

## Sicherheit

Sichtbarkeit, Klassenmitgliedschaft, Eigentum, Moderation und delegierte Rechte werden getrennt geprüft. Rollenbezogene Steuerelemente autorisieren keine Backendoperation. Sprachdaten und Freigabelinks dürfen die Fachrichtlinie nicht umgehen.

## Referenz

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/calendar/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/calendar/bootstrap/index.ts)
- [src/gateways/share/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/share/bootstrap/index.ts)
