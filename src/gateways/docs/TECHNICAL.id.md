# Referensi Teknis

Antarmuka publik dan aturan operasional Gerbang Fitur.

## Antarmuka

Ruang kerja ini menyediakan kode platform bersama. Kontrak fitur publik dimiliki kemampuan, perintah, atau gerbang yang didokumentasikan; paket ini tidak menyediakan layanan HTTP terpisah.

## Konfigurasi

Konfigurasi host dan kemampuan terdaftar menyediakan konteks operasional. Paket ini tidak menambahkan layanan konfigurasi mandiri.

## Perilaku

Paket ini diterapkan bersama Cognis. Siklus hidup setiap fitur mengelola pengaktifan, pemeriksaan dependensi, dan pembersihan.

## Keamanan

Kemampuan dan perintah publik mempertahankan otorisasi setiap operasi. Memasang paket tidak memberikan akses ke sumber daya pribadi.

## Referensi

Kode sumber dan metadata paket: `src/gateways/`.
