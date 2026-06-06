# Changelog PR — Ruang Kelas

## Ringkasan

Pengalaman classroom dipusatkan ke `/classroom` dan halaman lama `/classes`
serta `/my-classes` sekarang diarahkan ke sana.

Pemilih kelas dipindahkan ke footer study bersama, entri sub-navigasi classroom
di modul bahasa dihapus, dan halaman classroom terpadu diperluas untuk
pergantian tampilan guru/siswa, aksi chat/meeting di dalam ruang, penelusuran
kelas yang tersedia, dan pembuatan kelas lewat popup.

Adapter classes kini mendukung mode bergabung, pencegahan kelas ganda per
bahasa, penjadwalan agenda, resolusi chat classroom, dan record classroom yang
selalu tersedia; terjemahan serta tes regresi juga diperbarui mengikuti alur
baru.

## Komponen dan berkas yang diubah

- Route dan store adapter study/classes:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`
- UI classroom dan navigasi study bersama:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
- Integrasi pendukung, string, dan tes:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`
