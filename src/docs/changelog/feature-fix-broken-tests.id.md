# Kalender Bersama Andal

## Undangan dan tanggapan berfungsi konsisten

Acara yang dibuat melalui kalender bersama yang dapat ditulis kini menyertakan seluruh penerima, mengarahkan notifikasi ke kalender tiap penerima, dan memungkinkan penerima baca-saja menanggapi dari tampilan bersama.

## Berbagi ulang mempertahankan akses

Membagikan kalender kembali kepada penerima yang sudah ada tidak lagi mengatur ulang izin tulis atau masa berlaku.

## Berkas sumber memenuhi batas arsitektur

Berkas sumber kalender, rapat, dan papan tulis diringkas hingga di bawah batas ukuran yang diberlakukan tanpa mengubah perilakunya.

## Popup berbagi berhasil dimuat

Popup Berbagi Tautan kini memuat panggilan balik API dari jalur aset statis Gateway Berbagi yang terdaftar, bukan meminta berkas lokal adaptor yang tidak tersedia.

## Login membatalkan pembukaan keyring

Login akun yang selesai kini menghapus kunci pembuka sesi browser. Keyring dengan kata sandi terpisah tetap terkunci sampai kata sandi tersebut dimasukkan secara lokal, sedangkan pemuatan ulang halaman biasa masih dapat mempertahankan sesi yang dibuka secara eksplisit.

## Chat membuka keyring sebelum pemulihan kunci

Saat percakapan dibuka, keyring lokal kini diperiksa dan dibuka sebelum kunci ruang yang hilang diminta. Metadata ruang tidak lagi membagikan kunci; permintaan masuk ruang yang eksplisit dan terautentikasi hanya memulihkan kunci setelah keyring yang terbuka melaporkannya hilang.

## Penghancuran menghapus setiap kunci lokal

Menghancurkan keyring kini menunggu penyimpanan yang tertunda, menghapus amplop lokal dan kunci sesi, serta membatalkan cache kunci komponen sebelum brankas pengganti dibuat. Konfirmasi destruktif menggunakan gaya batal, sedangkan tindakan pembatalan yang aman menggunakan gaya konfirmasi.

## Pengiriman rahasia satu kali dan pratinjau obrolan yang tersinkronisasi

Pembuatan dan penghancuran keyring kini menggunakan notifikasi sukses dan peringatan yang terpisah. Pratinjau obrolan diperbarui segera setelah kunci ruang masuk ke keyring, dan server mencatat pengiriman kunci ruang per anggota sehingga anggota terautentikasi hanya dapat menerima kunci ruang yang dibuat satu kali; kunci yang hilang harus ditambahkan secara manual atau melalui undangan peserta baru. Kata sandi rapat dienkripsi saat disimpan dan juga hanya dikirim kepada setiap peserta yang diundang pada saat pertama kali bergabung.

## Pulihkan spasi dan dokumentasi yang disengaja

Spasi sumber yang sudah ada pada komponen gantungan kunci, kalender, dan papan tulis serta dokumentasi kontrak pemasangan halaman Rapat dipulihkan agar perbaikan regresi tetap berfokus pada perubahan perilaku.

## Kunci ruang dan kata sandi rapat tetap dapat dipulihkan hingga tersimpan dengan aman

Kunci ruang yang hilang dibuat untuk percakapan hasil migrasi, sedangkan kunci ruang dan kata sandi rapat yang dikirim tetap tersedia untuk dicoba kembali hingga klien mengonfirmasi penyimpanan yang berhasil di gantungan kunci.
