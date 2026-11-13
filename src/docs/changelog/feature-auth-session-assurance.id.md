# Sesi Login Terverifikasi

**Cabang Fitur:** feature-auth-session-assurance

## Tunda penyelesaian sesi

Wajibkan autentikasi lengkap sebelum aktivasi profil dan penerbitan token biasa. Tolak dengan aman saat penilaian siklus hidup atau TFA gagal, pertahankan penonaktifan administrator yang eksplisit, dan sediakan kode pemulihan saat penyedia bermasalah.

## Uji batas penyelesaian

Tambahkan kontrak pemilik bertahap, konsumsi percobaan atomik, perlindungan penyiapan bersamaan, pesan kesalahan terjemahan, dan pengujian regresi offline milik komponen. Ekstensi login utama berjalan sebelum penilaian; pemanggil login akhir kini memakai `auth:login`.

## Pertahankan kegagalan inisialisasi

Core 0.6.4 mencatat kegagalan bootstrap gateway yang ditemukan secara terpisah dari registrasi yang dapat dijalankan. Auth membedakan ketidakhadiran opsional dan penonaktifan disengaja dari inisialisasi gagal. Auth 2.2.5 dan TFA 1.3.7 memakai kapabilitas akhir setelah semua pemeriksaan kebijakan yang dapat diperluas, dengan pembersihan token milik operasi dan batas siklus hidup nontransaksional yang dijelaskan.

## Commit

- [0f5aaa8: Selesaikan sesi hanya setelah verifikasi akhir](https://github.com/Cognis-Labs-HQ/Cognis/commit/0f5aaa8b1ef309db23b947ea6361dc3369e4713f)
