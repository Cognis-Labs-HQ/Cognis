# Penguatan Ubah Kata Sandi

**Feature Branch:** copilot/clean-up-password-change-popup

## Wajib Kata Sandi Saat Ini

Perubahan kata sandi di Pengaturan Pengguna sekarang selalu mewajibkan kata sandi saat ini dan memvalidasinya di server sebelum menerima kata sandi baru.

## Cegah Pakai Ulang Kata Sandi

Autentikasi lokal sekarang menyimpan riwayat hash kata sandi dan menolak perubahan jika kata sandi baru cocok dengan kata sandi yang pernah digunakan.

## Ganti Istilah Reset

Di Pengaturan Keamanan, teks “Reset Kata Sandi” diganti menjadi “Ubah Kata Sandi” untuk judul bagian, tombol aksi, dan judul popup.

## Perbaiki Kasus Tepi Verifikasi

Input kata sandi saat ini kini mempertahankan spasi di awal/akhir saat verifikasi, akun migrasi menambahkan hash sebelum rotasi ke riwayat sebelum pembaruan, adapter auth lama dengan dua parameter tetap kompatibel, dan retensi riwayat kata sandi kini dibatasi konsisten di penyimpanan DB maupun volatile.

## Commits

- [926f513](https://github.com/Cognis-Labs-HQ/Cognis/commit/926f513f10cade5b1e5f9367c98276b2898b4bc2)
