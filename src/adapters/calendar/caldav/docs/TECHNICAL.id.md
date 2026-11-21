# Referensi Teknis

Antarmuka publik dan aturan operasional CalDAV.

## Antarmuka

`GET /api/v1/calendar/caldav/calendars/:calendarId/export`

`/api/v1/calendar/caldav/public/:name`

`/api/v1/calendar/caldav/private/:token`

## Konfigurasi

Tidak ada pengaturan adaptor tambahan. Konfigurasi dan izin berasal dari gerbang Kalender dan kalender yang dipilih.

## Perilaku

Ekspor mengembalikan URL langganan. Kalender publik dan token pribadi menggunakan URL umpan terpisah. Penulisan acara bersama dibatasi izin berbagi; adaptor ini tidak membuat akun klien kalender terpisah.

## Keamanan

Ekspor dan impor memerlukan akun terautentikasi dengan akses kalender yang sesuai. Umpan bersama memeriksa token, kedaluwarsa, dan izin terkini sebelum membaca atau mengubah acara.

## Referensi

- [src/adapters/calendar/caldav/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/calendar/caldav/manifest.json)
- [src/adapters/calendar/caldav/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/calendar/caldav/package.json)
- [src/adapters/calendar/caldav/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/calendar/caldav/index.ts)
