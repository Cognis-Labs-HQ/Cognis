# Changelog PR

**Feature Branch:** copilot/add-browser-language-detection

## Ringkasan

Inisialisasi bahasa UI kini memprioritaskan preferensi bahasa dari browser pada
pemuatan awal dan menerapkannya jika paket bahasa tersebut didukung aplikasi.

Pilihan bahasa pada halaman registrasi sekarang otomatis memilih bahasa
terdeteksi yang didukung, lalu mempertahankan pilihan itu sampai pengguna
mengubahnya sendiri.

Kode bahasa yang tidak dikenal atau tidak didukung kini dibuang secara diam-diam
dari preferensi bahasa sehingga tidak muncul sebagai entri aktif di pengaturan.

Begitu pengguna mengubah urutan prioritas bahasa secara manual, urutan itu akan
menjadi acuan utama. Bahasa baru yang kemudian didukung tetap muncul di daftar
Tersedia, dan perubahan urutan bahasa browser/sistem tidak lagi mengacak urutan
bahasa aplikasi.

Tombol "Sinkronkan dari browser" pada halaman Pengaturan → Bahasa memungkinkan
pengguna menyesuaikan daftar prioritas kapan saja sesuai urutan bahasa browser
saat ini. Mengkliknya memperbarui daftar bahasa pilihan dan mengatur ulang mode
prioritas ke "otomatis", sehingga perubahan bahasa browser berikutnya kembali
diterapkan secara otomatis.

Tabel Bahasa Tersedia sekarang tetap menjadi area drop aktif meskipun tidak ada
baris, dan tombol Sinkronkan dari browser kini ditempatkan berdampingan dengan
judul Bahasa prioritas.

Kedua kartu tabel bahasa kini menggunakan jarak judul yang identik sehingga
tampak konsisten secara visual. Sorotan hijau saat drag-over juga sekarang
tampil dengan benar saat bahasa pertama diseret kembali ke tabel Bahasa Tersedia
yang kosong.

## Komponen dan file yang diubah

- `src/ui/reuse/i18n.js`
- `src/ui/app/settings/index.js`
- `src/ui/app/settings/language-prefs.js`
- `src/ui/styles/page-builder.css`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`
- `src/ui/languages/*/strings.xml`

## Commit

- [0b39a0e](https://github.com/Cognis-Labs-HQ/Cognis/commit/0b39a0e)
- [d9550aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/d9550aa2)
- [a70d7e7](https://github.com/Cognis-Labs-HQ/Cognis/commit/a70d7e70)
- [c8634d6](https://github.com/Cognis-Labs-HQ/Cognis/commit/c8634d6e)
- [61a470b](https://github.com/Cognis-Labs-HQ/Cognis/commit/61a470b9)
