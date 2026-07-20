# Token-Widerruf fix

## Admin-Archivierung widerruft Login-Token

Wenn ein Administrator einen Benutzer deaktiviert, wird das Profil archiviert und alle aktiven Login-Token dieses Kontos werden jetzt über die Auth-Gateway-Fähigkeit widerrufen, die von den Lebenszyklus-Cleanup-Flows verwendet wird. Zuvor suchte der Flow diese Fähigkeit, aber das Auth-Gateway veröffentlichte sie nicht, sodass bereits angemeldete archivierte Benutzer bis zum Ablauf ihrer Token weiter handeln konnten.
