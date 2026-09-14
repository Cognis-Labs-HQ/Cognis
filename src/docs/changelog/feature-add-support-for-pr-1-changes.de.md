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

## Zuverlässige Registrierungszusammenstellung

Der Registrierungsablauf folgt nun der Camel-Case-Namenskonvention für ctx, isoliert fehlerhafte Integrations-Hooks, damit die Basisregistrierung verfügbar bleibt, und dokumentiert vertrauenswürdige HTML-Beschriftungen für Beitragende.

## Geschützte Bearbeitungen und wiederverwendbare Klappbereiche

Änderungsverfolgungen schützen nun sowohl Browser-Ausgänge als auch SPA-Navigation, veraltete Sub-Composer-Beobachter stoppen nach dem Aushängen und ein nutzdatenbasierter Composer für Klappbereiche stellt gleich breite Aktionszeilen für Administration und externe Module bereit.

## Verbindliche Popups und gemeinsames Abmelden

Popups können nun eine verbindliche Interaktion ohne Schließen-Schaltfläche sowie ohne Hintergrund- oder Escape-Schließen anfordern. Der Browser-ctx stellt außerdem einen gestuften Abmeldeablauf bereit, der die Sitzung widerruft, den Schlüsselbund sperrt, lokale Kontodaten löscht und zur Anmeldung weiterleitet.

## Erweiterbare Links in der Seitenfußzeile

Die Seitenhülle stellt nun `ui:footerLinks` bereit. Damit können bereichsgebundene Links auf der linken oder rechten Seite der Fußzeile beigesteuert werden; der Host verwendet dieselbe Registrierung für Lizenz und Änderungsprotokolle.

## Wiederverwendbare strukturierte Seitennavigation

Der Keyring-Ereignisverlauf verwendet nun eine gemeinsame Seitennavigation mit vom Aufrufer gewählter Seitengröße, strukturierten Seitenergebnissen, lokalisierten Bedienelementen, Datenaktualisierungen und einer für Module verfügbaren ctx-Fähigkeit `ui:pagination`.

## Vollständige Navigations- und Registrierungsisolierung

Ungespeicherte Änderungen schützen nun auch die Vor- und Zurücknavigation und stellen bei Ablehnung den aktiven Verlaufseintrag wieder her. Fabriken für Registrierungsfelder schlagen unabhängig fehl, Abschluss-Hooks erhalten übermittelte Werte und Integrationskontext und Keyring löst die Seitennavigation über ctx auf.

## Regressionsabdeckung der vollständigen Testsuite

Die Regressionsprüfungen für Keyring und Router wurden an die gemeinsamen Seitennavigations-Steuerelemente und den indizierten SPA-Verlaufszustand angepasst, sodass die vollständige Testsuite wieder fehlerfrei läuft.

## Aktive Fußzeilenlinks und gemeinsame Seitenmenüs

Fußzeilenlinks kennzeichnen nun die aktive Route und deren Unterseiten. Die Navigation für Dokumentation und Änderungsprotokolle verwendet jetzt einen wiederverwendbaren, strukturierten Seitenmenü-Builder, der Laufzeitmodulen über die ctx-Fähigkeit `ui:sideMenu` bereitsteht.

## Inline-Pfeile für Adapterdetails

Adapterzeilen in der Administration reservieren nun getrennte Zusammenfassungs-Spalten für Aktionssteuerungen und den Aufklapppfeil. Durch das Entfernen der veralteten pfeilbreiten Steuerungsspalte bleibt der Pfeil direkt nach dem Ein-/Ausschalter in derselben Zeile.

## An Überschriften ausgerichtetes Scrollen

Seitenmenü-Einträge können nun eine Zielüberschrift angeben. Bei der Auswahl wird sanft und am Anfang ausgerichtet gescrollt, sodass die gewünschte Überschrift oben statt mitten im Inhalt erscheint.

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
- [8f67ef9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f67ef9eb42910f9597f694d2d7b819b1ab00940)
- [f7cfe49a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7cfe49a74f4e104348eae5938747f0d601b2b60)
- [7c16485f](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c16485f5abf7b260cf6bf6311dbf80725e4fb05)
- [e240270a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e240270a5a597aeb07cd3e905343be1f2c2ef4f5)
- [c63e7c8f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c63e7c8f0aab5c4e1e38d5963fd64ab7036a40e5)
- [672104a0](https://github.com/Cognis-Labs-HQ/Cognis/commit/672104a008171509ff08eb522d85c90dc70ac045)
- [957a4c49](https://github.com/Cognis-Labs-HQ/Cognis/commit/957a4c4987bbac8d259942e134c33b783e8eb4e5)
- [182a22ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/182a22ef86b98848185f6a73e622bf31845aee2f)
- [5a67fcd2](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a67fcd2562b01e10cf7907158de6d657bd3ec5d)
- [3885aa11](https://github.com/Cognis-Labs-HQ/Cognis/commit/3885aa1123f324422fe756b150957f2a00b6a305)
