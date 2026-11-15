# Navigasi Study Seluler

**Cabang Fitur:** fix-study-mobile-navigation

## Kontrol Study Ringkas

Navigasi utama memakai ikon menu. Tautan halaman Study tetap pada satu baris yang dapat digulir mendatar; tautan aktif ditampilkan kembali setelah ukuran atau fon berubah. Bahasa, pencarian kamus, dan pengaturan berbagi baris kedua. Pada layar kecil, pencarian kamus membuka dialog yang mempertahankan formulir asli dan isian, mengembalikan fokus, serta menutup saat berpindah halaman atau beralih ke ukuran desktop.

## Halaman Study Rapi

Kartu Study muat dalam kolom sempit dan ikhtisar memakai pengguliran dokumen alami. Saat halaman Study ringkas digulir, baris merek memberi ruang sementara navigasi utama tetap tersedia. Alias Flashcards menampilkan bahasa terpilih tanpa menunggu navigasi ke modulnya sendiri yang masih dimuat. Sasaran kamus tutorial mengikuti kontrol yang terlihat.

## Formulir dan Filter Sempit

Kontrol penelusuran Study membungkus di dalam kolom konten sempit. Merek dan kolom masukan untuk masuk serta pendaftaran menyesuaikan lebar yang tersedia, termasuk layar selebar 253 piksel.

## Masukan Uji Peramban Aman

Uji Chromium mengirim kredensial, pemilih, dan nilai navigasi sebagai argumen protokol terstruktur, bukan membangun JavaScript dari nilai tersebut. Cakupan regresi meliputi teks berbahaya, navigasi langsung dan SPA, halaman Study berisi data, orientasi ponsel dan tablet, serta tata letak desktop. Implementasi modul eksternal tetap di luar perubahan ini.

## Komit

- [d1b5fe1ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/d1b5fe1ac497bc516a04d1f06717007512a6a40e)
- [f4f6d3a84](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4f6d3a84b587d4eb169b5db76b850956544ad31)
