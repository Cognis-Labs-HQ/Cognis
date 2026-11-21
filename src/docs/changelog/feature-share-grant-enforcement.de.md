# Freigaberechte absichern

**Feature-Zweig:** feature-share-grant-enforcement

## Ablauf bei Zugriff prüfen

Direkte Benutzerfreigaben gewähren nach Ablauf keinen Zugriff mehr, auch nach Passwortentsperrung und während der Aufbewahrung im Verlauf. Ein leerer Ablaufwert bleibt unbegrenzt; ungültige nichtleere Werte verweigern den Zugriff.

## Ausdrücklichen Rechteentzug beachten

PATCH mit `grantedCapabilities: []` entfernt alle gewährten Fähigkeiten. Ohne dieses Feld bleiben sie erhalten; ein nichtleeres Array ersetzt sie. Empfänger-, Passwort- und Adapterprüfungen bleiben wirksam.

## Commits

- [1f5c4f101876d150f9ee130a00297fbb266d4399](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f5c4f101876d150f9ee130a00297fbb266d4399)
- [bb1d6a4e69171f0abfe3792028a9137855224315](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb1d6a4e69171f0abfe3792028a9137855224315)
- [05885663480dbd75b40b8fa5b5ea29faeb156fed](https://github.com/Cognis-Labs-HQ/Cognis/commit/05885663480dbd75b40b8fa5b5ea29faeb156fed)
