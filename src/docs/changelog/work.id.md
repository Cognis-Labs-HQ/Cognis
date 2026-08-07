# Startup nginx yang Andal

## Lindungi Variabel nginx

Kontainer web kini membatasi substitusi templat pada host upstream Cognis. Variabel bawaan nginx, termasuk pemetaan protokol yang diteruskan, tetap utuh meskipun terdapat variabel lingkungan deployment dengan nama serupa.
