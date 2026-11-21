# Typisierte Zustellverträge

**Feature-Zweig:** feature-notification-type-contracts

## Notify 2.2.10

Die optionale Warteschlangenabfrage ist im Notify-Vertrag typisiert. Der Bootstrap lädt den Gateway-eigenen Speicher direkt und stellt dessen E-Mail- und Einstellungsmethoden ohne unvollständige Konstruktor-Typzusicherungen bereit. Die Broadcast-Prüfung liefert gültige Rollen und Zeitangaben vor dem Speichern.

## Internal 0.5.34

Die interne Zustellung bezieht den strukturierten Datenbankzugriff über ctx. Der Protokollierungsvertrag verwendet die unterstützten Bootstrap-Schweregrade. Verschlüsselung, Postfachberechtigungen und stets aktive Zustellung bleiben unverändert.

## SMTP 0.5.3

SMTP-Warteschlangeneinträge behalten ihren erforderlichen Betreff bei Zustellung und Wiederholungen. TLS-Verbindungsoptionen enthalten das Abbruchsignal für direktes TLS und STARTTLS; Zertifikatsprüfung, Zeitlimits und Verbindungsbereinigung bleiben unverändert.

## Commits

- [e8dc18187f0952a00078d22e4713181197fc6886](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8dc18187f0952a00078d22e4713181197fc6886)
- [a7b28309057dc860920174fcc68017401b5953ae](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7b28309057dc860920174fcc68017401b5953ae)
