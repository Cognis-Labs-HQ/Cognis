# Fokussteuerung

## Manifestschema

Seiten und einzelne Composer-Elemente deklarieren `focusControl` mit stabilen Kennungen, lokalisierten Textschlüsseln, einer registrierten Route, Darstellungsarten und serialisierbarem Zustand. Nachrichten dürfen weder HTML noch Rückrufe enthalten.

## Abläufe und Anbieter

Benannte Abläufe trennen Deklaration, Autorisierung, Start, Laden, Veröffentlichung, Anwendung, Übergabe und Beendigung. Anbieter registrieren Fähigkeiten ausschließlich über ctx.

## Sicherheit und Synchronisierung

Jeder Vorgang wird authentifiziert, auf eine Kollaborationsressource begrenzt und erneut auf Mitgliedschaft und Rolle geprüft. Zustände sind auf 64 KiB begrenzt; monotone Revisionen verhindern Konflikte und ermöglichen Wiederverbindungen.

## Externes Modul

Ein Whiteboard-Modul verweist auf seine entdeckte Modulroute. Nur Ressourcenkennung und Darstellungsmetadaten werden fokussynchronisiert; Dokumentänderungen verbleiben beim Whiteboard-Anbieter.

## Eignung von Komponentenseiten

Eine Seite eines externen Moduls steht anderen Komponenten nur zur Verfügung, wenn ihr Bootstrap die SPA-Route mit `componentPage` registriert. Die Deklaration muss kleingeschriebene Lokalisierungsschlüssel in `labelKey` und `descriptionKey` sowie mindestens einen unterstützten Modus (`overlay`, `fullscreen` oder `pip`) enthalten. Cognis ergänzt die Modul-UUID aus dem geprüften Manifest; Module dürfen weder den Dateipfad noch die Skript-URL eines anderen Moduls angeben oder herleiten.

```js
ctx.registerSpaRoute({
    id: "whiteboard.canvas",
    pattern: "^/whiteboards/[^/]+$",
    base: "/whiteboards",
    scriptUrl: "/static/modules/nextcloud-whiteboard/app.js",
    componentPage: {
        labelKey: "module.nextcloud-whiteboard.canvas_label",
        descriptionKey: "module.nextcloud-whiteboard.canvas_description",
        modes: ["overlay", "fullscreen"],
    },
});
```

Das Seitenmodul muss `mount(root, { signal, focusState })` exportieren, das Abbruchsignal beachten, ausschließlich innerhalb von `root` rendern und serialisierbaren Aufruferkontext über `focusState` akzeptieren. Die Freigabe betrifft nur die Darstellung; Autorisierung, Ressourcenerstellung, Teilnehmerzugriff, Speicherung und Live-Synchronisierung bleiben Aufgabe des bereitstellenden Moduls.

## Seite einer anderen Komponente anfordern

Eine anfordernde Komponente benennt den Anbieter anhand seiner unveränderlichen Manifest-UUID und der stabilen Routen-ID. Browsercode bezieht `component-pages:request` aus `uiCtx.capabilities`; er darf den Anbieter weder importieren noch dessen Asset-URL zusammensetzen. Die Capability liefert `null`, wenn das Modul deaktiviert, unzugänglich oder nicht vorhanden ist oder die Route nicht ausdrücklich freigegeben wurde.

Für synchronisierte Fokussteuerung wird ein `module-route`-Loader deklariert, dessen `moduleId` diese UUID und dessen `routeId` die freigegebene Routen-ID ist. Ein Kollaborationsanbieter muss die Anfrage weiterhin autorisieren, das Whiteboard über serverseitige ctx-Capabilities erstellen oder auflösen, Teilnehmerzugriff vergeben und über `focus:transport` ausschließlich stabile Ressourcenkennungen veröffentlichen.
