# Gemeinsame E-Mail-Codelänge

**Feature-Zweig:** feature-smtp-email-code-integration

## Eine SMTP-Einstellung für E-Mail-Codes

Das Feld Codelänge des Benachrichtigungs-SMTP-Adapters steuert E-Mail-Verifizierung sowie Einrichtung und Anmeldung mit E-Mail-Code-TFA. Der übersetzte Informationshinweis erklärt die gemeinsame Richtlinie, den Standardwert von 6 Ziffern und den Bereich von 4–10 Ziffern. Verbraucher lesen die aktuelle SMTP-Richtlinie bei der Codeausgabe und speichern keine zweite Codelänge. Leere numerische Konfigurationsfelder behalten ihren vorhandenen Wert.

## Bestehende Codes behalten ihre Länge

Eine Änderung der SMTP-Einstellung gilt für neu ausgegebene Codes, einschließlich Ersatzcodes beim erneuten Senden. Ausstehende Einrichtungs- und Anmeldecodes behalten ihre ursprüngliche Länge, bis sie verwendet, ersetzt oder abgelaufen sind. Einrichtungs- und Anmeldefelder verwenden die Längenmetadaten des aktiven Codes. Die erforderliche E-Mail-Verifizierung akzeptiert den vollständigen ausstehenden Code ohne gesonderte feste Eingabebegrenzung.

Beim Fortsetzen einer ausstehenden Anmeldung nach dem Neuladen der Seite bleibt die ursprüngliche Eingabelänge erhalten, ohne einen weiteren Code zu senden. Spätere Änderungen der Anbieterrichtlinie gelten für neu ausgegebene Codes; eine ältere Antwort kann eine neuere Anmeldeaufforderung nicht ersetzen.

## Nicht verfügbare Sender führen zu Fehlern

Die Ausgabe von E-Mail-Verifizierungs- und E-Mail-Code-TFA-Codes erfordert einen verfügbaren und konfigurierten SMTP-Richtlinienanbieter. Fehlende oder deaktivierte Anbieter führen nicht stillschweigend zu einem Standardwert des Verbrauchers. Das Deaktivieren der SMTP-Methode oder des Gateways entfernt ausstehende Codes; die erneute Aktivierung beginnt mit einem frischen Zustand.

## Erweiterungsvertrag und sichere Konfiguration

Die eigenständige Fähigkeit `notify:emailCodeLength` entfällt. Erweiterungen müssen `notify:emailDeliveryPolicy().codeLength` lesen; das Benachrichtigungs-Gateway und beide E-Mail-Adapter sind gemeinsam bereitzustellen. Die Anbieterkonfiguration wird vor der Laufzeitanwendung normalisiert und gespeichert. Bei fehlgeschlagener Anwendung wird der Anbieter deaktiviert und seine vorherige gespeicherte Konfiguration im deaktivierten Zustand zur Wiederherstellung durch einen Administrator zurückgesetzt. Die gewöhnliche SMTP-Authentifizierung und die Zustimmung zur E-Mail-Verifizierung bleiben unverändert.

Das Speichern und Ändern der Konfiguration, Aktivierungsänderungen und das Laden gespeicherter Einstellungen werden pro Sender nacheinander ausgeführt, einschließlich der Rücknahme fehlgeschlagener Speichervorgänge. Verschiedene Sender bleiben unabhängig. Das Ersetzen eines registrierten Senders während laufender Konfigurationsvorgänge schlägt ausdrücklich fehl und ist erst nach deren Abschluss möglich. Konfigurations-Listener laufen nach Freigabe der Transaktion und können daher auf eine weitere Änderung warten. Die Daten von `notify:onSenderConfigChange` enthalten keine Felder, die im Anbieterschema als `password` deklariert oder von `getConfiguredSecretFields()` aufgeführt werden, auch keine neu übermittelten Werte. Öffentliche normalisierte Felder und der Aktivierungszustand bleiben verfügbar; Listener dürfen sich nicht auf ungeschützte Zugangsdaten verlassen.

## Änderungen

- [39d7f5d412ab4f30b681e8a8d6bbf083205f5007](https://github.com/Cognis-Labs-HQ/Cognis/commit/39d7f5d412ab4f30b681e8a8d6bbf083205f5007)
- [f96cbfd66b0e194e0f7998c1501ab672c54b4f39](https://github.com/Cognis-Labs-HQ/Cognis/commit/f96cbfd66b0e194e0f7998c1501ab672c54b4f39)
- [ac26f8f8483db87f1b62717d5c1f231c12dda6e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac26f8f8483db87f1b62717d5c1f231c12dda6e0)
- [c1d740bac56419be19780e79c4719f7a8b4e316a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1d740bac56419be19780e79c4719f7a8b4e316a)
