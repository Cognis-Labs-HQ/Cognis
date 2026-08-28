# Kepatuhan dan Rapikan Admin

**Feature Branch:** copilot/comply-codebase-instructions

## Satukan Keamanan di Administrasi

Bagian terpisah Administration → Authentication dihapus dengan menghentikan registrasi section admin auth. Kontrol kebijakan kata sandi sekarang berada langsung di Administration → Security bersama domain tepercaya, kontrol registrasi, metode validasi, dan persetujuan guru.

## Kurangi Permukaan UI Auth Redundan

Aset administrasi auth lama yang hanya dipakai oleh section Authentication yang dihapus sudah dibersihkan. Ini mengurangi beban pemeliharaan dan menghapus permukaan konfigurasi ganda.

## Tambahkan Tes Guardrail Kepatuhan

Tes kepatuhan arsitektur baru menegakkan konvensi direktori UI/app dan API/routes, mencegah file sumber baru melebihi 1000 baris, dan mencegah coupling core/api-ke-gateway langsung baru di luar daftar warisan yang dibatasi.

## Perketat Wiring Auth Berbasis Ctx

Setup route server dan module extension kini mengandalkan konteks auth route yang diinjeksi, bukan fallback implisit. Startup sekarang gagal cepat bila konteks auth route tidak tersedia.

## Perjelas Prioritas Instruksi AI

Instruksi AI diperbarui untuk menegaskan disiplin LOC, menolak anggapan diff besar sebagai indikator kualitas, mewajibkan penamaan generik, menegakkan batas reuse yang benar, memisahkan HTML dari JS/TS, dan memecah file besar ke struktur direktori dengan entrypoint.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a267b4cce59173b5060e5035a628583868afa39e
