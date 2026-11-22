# Kontrak Social Bertipe

**Cabang Fitur:** feature-social-files-type-contracts

## Penyimpanan dan Rute Bertipe

Deklarasi peran dan visibilitas profil sosial kini sesuai dengan rekaman tersimpan. Rute pesan dan profil tetap mempertahankan pemeriksaan izin, sementara callback, notifikasi, dan perintah basis data menggunakan kontrak eksplisit. Resolusi sesi tamu yang tidak tersedia tetap menggagalkan proses sebelum profil tamu dibaca.

## Pengujian Kontrak Terisolasi

Pengujian penyimpanan profil menggunakan simulasi basis data terstruktur milik komponen dengan transaksi. Pengujian penolakan keanggotaan mencakup tamu dan bukan anggota. Pengujian ACL Files menyertakan komponen pemanggil secara eksplisit; identitas namespace dan aturan akses tidak berubah.

## Komit

- [2e913c2810feec19fb4c08ead1c01fd2335a046f](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e913c2810feec19fb4c08ead1c01fd2335a046f)
- [dc8cc7ab0a27286fbed63e53637c73a0ce5878d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc8cc7ab0a27286fbed63e53637c73a0ce5878d3)
- [103bf368dd7f8931da2681a838e01e2d9980a4c2](https://github.com/Cognis-Labs-HQ/Cognis/commit/103bf368dd7f8931da2681a838e01e2d9980a4c2)
