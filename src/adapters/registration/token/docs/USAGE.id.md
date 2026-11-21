# Penggunaan

Prosedur praktis untuk Undangan Pendaftaran.

## Prasyarat

Kebijakan undangan mengatur penerbitan; token mandiri memerlukan administrator atau pemilik.

## Contoh

Jalankan `cognisctl invite:email:send person@example.com` untuk email atau `cognisctl invite:token:generate` untuk tautan mandiri yang diizinkan.

Administrator dan pendiri menerbitkan undangan melalui halaman Pengguna. Penyedia autentikasi eksternal meneruskan email terverifikasi dan token pendaftaran melalui alur gerbang pembuatan akun, bukan mengimpor adapter.

## Hasil yang Diharapkan

Penukaran membuat akun yang diizinkan dan memakai undangan; pengiriman berhasil menggantikan undangan lama yang tertunda.

## Pemecahan Masalah

Periksa kedaluwarsa, email undangan, kebijakan, dan pengiriman. Pendiri dibatasi sepuluh undangan tertunda.
