# Penghapusan pustaka

Server merencanakan konfirmasi penghapusan menggunakan versi skema tersimpan dan menyertakan kartu dependan yang tidak ada di halaman saat ini. Klien gateway Study menyediakan pemeriksaan penghapusan tanpa perubahan data.

`POST /api/v1/study/library/entries/deletion-plan`

`{ "entryIds": ["entry-id"] }` → `{ "data": { "entryIds": ["entry-id"], "entries": [{ "id": "entry-id", "label": "..." }] } }`

Ambil terjemahan yang belum tersedia menggunakan `POST /api/v1/study/library/definitions/localize` dengan `{ translations, languages }`. Bahasa UI yang belum tersedia diminta melalui `localization:translateString`, terjemahan yang diberikan tetap dipertahankan, dan `missingLanguages` dilaporkan jika penyedia tidak tersedia atau gagal. Teks yang belum diterjemahkan dapat diedit; teks Inggris tidak disalin ke bidang bahasa lain. Tindakan ini juga tersedia saat menambahkan definisi secara manual.
