# Anwendung

Praktische Abläufe für Externe Module.

## Voraussetzungen

Administratoren benötigen eine vertrauenswürdige Quelle und passende Abhängigkeiten.

## Beispiele

Installiere ein vertrauenswürdiges Paket, prüfe Einstellungen und Rechte, aktiviere es und kontrolliere seine Seite oder Aktion.

Ein Repository deklariert seine stabile Identität und seinen Bootstrap-Einstiegspunkt in `manifest.json`:

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

Der Bootstrap stellt Verhalten ausschließlich über seinen begrenzten Kontext bereit und gibt eine Bereinigung für eigene Ressourcen zurück:

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

Administratoren installieren das Repository unter **Module**, prüfen Integrität und Abhängigkeiten, aktivieren es ausdrücklich und können es später deaktivieren, um alle registrierten UI- und Backend-Funktionen ohne Cognis-Neustart zu entfernen.

## Erwartete Ergebnisse

Die Modullebensdauer besitzt Routen und Registrierungen; Deaktivieren entfernt diese Beiträge.

## Fehlerbehebung

Prüfe Paketvalidierung, Abhängigkeiten und Protokolle. Eine Funktionsdeklaration gewährt keinen Zugriff auf fremde Implementierungen.
