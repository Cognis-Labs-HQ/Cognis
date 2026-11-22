# Freigaben und Übersetzungen

**Feature-Zweig:** feature-share-grant-enforcement

## Ablauf bei Zugriff prüfen

Direkte Benutzerfreigaben gewähren nach Ablauf keinen Zugriff mehr, auch nach Passwortentsperrung und während der Aufbewahrung im Verlauf. Ein leerer Ablaufwert bleibt unbegrenzt; ungültige nichtleere Werte verweigern den Zugriff.

## Ausdrücklichen Rechteentzug beachten

PATCH mit `grantedCapabilities: []` entfernt alle gewährten Fähigkeiten. Ohne dieses Feld bleiben sie erhalten; ein nichtleeres Array ersetzt sie. Empfänger-, Passwort- und Adapterprüfungen bleiben wirksam.

## Übersetzungskataloge

Schlüsselbundkataloge verwenden das Laufzeit-XML-Wurzelelement, damit Gast-Freigabelinks ihren temporären Schlüsselbund ohne fehlende Übersetzung erstellen können. Fehlende Beschriftungen für Raumschlüssel, Reaktionen, Terminserien, E-Mail-Aktionen, Benachrichtigungen, SSO-Rückmeldungen und den Verwaltungsstatus liegen in allen vier Sprachen vor. Prüfungen der Katalogwurzel und wörtlicher Verweise verhindern entsprechende Lücken in anderen Komponenten.

## Commits

- [37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359630d1cdc12910d11cfb9d20e2c916fbf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0a62926c095df90a4cd6c15f9484f287b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
- [1f9c347e1ba3f836f54add76ce83592d85513f3e](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f9c347e1ba3f836f54add76ce83592d85513f3e)
