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

Verwenden Sie in jedem neuen Lokalisierungsschlüssel Punkte als Worttrenner, zum Beispiel `module.example.canvas.label`. Zwischen Wörtern dürfen keine Unterstriche oder Bindestriche eingeführt werden; nur eine bereits registrierte Modul-ID mit Bindestrich darf diesen im Modul-Namensraumsegment behalten.

```js
ctx.registerSpaRoute({
    id: "whiteboard.canvas",
    pattern: "^/whiteboards/[^/]+$",
    base: "/whiteboards",
    scriptUrl: "/static/modules/nextcloud-whiteboard/app.js",
    componentPage: {
        labelKey: "module.nextcloud-whiteboard.canvas.label",
        descriptionKey: "module.nextcloud-whiteboard.canvas.description",
        modes: ["overlay", "fullscreen"],
    },
});
```

Das Seitenmodul muss `mount(root, { signal, focusState })` exportieren, das Abbruchsignal beachten, ausschließlich innerhalb von `root` rendern und serialisierbaren Aufruferkontext über `focusState` akzeptieren. Die Freigabe betrifft nur die Darstellung; Autorisierung, Ressourcenerstellung, Teilnehmerzugriff, Speicherung und Live-Synchronisierung bleiben Aufgabe des bereitstellenden Moduls.

## Seite einer anderen Komponente anfordern

Eine anfordernde Komponente benennt den Anbieter anhand seiner unveränderlichen Manifest-UUID und der stabilen Routen-ID. Browsercode bezieht `component-pages:request` aus `uiCtx.capabilities`; er darf den Anbieter weder importieren noch dessen Asset-URL zusammensetzen. Die Capability liefert `null`, wenn das Modul deaktiviert, unzugänglich oder nicht vorhanden ist oder die Route nicht ausdrücklich freigegeben wurde.

`component-pages:request` prüft ausschließlich die Verfügbarkeit und bindet niemals eine Oberfläche ein. Ein Komponentenfenster wird über `component-pages:spawn` synchron im Klick- oder Tastaturaktivierungs-Handler der Whiteboard-Schaltfläche geöffnet. Der Aufrufer übergibt die ID einer vorhandenen, eigenen Bühne und das `AbortSignal` seiner Seite. Cognis verlangt eine aktive Benutzeraktion, begrenzt das Fenster auf diese Bühne, verhindert Link- und Formularnavigation in den Dashboard-Router und übergibt dem Anbieter `navigationAllowed: false`.

Die Spawn-Capability liefert ein Handle mit `discard()`. Der Aufrufer muss es bei seiner Schließen- oder Zurück-Aktion verwerfen; ein Abbruchsignal oder der Wechsel der SPA-Route verwirft es ebenfalls. Alternativ verwirft `component-pages:discard` das Fenster anhand der Bühnen-ID; für Shell-Lebenszyklen steht `component-pages:discardAll` bereit. Die Verfügbarkeitssuche beim Laden der Besprechungsseite darf nur `component-pages:request` verwenden. Anbieter müssen ausschließlich im übergebenen Root rendern, das Signal beachten, eigene Ressourcen beim Verwerfen freigeben und im eingebetteten Zustand keine direkte Navigation auslösen.

Die Bühnen-ID darf nur Buchstaben, Ziffern, Punkte, Unterstriche, Doppelpunkte oder Bindestriche enthalten. Besitzt der Anbieter zusätzliche Ressourcen, gibt `mount` eine Bereinigungsfunktion oder ein Objekt mit `destroy` beziehungsweise `unmount` zurück.

Für synchronisierte Fokussteuerung wird ein `module-route`-Loader deklariert, dessen `moduleId` diese UUID und dessen `routeId` die freigegebene Routen-ID ist. Ein Kollaborationsanbieter muss die Anfrage weiterhin autorisieren, das Whiteboard über serverseitige ctx-Capabilities erstellen oder auflösen, Teilnehmerzugriff vergeben und über `focus:transport` ausschließlich stabile Ressourcenkennungen veröffentlichen.

## Integrierte Komponentenseiten

Mit Cognis ausgelieferte authentifizierte Dashboard-Seiten verwenden die Cognis-Core-UUID `b4d49c4a-61d0-5db2-84fd-f89b80fd6398`; Study verwendet seine Gateway-UUID `338b9237-a2c8-5bcf-9437-bccc9abd9a27`. Ihre stabilen Routen-IDs sind `core.dashboard`, `core.settings`, `core.users`, `core.invite`, `core.modules`, `core.administration`, `core.docs`, `core.changelogs`, `core.license`, `core.error`, `gateway.study` und `gateway.study.child`. Sie nutzen denselben Vertrag `component-pages:request` wie externe Module und unterstützen die Einbettung als Overlay oder Vollbild. Anmelde- und Demonstrationseinstiege sind keine Komponentenseiten der Dashboard-Shell und daher nicht freigegeben.

## Verschiebbare und größenveränderbare PiP-Fenster

Eine Oberfläche, die `pip` deklariert, wird mit dem wiederverwendbaren Verhalten für schwebende Fenster von Cognis dargestellt. Benutzer können den nicht interaktiven Bereich der Focus-Control-Kopfzeile ziehen und die Fenstergröße über die Größensteuerung des Browsers ändern. Cognis hält das Fenster im sichtbaren Bereich und entfernt alle Listener beim Ende der Fokussitzung. Anbietermodule deklarieren nur `pip` und hängen sich in die bereitgestellte Wurzel ein; sie dürfen keine konkurrierenden dokumentweiten Handler zum Ziehen oder Ändern der Größe installieren.

Ein Modul mit einem eigenen PiP-Element, beispielsweise einem Meeting-Frame, bezieht `ui:makeFloatingWindow` über `uiCtx.capabilities`, übergibt Element, Ziehbereich und Seitensignal und bewahrt die zurückgegebene Bereinigungsfunktion auf. Die Utility darf nicht direkt importiert werden.
