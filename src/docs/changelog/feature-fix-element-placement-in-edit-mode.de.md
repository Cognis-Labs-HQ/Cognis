# Stabiles Bearbeitungslayout im Seitenkomponisten

## Der Bearbeitungsmodus nutzt die Maße des Ansichtsmodus

Die Bearbeitungsüberlagerung des Seitenkomponisten misst ihre Spalten nun anhand derselben Inhaltsbereichsmaße wie der Ansichtsmodus, während die Zeilenhöhe an die Zeilengröße des Ansichtsmodus gebunden bleibt. Medienintensive Elemente wie Iframes, Bilder, Video, Audio, Canvas-Inhalte, Object-/Embed-Inhalte und ausdrücklich beizubehaltende Elemente werden bei Composer-Neurenderings geparkt und wieder angehängt, statt neu erstellt zu werden, sodass eingebettete Fenster wie aktive Meetings erhalten bleiben. Komponenten können weiterhin mit `data-composer-preserve="false"` aussteigen, wenn ihre API-Hülle die Wiederherstellung selbst steuern muss.
