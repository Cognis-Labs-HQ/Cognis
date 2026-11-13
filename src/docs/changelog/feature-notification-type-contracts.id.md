# Kontrak Pengiriman Bertipe

**Cabang Fitur:** feature-notification-type-contracts

## Notify 2.2.10

Pemeriksaan antrean pengirim bersifat opsional dan memiliki tipe dalam kontrak Notify. Bootstrap memuat penyimpanan milik gateway secara langsung serta menyediakan operasi email dan preferensinya tanpa penegasan tipe konstruktor yang tidak lengkap. Validasi siaran menghasilkan peran dan jadwal yang valid sebelum penyimpanan.

## Internal 0.5.34

Pengiriman internal memperoleh eksekutor basis data terstruktur melalui ctx. Kontrak pencatatannya memakai tingkat keparahan bootstrap yang didukung. Enkripsi, otorisasi kotak masuk, dan pengiriman yang selalu aktif tidak berubah.

## SMTP 0.5.3

Entri antrean SMTP mempertahankan subjek wajibnya selama pengiriman dan percobaan ulang. Opsi koneksi TLS membawa sinyal pembatalan untuk TLS langsung dan STARTTLS; kebijakan sertifikat, batas waktu, dan pembersihan koneksi tidak berubah.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/fb1d8327e8118e5e0b6d34c6c9937d6b3964fd7b
