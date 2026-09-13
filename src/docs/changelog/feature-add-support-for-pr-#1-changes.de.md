# Registrierungsintegrationen

**Feature-Zweig:** feature-add-support-for-pr-#1-changes

## Versionierte Dokumentspeicherung

Core stellt nun eine ausschließlich erweiterbare, datenbankgestützte Capability zur Dokumentversionierung für unabhängig ausgelieferte Module bereit.

## Registrierungserweiterungen

Der hosteigene Registrierungsablauf stellt nun Modulfelder zusammen, validiert ihre Werte und schließt authentifizierte Registrierungsarbeiten vor der Navigation ab.

## Fallback für Modulbilder

Beschädigte oder ungültige Modulsymbole und Banner wechseln nun zum standardmäßigen Bild für unbekannte Module, ohne ein Laufzeitfehler-Popup zu öffnen.

## Host-Navigations-Capability

Der Modul-Lebenszyklus erkennt den App-Router nun als Anbieter von `ui:navigate`, sodass Module aktiviert werden können, die die Host-Navigation benötigen.

## Commits

- [9d24852](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d248526)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
