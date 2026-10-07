# Penghapusan pustaka

Server merencanakan konfirmasi penghapusan menggunakan versi skema tersimpan dan menyertakan kartu dependan yang tidak ada di halaman saat ini. Klien gateway Study menyediakan pemeriksaan penghapusan tanpa perubahan data.

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`
