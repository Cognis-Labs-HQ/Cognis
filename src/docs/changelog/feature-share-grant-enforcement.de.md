# Freigaberechte absichern

**Feature-Zweig:** feature-share-grant-enforcement

## Ablauf bei Zugriff prüfen

Direkte Benutzerfreigaben gewähren nach Ablauf keinen Zugriff mehr, auch nach Passwortentsperrung und während der Aufbewahrung im Verlauf. Ein leerer Ablaufwert bleibt unbegrenzt; ungültige nichtleere Werte verweigern den Zugriff.

## Ausdrücklichen Rechteentzug beachten

PATCH mit `grantedCapabilities: []` entfernt alle gewährten Fähigkeiten. Ohne dieses Feld bleiben sie erhalten; ein nichtleeres Array ersetzt sie. Empfänger-, Passwort- und Adapterprüfungen bleiben wirksam.

## Commits

- [c9025184029351f2da09709c5fa525486ae2d5f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9025184029351f2da09709c5fa525486ae2d5f7)
