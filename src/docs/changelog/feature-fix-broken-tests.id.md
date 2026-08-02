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
