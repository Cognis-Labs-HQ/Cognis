# Menghormati batas waktu sesi pribadi

**Cabang Fitur:** feature-implement-session-expiry-tracking-rules

## Mempertahankan pilihan batas waktu pribadi dalam batas global

Preferensi batas waktu sesi pengguna diutamakan saat lebih singkat daripada batas administrasi. Masuk atau mengatur ulang kini mengadopsi batas waktu global saat ini sebagai nilai pribadi, bukan terus mengikuti kenaikan berikutnya. Batas global yang lebih singkat menurunkan dan menyimpan nilai pribadi, sedangkan batas yang lebih panjang membiarkannya tetap. Kontrol durasi hanya menawarkan satuan yang sesuai dan membatasi kolom angka setiap satuan pada nilai bulat terbesar yang diizinkan.

## Menerapkan batas waktu lebih panjang dengan aman

Memperpanjang batas waktu pribadi mempertahankan sesi saat ini dan menampilkan pemberitahuan bahwa perubahan berlaku saat masuk berikutnya. Warna hitung mundur diperbarui secara langsung dengan rentang urgensi yang menyesuaikan durasi: sesi singkat tetap memberi peringatan yang berguna, sedangkan sesi empat minggu atau lebih baru menjadi oranye pada hari terakhir dan merah pada jam terakhir.

## Menjaga penonaktifan kedaluwarsa dan proses masuk tetap andal

Pengaturan global Tidak Pernah kini mengesampingkan batas waktu pribadi yang ada. Kegagalan sementara saat menormalkan preferensi tersimpan juga tidak lagi mencegah pengguna masuk.

## Menyebarkan versi paket gateway

Paket gabungan gateway Cognis dan setiap komponen lokal yang bergantung padanya kini mendeklarasikan versi teruji terbaru, sehingga manifes workspace dan berkas kunci tetap selaras dengan perubahan gateway Autentikasi.

## Komit

- [e92abbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/e92abbeda31ee1306beacce0bb7410129536cf00)
