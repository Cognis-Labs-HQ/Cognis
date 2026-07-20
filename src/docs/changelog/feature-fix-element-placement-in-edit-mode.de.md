# Stabiles Bearbeitungslayout im Seitenkomponisten

## Der Bearbeitungsmodus nutzt die Maße des Ansichtsmodus

Die Bearbeitungsüberlagerung des Seitenkomponisten misst ihre Zellen nun anhand derselben Inhaltsbereichsmaße wie der Ansichtsmodus, statt sich auf feste 90-px-Einheiten zu verlassen. Bearbeitungszellen behalten die normale Rasterbreite und den normalen Abstand bei, während sie für Zieh- und Größenänderungsgriffe absolut positioniert bleiben. Dadurch wachsen oder schrumpfen Karten nicht mehr beim Umschalten der Layoutbearbeitung.
