# Kontrak Social Bertipe

**Cabang Fitur:** feature-social-files-type-contracts

## Penyimpanan dan Rute Bertipe

Deklarasi peran dan visibilitas profil sosial kini sesuai dengan rekaman tersimpan. Rute pesan dan profil tetap mempertahankan pemeriksaan izin, sementara callback, notifikasi, dan perintah basis data menggunakan kontrak eksplisit. Resolusi sesi tamu yang tidak tersedia tetap menggagalkan proses sebelum profil tamu dibaca.

## Pengujian Kontrak Terisolasi

Pengujian penyimpanan profil menggunakan simulasi basis data terstruktur milik komponen dengan transaksi. Pengujian penolakan keanggotaan mencakup tamu dan bukan anggota. Pengujian ACL Files menyertakan komponen pemanggil secara eksplisit; identitas namespace dan aturan akses tidak berubah.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ff7f3932e04aa47722da1841f1a891c550f240e2
