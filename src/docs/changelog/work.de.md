# Produktionslaufzeit für Assets robuster gestaltet

## Der Produktionsstart verwendet kompilierte Assets

Der Produktionsstartbefehl konfiguriert nun das erzeugte UI-Manifest sowie die kompilierten Gateway-, Adapter- und Modulpfade, bevor er den kompilierten Server startet.

## Inhaltskodierung berücksichtigt Qualitätspräferenzen

Die Aushandlung statischer Assets schließt nun mit Qualitätswert null abgelehnte Kodierungen aus und wählt die verfügbare Brotli- oder gzip-Darstellung mit der höchsten akzeptierten Qualität.
