# Isolasi SMTP TFA

## Identitas adapter SMTP TFA diganti

ID adapter auth internal dan identitas paket diubah dari `email-tfa` menjadi `smtp-tfa`, sementara label untuk pengguna tetap “Email TFA”.

## Ketergantungan ID adapter hardcoded di gateway auth dihapus

Resolusi adapter TFA pada gateway auth sekarang memakai hook kapabilitas, bukan ID adapter tetap, agar perilaku benar-benar digerakkan adapter.

## Tampilkan ketergantungan adapter di popup pengaturan

Popup pengaturan adapter kini menampilkan tautan ketergantungan dengan perilaku tautan yang sama seperti ketergantungan komponen, termasuk target adapter.

## Cakupan SMTP TFA dipindah ke test adapter

Cakupan perilaku SMTP TFA dihapus dari test gateway auth dan ditambahkan sebagai test adapter khusus di `src/adapters/auth/smtp-tfa/tests/`.

## Tambahkan kontrol TFA di Administration

Menambahkan area TFA baru di Administration → Security dengan tabel metode tersedia dan aktif, aktivasi drag-and-drop, serta slider enforcement yang nonaktif saat tidak ada metode yang fungsional.

## Terapkan onboarding TFA untuk pengguna baru

Saat enforcement aktif, pengguna baru kini wajib menyelesaikan alur onboarding TFA, termasuk API status setup dan popup setup yang tidak bisa ditutup, serta dapat mewajibkan email terverifikasi sebelum mengaktifkan SMTP TFA.

## Pindahkan tabel metode TFA ke Preferensi Pengguna

Tabel drag-and-drop metode TFA tersedia dan aktif dipindahkan dari Administration ke pengaturan keamanan Preferensi Pengguna, sementara kontrol enforcement tetap berada di Administration.

## Tambahkan challenge setup SMTP saat aktivasi

Saat SMTP TFA diaktifkan, kini muncul alur challenge kode setup yang dikirim lewat email di popup agar metode baru aktif setelah verifikasi berhasil.

## Tampilkan prompt TFA login di panel auth

Pada alur login, prompt verifikasi TFA kini dirender langsung di panel auth dan mendukung tab saat ada banyak media verifikasi; tab disembunyikan bila hanya satu media.
