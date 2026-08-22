# Portable Marktplatztests

## Git-Checkout-Test ohne Git überspringen

Der Integrationstest für den Marktplatz-Checkout erkennt nun, ob Git installiert ist, und überspringt in minimalen CI-Umgebungen ausschließlich das von Git abhängige Szenario.
