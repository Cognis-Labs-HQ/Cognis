# Adapter Notifikasi SMTP

## Ikhtisar

Adapter SMTP mengirimkan notifikasi sebagai email melalui server SMTP mana pun. Ini adalah satu-satunya adapter notifikasi bawaan dan aktif secara otomatis ketika variabel environment `COGNIS_SMTP_HOST` diatur. Kasus penggunaan tipikal meliputi pengiriman kode autentikasi dua faktor, tautan verifikasi email, dan kategori notifikasi lainnya.

Adapter mengimplementasikan pengiriman yang toleran terhadap greylisting: jika percobaan pengiriman pertama ditolak dengan kesalahan sementara, adapter akan mencoba kembali hingga dua kali dengan jeda lima menit di antara setiap percobaan.

## Tanggung Jawab

- Mengirim email melalui server SMTP yang dikonfigurasi menggunakan Nodemailer.
- Menangani kegagalan pengiriman sementara dengan percobaan ulang (hingga 2 percobaan, jeda 5 menit).
- Mengekspos `getConfig()` dan `setConfig()` untuk rekonfigurasi runtime melalui API admin.
- `codeLength` (angka, opsional): Panjang kode verifikasi SMTP bersama yang digunakan oleh konfirmasi email dan kode SMTP TFA. Nilai dibatasi ke rentang 4–10 digit dan disinkronkan dengan adapter SMTP TFA.
- Mengekspos `sendTestEmail(to)` untuk verifikasi pengiriman.

## Konfigurasi

| Variabel             | Default | Keterangan                                                  |
| -------------------- | ------- | ----------------------------------------------------------- |
| `COGNIS_SMTP_HOST`   | —       | Hostname server SMTP; adapter tidak aktif jika tidak diatur |
| `COGNIS_SMTP_PORT`   | `587`   | Port server SMTP                                            |
| `COGNIS_SMTP_SECURE` | `false` | `true` untuk TLS saat koneksi (port 465)                    |
| `COGNIS_SMTP_USER`   | —       | Nama pengguna autentikasi SMTP                              |
| `COGNIS_SMTP_PASS`   | —       | Kata sandi autentikasi SMTP                                 |
| `COGNIS_SMTP_FROM`   | —       | Alamat pengirim yang ditampilkan di header `From`           |

## Pengiriman uji

Pesan uji memakai antrean milik adapter dan pembatas laju per penerima yang sama dengan pengiriman SMTP operasional. Konfigurasi yang dikirim disertakan bersama uji dalam antrean, dan API menunggu hasil akhir pengiriman.
