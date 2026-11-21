# Kontrak Social Bertipe

**Cabang Fitur:** feature-social-files-type-contracts

## Penyimpanan dan Rute Bertipe

Deklarasi peran dan visibilitas profil sosial kini sesuai dengan rekaman tersimpan. Rute pesan dan profil tetap mempertahankan pemeriksaan izin, sementara callback, notifikasi, dan perintah basis data menggunakan kontrak eksplisit. Resolusi sesi tamu yang tidak tersedia tetap menggagalkan proses sebelum profil tamu dibaca.

## Pengujian Kontrak Terisolasi

Pengujian penyimpanan profil menggunakan simulasi basis data terstruktur milik komponen dengan transaksi. Pengujian penolakan keanggotaan mencakup tamu dan bukan anggota. Pengujian ACL Files menyertakan komponen pemanggil secara eksplisit; identitas namespace dan aturan akses tidak berubah.

## Komit

- [4c9af91f2455a5551bd1ef8474a0476c7cc962d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c9af91f2455a5551bd1ef8474a0476c7cc962d9)
- [c226a2ba265d8c855a33889ac8a47ef3cc1a9399](https://github.com/Cognis-Labs-HQ/Cognis/commit/c226a2ba265d8c855a33889ac8a47ef3cc1a9399)
