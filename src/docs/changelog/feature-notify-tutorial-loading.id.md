# Cakupan Panduan Notifikasi

**Cabang Fitur:** feature-notify-tutorial-loading

## Periksa katalog panduan notifikasi

Pengujian regresi memeriksa pendaftaran panduan Preferensi Notifikasi, Pengiriman Notifikasi, dan Administrasi Siaran terhadap katalog bahasa Inggris, Jerman, Indonesia, dan Jepang. Dokumentasi tutorial notifikasi menjelaskan kepemilikan katalog dan penggunaan bahasa Inggris sebagai pengganti.

## Periksa pendaftaran dari cache

Pengujian regresi host tutorial kini menjalankan service worker bersama lokalisasi dan pendaftaran bertahap. Pengujian memastikan katalog gateway lama diperbarui sebelum pendaftaran, penggantian dengan bahasa Inggris, pendaftaran luring berulang, dan kegagalan eksplisit untuk terjemahan yang hilang.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/eec701ecd4b8577c474ed0cb038dff87f08e51d6
