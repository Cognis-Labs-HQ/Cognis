# Typisierte Zustellverträge

**Feature-Zweig:** feature-notification-type-contracts

## Notify 2.2.10

Die optionale Warteschlangenabfrage ist im Notify-Vertrag typisiert. Der Bootstrap lädt den Gateway-eigenen Speicher direkt und stellt dessen E-Mail- und Einstellungsmethoden ohne unvollständige Konstruktor-Typzusicherungen bereit. Die Broadcast-Prüfung liefert gültige Rollen und Zeitangaben vor dem Speichern.

## Internal 0.5.34

Die interne Zustellung bezieht den strukturierten Datenbankzugriff über ctx. Der Protokollierungsvertrag verwendet die unterstützten Bootstrap-Schweregrade. Verschlüsselung, Postfachberechtigungen und stets aktive Zustellung bleiben unverändert.

## SMTP 0.5.3

SMTP-Warteschlangeneinträge behalten ihren erforderlichen Betreff bei Zustellung und Wiederholungen. TLS-Verbindungsoptionen enthalten das Abbruchsignal für direktes TLS und STARTTLS; Zertifikatsprüfung, Zeitlimits und Verbindungsbereinigung bleiben unverändert.

## Commits

- [21295f18697e07a687ee70f6e5b3f5166db50963](https://github.com/Cognis-Labs-HQ/Cognis/commit/21295f18697e07a687ee70f6e5b3f5166db50963)
- [88e31ce18fc9e0fb6a0f6ff7e3bb500e65d58770](https://github.com/Cognis-Labs-HQ/Cognis/commit/88e31ce18fc9e0fb6a0f6ff7e3bb500e65d58770)
- [26a5b1a0a4b1db40cbe00a526c003a54f98a38e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/26a5b1a0a4b1db40cbe00a526c003a54f98a38e0)
