# Popup pengaturan modul selaras dengan adapter

**Feature Branch:** feature-investigate-nextcloud-module-settings-loading-issue

## Baris modul kini membuka pengaturan terpadu

Jitsi Meet dan Nextcloud Whiteboard kini membuka konfigurasi dari baris modul itu sendiri, bukan melalui ikon roda gigi terpisah, sehingga selaras dengan perilaku konfigurasi adapter.

## Pengaturan menyertakan kontrol daya modul

Popup pengaturan modul kini menyertakan tombol aktifkan sehingga administrator dapat mengubah konfigurasi dan status daya secara bersamaan.

## Dependensi yang hilang menampilkan kesalahan pengaturan yang jelas

Nextcloud Whiteboard tetap mendaftarkan endpoint pengaturannya saat dependensi runtime yang diperlukan tidak tersedia, sehingga administrator menerima respons layanan tidak tersedia, bukan 404 karena rute hilang.

## Pembaruan parsial dapat disimpan sebelum rahasia diisi

Pengaturan Nextcloud Whiteboard kini menerima pembaruan URL server dan batas unggahan meskipun kolom kunci API sengaja dibiarkan kosong, sambil tetap melaporkan modul belum sepenuhnya dikonfigurasi sampai kunci yang valid diberikan.

## Validasi per kolom menjaga pengaturan tetap terbuka

Kesalahan validasi pengaturan modul kini menyebutkan kolom yang tidak valid, sehingga popup konfigurasi bersama tetap terbuka dan menandai input tersebut alih-alih membuang perubahan admin yang valid.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e33bb93726bab2eb01bf3d24f3704d2b4127dda0
