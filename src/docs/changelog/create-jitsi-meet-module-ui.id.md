# Fondasi Modul Jitsi Meet

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

## Berkas / Komponen yang Diubah

- `src/modules/jitsi-meet/ui/app.js` (kumpulan avatar, pilihan berganda, centang hijau, drag-to-stage, opsi composer)
- `src/modules/jitsi-meet/ui/jitsi-meet.css` (kumpulan avatar, peserta yang dipasang, sorotan zona drop, indikator centang)
- `src/modules/jitsi-meet/ui/languages/*/strings.xml` (kunci baru: probe_done, add_selected; chat.pending diperbarui)
- `src/ui/reuse/search-bar.js` (dukungan multiSelect + onSelectMultiple, footer konfirmasi)
- `src/ui/styles/reuse/search-bar.css` (gaya hasil pilihan berganda, footer konfirmasi)
- `src/ui/styles/page-builder.css` (gaya tombol pengaturan, gaya tombol roda gigi dihapus)
- `src/ui/app/administration/index.js` (tombol pengaturan dipindahkan ke bagian yang diperluas)
- `src/adapters/social/profile/store.ts` (getProfileByHandle tidak peka huruf besar-kecil)

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/a1a90e53bc3366961181b3cbd4d09094179a463c
- https://github.com/le-firehawk/Cognis/commit/224a1bfb594412391c5dea99962fb9dc8c432396
