# Verlässlicher Status und Abruf

## Profilstatusanzeige wiederhergestellt

Die Dashboard-Oberfläche initialisiert Erweiterungen für angemeldete Konten nun korrekt, wenn die Gastsitzungsfunktion eine normale authentifizierte Sitzung meldet. Dadurch erscheint die Verfügbarkeitsanzeige wieder über dem Navigationsavatar.

## Veröffentlichungskanäle ohne Cache aktualisiert

Die Seitennavigation für Marketplace-Repositorys umgeht nun zwischengeschaltete HTTP-Caches, sodass eine manuelle Aktualisierung neu erstellte Modul-Branches und Tags sofort abruft.

## Freigabefunktionen und Steuerelemente vereinheitlicht

Renderer für Freigabegäste erhalten nun eigenständige Profilfunktionen und vollständig geladene Avatar-Stile, bevor sie eingebunden werden. Vom Gateway bereitgestellte Freigabesteuerelemente zeigen einheitlich die lokalisierte Bezeichnung „Teilen“ neben dem kanonischen Freigabesymbol.

## Modulstile eingegrenzt

Deklarierte Stile für Modulrouten werden nun in einer niedrigeren Kaskadenebene geladen. Module behalten die Kontrolle über ihren Seiteninhalt, während Cognis die maßgeblichen Stile für Oberfläche, Navigation und Profilavatar beibehält.
