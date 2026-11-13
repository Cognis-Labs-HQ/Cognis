# Kontrak Pengiriman Bertipe

**Cabang Fitur:** feature-notification-type-contracts

## Notify 2.2.10

Pemeriksaan antrean pengirim bersifat opsional dan memiliki tipe dalam kontrak Notify. Bootstrap memuat penyimpanan milik gateway secara langsung serta menyediakan operasi email dan preferensinya tanpa penegasan tipe konstruktor yang tidak lengkap. Validasi siaran menghasilkan peran dan jadwal yang valid sebelum penyimpanan.

## Internal 0.5.34

Pengiriman internal memperoleh eksekutor basis data terstruktur melalui ctx. Kontrak pencatatannya memakai tingkat keparahan bootstrap yang didukung. Enkripsi, otorisasi kotak masuk, dan pengiriman yang selalu aktif tidak berubah.

## SMTP 0.5.3

Entri antrean SMTP mempertahankan subjek wajibnya selama pengiriman dan percobaan ulang. Opsi koneksi TLS membawa sinyal pembatalan untuk TLS langsung dan STARTTLS; kebijakan sertifikat, batas waktu, dan pembersihan koneksi tidak berubah.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/419e8648fe3bcbb04f1280517b79bba83852ecf4
