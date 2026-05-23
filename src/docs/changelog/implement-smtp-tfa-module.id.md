# Isolasi SMTP TFA

## Identitas adapter SMTP TFA diganti

ID adapter auth internal dan identitas paket diubah dari `email-tfa` menjadi `smtp-tfa`, sementara label untuk pengguna tetap “Email TFA”.

## Ketergantungan ID adapter hardcoded di gateway auth dihapus

Resolusi adapter TFA pada gateway auth sekarang memakai hook kapabilitas, bukan ID adapter tetap, agar perilaku benar-benar digerakkan adapter.

## Tampilkan ketergantungan adapter di popup pengaturan

Popup pengaturan adapter kini menampilkan tautan ketergantungan dengan perilaku tautan yang sama seperti ketergantungan komponen, termasuk target adapter.

## Cakupan SMTP TFA dipindah ke test adapter

Cakupan perilaku SMTP TFA dihapus dari test gateway auth dan ditambahkan sebagai test adapter khusus di `src/adapters/auth/smtp-tfa/tests/`.
