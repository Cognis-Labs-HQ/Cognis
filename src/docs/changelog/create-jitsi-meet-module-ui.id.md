# Fondasi Modul Jitsi Meet

**Cabang Fitur:** copilot/create-jitsi-meet-module-ui

## Ringkasan

Menambahkan modul Jitsi Meet baru dengan pengaturan instans yang dapat dikonfigurasi, persistensi rapat, pemeriksaan akses berbasis peserta, API status sesi rapat, halaman Meetings khusus, dan pemantauan administrasi.

Penyempurnaan lanjutan:

- Tata letak halaman Meetings kini sepenuhnya dikendalikan oleh composer: panel peserta berada di atas dengan lebar penuh; Meeting Window dan Chat masing-masing menempati setengah lebar kisi yang tersedia (`gridSize.max: 'half'`).
- "Meeting Overlay" diubah namanya menjadi "Meeting Window" di seluruh antarmuka.
- Tabel "Peserta Tersedia" diisi awal dengan semua pengguna yang terlihat saat halaman dimuat.
- Pencarian peserta diganti dengan popup (sesuai UX "Percakapan Baru" di Pesan).
- Endpoint baru `GET /api/v1/modules/jitsi-meet/participants?q=` menyajikan profil yang terlihat (semua saat `q` kosong; difilter jika tidak).
- Tabel peserta diganti dengan kumpulan avatar bebas: setiap avatar dapat diseret (dengan pratinjau profil saat dihover), dapat dijatuhkan ke Jendela Rapat (sorotan zona drop hijau) dan tampil di atas teks "Jendela Rapat".
- Popup "Cari Peserta" kini mendukung pilihan berganda dengan tombol konfirmasi "Tambahkan yang Dipilih"; semua pengguna terpilih ditambahkan ke kumpulan tersedia saat dikonfirmasi.
- Kustomisasi composer dan persistensi tata letak diaktifkan.
- Pesan chat pra-rapat diubah menjadi "Menunggu rapat dimulai."
- Pemeriksaan pra-penerbangan kini menampilkan centang hijau saat instans Jitsi mengembalikan respons probe yang sehat.
- Kesalahan 400 saat membuat rapat diperbaiki akibat pencarian handle peka huruf besar-kecil; `getProfileByHandle` kini menggunakan pencocokan tidak peka huruf besar-kecil.
- Administrasi → Komponen: Tombol Pengaturan dipindahkan dari dalam `<summary>` chevron ke bagian detail modul yang diperluas, mengganti ikon roda gigi dengan tombol teks "Pengaturan".
- Skema meeting store bersifat maju: `ensureTable` mendefinisikan rangkaian kolom yang berwenang; tidak ada kode kompatibilitas mundur untuk skema lama.
- Pembuatan rapat sekarang menulis `room_slug` dari slug URL rapat yang dihasilkan, sehingga basis data dengan kolom lama `room_slug` yang masih `NOT NULL` tidak lagi gagal.
- Chat grup yang terhubung ke rapat kini menyertakan tanggal rapat pada judul ruang.
- Mengklik jumlah anggota pada chat grup rapat kini membuka popup yang menampilkan pengguna yang sedang hadir dengan avatar tertaut untuk pratinjau profil.
- Meeting Window kini memakai tampilan overlay yang jauh lebih terang pada mode terang agar panggung pra-rapat tidak lagi tampak terlalu gelap.
- Chat pada halaman Meetings sekarang dirender secara native di dalam halaman melalui API Messages, bukan lagi menyematkan halaman chat kedua dari URL lain.
- Pemeriksaan pra-penerbangan kini berjalan sebelum rapat dimulai, tetap terlihat terlepas dari pemilihan peserta, dan memblokir start sampai berhasil.
- Join Jitsi tertanam sekarang mengisi info peserta lebih dulu, melewati langkah pra-join tambahan, dan menendang tab yang tergeser saat sesi lain mengambil alih rapat.
- Slug ruang rapat yang dihasilkan sekarang tetap terbaca (`classroom-xxxxxxxx` / `cognis-classroom-xxxxxxxx`) sehingga Jitsi tidak lagi menampilkan nama join yang berantakan.
- Meeting Window dan Chat kini kembali memakai tata letak awal setengah/setengah, tetap bebas diubah ukuran tinggi maupun lebarnya, dan memakai kunci preferensi tata letak baru untuk menghapus default lebar penuh yang tidak disengaja.
- Rapat yang digunakan ulang kini tidak lagi menampilkan prompt ambil-alih-sesi palsu setelah rapat sebelumnya sudah berakhir, tidak lagi memunculkan toast palsu “diambil alih di tempat lain” saat menunggu ambil alih, dan kini menampilkan pesan overlay yang jelas saat rapat ditutup untuk semua orang atau saat seorang peserta keluar.
- Meetings kini benar-benar mengikuti tema terang/gelap Cognis aktif pada jendela Jitsi, menampilkan panel “Rapat Aktif” di samping “Peserta Tersedia” untuk gabung instan, dan mengarahkan notifikasi rapat lewat deep-link langsung ke entri rapat aktif yang sesuai (dengan status tangkapan “rapat ditutup” jika tujuan sudah berakhir).

