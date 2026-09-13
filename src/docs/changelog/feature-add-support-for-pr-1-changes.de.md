# Registrierungsintegrationen

**Feature-Zweig:** feature-add-support-for-pr-1-changes

## Versionierte Dokumentspeicherung

Core stellt nun einen neutralen, ausschließlich erweiterbaren und datenbankgestützten Dokumentversionsspeicher für unabhängig ausgelieferte Module bereit. Die bestehenden Dokumentations- und Änderungsprotokollarchive behalten ihre mehrsprachigen, komponentenversionierten Dateisystem-Schnappschüsse, da eine Umwandlung dieser statischen Quellen in Datenbanksätze den Speicher nur duplizieren würde, ohne ihr Versionsmodell zu verbessern.

## Registrierungserweiterungen

Der hosteigene Registrierungsablauf stellt nun Modulfelder zusammen, validiert ihre Werte und schließt authentifizierte Registrierungsarbeiten vor der Navigation ab.

## Fallback für Modulbilder

Beschädigte oder ungültige Modulsymbole und Banner wechseln nun zum standardmäßigen Bild für unbekannte Module, ohne ein Laufzeitfehler-Popup zu öffnen.

## Host-Navigations-Capability

Der Modul-Lebenszyklus erkennt den App-Router nun als Anbieter von `ui:navigate`, sodass Module aktiviert werden können, die die Host-Navigation benötigen.

## Sicheres Laden von Beiträgen

Die Administration importiert beigesteuerte UI-Module nun unter dem SPA-Schutz, damit Seiteneinstiegspunkte sich nicht selbst unter der Administrations-URL einhängen.

## Robuster Bild-Fallback

Modulbilder verwenden nun die kanonische öffentliche Route für das Ersatzbild; ein nicht verfügbares Ersatzbild wird ohne Laufzeitfehler-Popup ausgeblendet.

## Commits

- [2f77a92](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f77a92c78df6da12b4c000b47b2c787ab517695)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
- [2be280e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2be280efacce0abf81d80ad3aae9bd23c8db921a)
- [fb19c34e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb19c34e1ad6b7de4b7c0dd2c6bb8e0fad171484)
- [3f80ad56](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f80ad56eb500d81031d7c3001bc1b5c246f84a1)
