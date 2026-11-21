# Referensi Teknis

Antarmuka publik dan aturan operasional Impor dan Ekspor Kalender.

## Antarmuka

`GET /api/v1/calendar/ics/export` — `calendarId`

`POST /api/v1/calendar/ics/import` — `calendarId`, `ics`

## Konfigurasi

Tidak ada pengaturan adaptor tambahan. Konfigurasi dan izin berasal dari gerbang Kalender dan kalender yang dipilih.

## Perilaku

Ekspor membaca kalender milik pengguna dan mengembalikan lampiran ICS. Impor memerlukan `calendarId` dan teks `ics` tidak kosong, lalu dilakukan melalui gerbang Kalender.

## Keamanan

Ekspor dan impor memerlukan akun terautentikasi dengan akses kalender yang sesuai. Umpan bersama memeriksa token, kedaluwarsa, dan izin terkini sebelum membaca atau mengubah acara.

## Referensi

Kode sumber dan metadata paket: `src/adapters/calendar/ics/`.