## Berkas / Komponen yang Diubah

- `src/modules/jitsi-meet/ui/app.js` (kumpulan avatar, pilihan berganda, centang hijau, drag-to-stage, opsi composer)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (kumpulan avatar, peserta yang dipasang, sorotan zona drop, indikator centang)
- `src/modules/jitsi-meet/ui/languages/*/strings.xml` (kunci baru: probe_done, add_selected; chat.pending diperbarui)
- `src/ui/reuse/search-bar.js` (dukungan multiSelect + onSelectMultiple, footer konfirmasi)
- `src/ui/styles/reuse/search-bar.css` (gaya hasil pilihan berganda, footer konfirmasi)
- `src/ui/styles/page-builder.css` (gaya tombol pengaturan, gaya tombol roda gigi dihapus)
- `src/ui/app/administration/index.js` (tombol pengaturan dipindahkan ke bagian yang diperluas)
- `src/adapters/social/profile/store.ts` (getProfileByHandle tidak peka huruf besar-kecil)
- `src/modules/jitsi-meet/api/store.js` (skema maju dengan kompatibilitas `room_slug` saat insert rapat)
- `src/modules/jitsi-meet/api/index.js` (judul chat rapat bertanggal, endpoint ringkasan ruang chat rapat)
- `src/adapters/social/messages/ui/app.js` (jumlah anggota yang dapat diklik untuk popup ringkasan kehadiran)
- `src/adapters/social/messages/ui/messages.css` (gaya popup ringkasan anggota dan subtitel yang dapat diklik)
- `src/adapters/social/messages/ui/languages/*/strings.xml` (string ringkasan pengguna hadir)
- `src/modules/jitsi-meet/api/tests/store.test.js` (assertion `room_slug` ditambahkan: nilainya harus mengikuti slug URL rapat)
- `src/ui/tests/regression-followups.test.js` (regresi judul chat rapat dan ringkasan anggota)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (overlay Meeting Window yang lebih terang, spinner, dan kontras pengguna tersusun pada mode terang)
- `src/modules/jitsi-meet/ui/app.js` (chat rapat native, gerbang pra-penerbangan di muka, URL join Jitsi terisi otomatis, penanganan kick-out saat pengambilalihan sesi)
- `src/modules/jitsi-meet/ui/app.js` (Meeting Window dan Chat dipulihkan ke default setengah lebar dengan ukuran bebas, kunci preferensi tata letak diperbarui)
- `src/modules/jitsi-meet/ui/app.js` (pesan overlay untuk rapat ditutup/ditinggalkan, perbaikan polling reclaim, pelacakan sesi yang digerakkan oleh status)
- `src/modules/jitsi-meet/api/index.js` (endpoint pra-penerbangan untuk pengguna, pelaporan status sesi aktif untuk deteksi pengambilalihan)
- `src/modules/jitsi-meet/ui/app.js` (sinkronisasi tema, panel Rapat Aktif, alur gabung instan/deep-link)
- `src/modules/jitsi-meet/api/index.js` (endpoint rapat aktif untuk pengguna dan notifikasi rapat deep-link dengan pengirim terarah)
- `src/modules/jitsi-meet/api/store.js` (slug rapat bawaan tetap terbaca, status rapat berakhir, helper kehadiran aktif, dan metadata rapat aktif)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (tata letak dan styling responsif panel Rapat Aktif)
- `src/modules/jitsi-meet/ui/languages/*/strings.xml` (teks untuk chat native, pra-penerbangan, dan status pengambilalihan sesi)
- `src/ui/tests/regression-followups.test.js` (regresi rapat ditutup / ambil alih sesi)
- `src/ui/tests/regression-followups.test.js` (regresi rapat aktif / notifikasi deep-link)
- `src/modules/jitsi-meet/package.json` (versi modul dinaikkan ke `1.0.5`)
- `src/modules/jitsi-meet/manifest.json` (versi manifest modul dinaikkan ke `1.0.5`)
- `src/docs/versions.en.md` (versi Jitsi Meet diperbarui ke `1.0.5`)

## Tautan Commit

- [a1a90e5](https://github.com/Cognis-Labs-HQ/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c)
- [224a1bf](https://github.com/Cognis-Labs-HQ/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396)
- [65261ce](https://github.com/Cognis-Labs-HQ/Cognis/commit/65261ce6)
- [642ddf5](https://github.com/Cognis-Labs-HQ/Cognis/commit/642ddf56)

## Komit
