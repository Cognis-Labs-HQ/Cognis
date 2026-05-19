# Changelog PR...

## Ringkasan

Perilaku chat langsung berbasis keanggotaan juga ditambahkan: ketika pengguna keluar dari chat dua orang, chat tersebut diarsipkan untuk pengguna yang tersisa, ditampilkan di bagian arsip khusus, dan pengiriman pesan di chat arsip/non-anggota diblokir dengan toast yang jelas. Saat salah satu pihak memulai lagi, sistem membuat DM baru. Selain itu avatar di Messages kini konsisten ditautkan ke profil sehingga pratinjau profil saat hover dan navigasi klik bekerja seragam.

Alur tombol pesan pada profil diperbaiki sehingga klik sekarang selalu
menjalankan aksi: membuka ruang direct yang sudah ada, membuat ruang direct
baru, atau mengirim permintaan pesan jika direct message belum diizinkan.

Permintaan pesan ditambahkan sebagai jalur resmi untuk memulai percakapan saat
dua pengguna belum saling mengikuti. Jika sudah saling mengikuti, percakapan
langsung tetap dibuat tanpa permintaan.

Selain itu ditambahkan tanda sudah dibaca, notifikasi sedang mengetik, dan
reaksi berbasis emoji pada API serta UI pesan.

## Komponen dan file yang diubah

- Adapter social messages:
    - `src/adapters/social/messages/store.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/social/messages/ui/messages.css`
    - `src/adapters/social/messages/tests/routes.test.ts`
    - `src/adapters/social/messages/tests/store.test.ts`
    - `src/adapters/social/messages/docs/standard.en.md`
    - `src/adapters/social/messages/package.json`
- Adapter social profile:
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/ui/app.js`
    - `src/adapters/social/profile/package.json`
- Lokalisasi:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- Indeks versi:
    - `src/docs/versions.en.md`

Sistem tanda baca (centang) diganti dengan desain berbasis avatar. Pesan
yang terkirim menampilkan lingkaran kosong sampai server mengonfirmasi
pengiriman, lalu lingkaran terisi, dan akhirnya avatar pembaca. Obrolan
grup menampilkan beberapa avatar berdampingan. Tooltip reaksi emoji kini
menampilkan satu kata deskriptif ("Like", "Heart", "Haha", "Celebrate").

## Commit

- [d4f7f6d](https://github.com/le-firehawk/Cognis/commit/d4f7f6d)
- [fc3febe](https://github.com/le-firehawk/Cognis/commit/fc3febe)
- [11eebfa](https://github.com/le-firehawk/Cognis/commit/11eebfa)
- [2db27c2](https://github.com/le-firehawk/Cognis/commit/2db27c2)
- [f08f248](https://github.com/le-firehawk/Cognis/commit/f08f248ea1b20fef4b7e5452e19a2857ed4b785e)
- [5d28d03](https://github.com/le-firehawk/Cognis/commit/5d28d03)
