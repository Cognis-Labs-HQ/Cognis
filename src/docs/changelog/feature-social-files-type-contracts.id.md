# Kontrak Social Bertipe

**Cabang Fitur:** feature-social-files-type-contracts

## Penyimpanan dan Rute Bertipe

Deklarasi peran dan visibilitas profil sosial kini sesuai dengan rekaman tersimpan. Rute pesan dan profil tetap mempertahankan pemeriksaan izin, sementara callback, notifikasi, dan perintah basis data menggunakan kontrak eksplisit. Resolusi sesi tamu yang tidak tersedia tetap menggagalkan proses sebelum profil tamu dibaca.

## Pengujian Kontrak Terisolasi

Pengujian penyimpanan profil menggunakan simulasi basis data terstruktur milik komponen dengan transaksi. Pengujian penolakan keanggotaan mencakup tamu dan bukan anggota. Pengujian ACL Files menyertakan komponen pemanggil secara eksplisit; identitas namespace dan aturan akses tidak berubah.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/7629b15df776f93d33a6ef423aab750de61a28a6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7aee693c7a0d3e82cf7e5744c46406f1cb3c41e9
