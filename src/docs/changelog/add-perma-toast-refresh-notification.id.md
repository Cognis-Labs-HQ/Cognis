# Toast Permanen untuk...

## Ringkasan

Ditambahkan toast peringatan permanen yang meminta pengguna menyegarkan halaman saat koneksi API terautentikasi gagal karena gangguan server/jaringan (kegagalan jaringan atau respons 5xx yang dapat dicoba ulang).

Page composer sekarang mengatur prompt penyegaran bersama yang sudah diterjemahkan agar peringatan tetap terlokalisasi di seluruh halaman dashboard.

## File / Komponen yang Diubah

- `src/ui/reuse/api-client.js` — Menambahkan penanganan toast pemulihan koneksi bersama dan konfigurasi prompt.
- `src/ui/reuse/page-composer.js` — Mendaftarkan prompt pemulihan koneksi terjemahan saat bootstrap halaman.
- `src/ui/languages/en/strings.xml`
- `src/ui/languages/de/strings.xml`
- `src/ui/languages/id/strings.xml`
- `src/ui/languages/ja/strings.xml`
- `src/ui/reuse/tests/api-client.test.js` — Menambahkan cakupan regresi untuk perilaku toast penyegaran permanen.

## Commit

- https://github.com/le-firehawk/Cognis/commit/bbee24a
- https://github.com/le-firehawk/Cognis/commit/3b7bded
