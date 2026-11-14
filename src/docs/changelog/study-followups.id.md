# Perbaikan Media Belajar

**Cabang Fitur:** study-followups

## Ukuran Penampil Gambar

Penyedia pratinjau gambar bersama memuat lembar gayanya sebelum menerbitkan kontrol. Popup khusus gambar menghapus elemen judul dan menyesuaikan gambar asli lanskap, potret, serta panorama ke area layar tanpa gulir horizontal maupun vertikal. Pratinjau detail Library tetap dibatasi 20rem × 18rem; gambar mini editor tetap 8rem × 6rem.

## Media Belajar

Gambar referensi pada detail kartu membentuk deretan horizontal dengan bilah gulir tersembunyi. Pemutaran audio mengirim judul kartu, lapisan, Cognis sebagai artis, dan ikon aplikasi ke pusat media sistem, disertai kontrol putar/jeda/hentikan serta pembersihan saat tampilan ditutup. Berkas kalimat bawaan diprioritaskan daripada komposisi yang dibuat. Modul pendamping menyediakan 34 rekaman kalimat Jepang dan 45 rekaman kalimat Inggris secara langsung; 124 klip kana Jepang dibuat ulang dengan teks Jepang dan suara yang ditentukan secara eksplisit.

## Pembuatan Ulang Audio

Pembuatan ulang rekaman kartu global hanya memperbarui bidang audio dan indeks pencarian. Identitas wajib, skema, klasifikasi, kepemilikan, media khusus, dan referensi berkelompok tetap utuh. Pemeriksaan stempel waktu optimistis menolak perubahan bersamaan alih-alih menimpanya. Pemutaran berikutnya memakai rekaman baru yang tersimpan dalam cache.

## Kontrol Hapus Pelafalan

Chip pelafalan tersimpan menempatkan tombol hapus di samping komponen bacaan dengan jarak tersendiri, termasuk pada tata letak kanan ke kiri. Tombol X tidak menutupi bacaan pendek maupun panjang.

## Navigasi Panel Menulis

Membuka panel menulis dari detail kartu menutup popup detail setelah panel berhasil terbuka. Judul tersembunyi tetap ditampilkan pada klik pertama. Di Explore, klik berikutnya membuka kartu langsung; halaman Study lainnya tetap meminta konfirmasi sebelum berpindah ke Explore.

## Mode Latihan Terlihat dan Kontrol Bertema

Pemilih Baca/Tulis persisten kini menampilkan slot mengambangnya di halaman Flashcards. Perubahan mode tetap menyimpan preferensi dan meminta konfirmasi untuk memulai ulang sesi. Ikon ekspor dan pengaturan Study mengikuti warna kontrol aktif, tema terang/gelap aplikasi, dan keadaan hover tanpa bergantung pada tema sistem operasi.

## Isolasi Bahasa Study Nonaktif

Study Library memeriksa kapabilitas bahasa aktif sebelum menyediakan skema, kartu, audio, gambar, aset paket, atau permintaan tinjauan tersimpan. Bahasa nonaktif hilang dari hasil penelusuran dan pembacaan langsung ditolak. Pengaktifan kembali memulihkan akses tanpa menghapus konten. Status penyedia runtime tetap terpisah dari penyimpanan konten.

## Pencarian Registri Bahasa Aktif

Ketersediaan pustaka membaca kontribusi bahasa dari registri sistem aktif, bukan penyimpanan kapabilitas lokal adaptor. Menonaktifkan satu bahasa tetap mengizinkan skema, kartu, dan dependensi dek awal bahasa lain; mengaktifkannya kembali memulihkan konten tersimpan. Registri publik diutamakan daripada salinan lokal yang sudah usang.

## Komit

- [d5377cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5377cd20e1e0714e86966f1e9e1d4a584d7951f)
- [68f4cad](https://github.com/Cognis-Labs-HQ/Cognis/commit/68f4cad583d4ff3b9f0b14c9d083d04324f3cdf1)
- [316acf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/316acf324b61e0346a93e15f4c69f5421052a238)
- [d53cbaf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d53cbaf39759a0cc6bbf64a3f17fdcbd549398e7)
- [76d4cce](https://github.com/Cognis-Labs-HQ/Cognis/commit/76d4cce408ec01e05998d3a006900678f7068d8e)
- [ebf8d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/ebf8d696cba04da9959435855f51aa12cb43f7c0)
- [7808a8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7808a8ab8206210563535fd5bfd7580e2ba484fc)
- [3fbcc05](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fbcc05d9bb0cc0d4fce6644598a7bb299e045e0)
