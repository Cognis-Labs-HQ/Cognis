# Stabiles Bearbeitungslayout im Seitenkomponisten

## Der Bearbeitungsmodus nutzt die Maße des Ansichtsmodus

Die Bearbeitungsüberlagerung des Seitenkomponisten misst ihre Spalten nun anhand derselben Inhaltsbereichsmaße wie der Ansichtsmodus, während die Zeilenhöhe an die Zeilengröße des Ansichtsmodus gebunden bleibt. Medienintensive Elemente wie Bilder, Video, Audio, Canvas-Inhalte und ausdrücklich aktivierte Einbettungen werden bei Composer-Neurenderings geparkt und wieder angehängt, statt neu erstellt zu werden. API-verwaltete Meeting-Iframes bleiben davon ausgenommen, damit ihre Passwort- und Wiederherstellungslogik die Kontrolle behält.
