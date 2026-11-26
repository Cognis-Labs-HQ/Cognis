# Penggunaan

Prosedur praktis untuk Akun Lokal.

## Prasyarat

Administrator akun memerlukan sesi CLI terautentikasi untuk mengelola kredensial pengguna lain.

## Contoh

Jalankan `cognisctl user:create` dan ikuti pertanyaannya. Gunakan `cognisctl user:set-password` untuk mengganti kata sandi lokal atau `cognisctl user:disable` untuk menangguhkan akun.

## Hasil yang Diharapkan

Kredensial baru dapat dipakai masuk lokal; akun nonaktif tidak dapat masuk. Antarmuka pendaftaran membuat pengguna biasa, bukan administrator.

## Pemecahan Masalah

Periksa nama pengguna, status akun, dan penyedia terpilih. Kata sandi penyedia eksternal dikelola di penyedia tersebut, bukan dengan mengganti kata sandi lokal Cognis.
