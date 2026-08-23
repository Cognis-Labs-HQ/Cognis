# Navbar lädt zuverlässig

## Endlosschleife beim Laden behoben

Die gespeicherte Navigationsreihenfolge verändert das DOM nur noch, wenn sich die Reihenfolge tatsächlich unterscheidet. Dadurch löst der Beobachter keine endlose Folge eigener Änderungen mehr aus und die Seitenoberfläche bleibt beim Laden bedienbar.
