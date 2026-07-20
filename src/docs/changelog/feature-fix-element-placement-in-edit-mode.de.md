# Stabiles Bearbeitungslayout im Seitenkomponisten

## Der Bearbeitungsmodus nutzt die Maße des Ansichtsmodus

Die Bearbeitungsüberlagerung des Seitenkomponisten misst ihre Spalten nun anhand derselben Inhaltsbereichsmaße wie der Ansichtsmodus, während die Zeilenhöhe an die Zeilengröße des Ansichtsmodus gebunden bleibt. Medienintensive Elemente wie Bilder, Einbettungen, Canvas-Inhalte und Meeting-Iframes werden bei Composer-Neurenderings nun geparkt und wieder angehängt, statt neu erstellt zu werden. Dadurch werden störende Neuladungen beim Umschalten der Bearbeitung, beim Verschieben, bei Popups und bei Benachrichtigungen verhindert.
