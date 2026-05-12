# Modul Jitsi Meet dan Persistensi Rapat

## Ringkasan

- Menambahkan modul ekstensi mandiri `jitsi-meet` dengan titik masuk API dan UI.
- Menambahkan penyimpanan persisten `meeting_rooms` dengan penegakan peserta dan kunci ruang yang dapat dipakai ulang.
- Menambahkan fondasi skema classroom dan hook integrasi pesan agar rapat dapat otomatis menautkan chatroom.

## File/Komponen yang Diubah

- `src/modules/jitsi-meet/` (manifest modul baru, API, UI, plugin navbar, string locale)
- `src/modules/routes/module-extensions.ts` (propagasi konteks API modul)
- `src/api/server.ts`, `src/api/main.ts`, `src/api/routes/ui/index.ts` (wiring capability/konteks modul serta dukungan navbar/static modul)
- `src/adapters/study/classes/` (skema classroom dan ekspos capability classroom)
- `src/adapters/social/messages/` (capability pembuatan chatroom untuk integrasi modul)
- `src/ui/public/templates/dashboard-layout.html`, `src/ui/layouts/dashboard-layout.js`, `src/ui/languages/*/strings.xml` (label navbar Meetings dan keterjangkauan)

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/6fb2d2deff0b75ea44536e458f4ef4a0bf56d708
