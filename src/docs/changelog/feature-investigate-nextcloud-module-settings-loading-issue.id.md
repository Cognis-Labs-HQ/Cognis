# Popup pengaturan modul selaras dengan adapter

## Baris modul kini membuka pengaturan terpadu

Jitsi Meet dan Nextcloud Whiteboard kini membuka konfigurasi dari baris modul itu sendiri, bukan melalui ikon roda gigi terpisah, sehingga selaras dengan perilaku konfigurasi adapter.

## Pengaturan menyertakan kontrol daya modul

Popup pengaturan modul kini menyertakan tombol aktifkan sehingga administrator dapat mengubah konfigurasi dan status daya secara bersamaan.

## Dependensi yang hilang menampilkan kesalahan pengaturan yang jelas

Nextcloud Whiteboard tetap mendaftarkan endpoint pengaturannya saat dependensi runtime yang diperlukan tidak tersedia, sehingga administrator menerima respons layanan tidak tersedia, bukan 404 karena rute hilang.

## Pembaruan parsial dapat disimpan sebelum rahasia diisi

Pengaturan Nextcloud Whiteboard kini menerima pembaruan URL server dan batas unggahan meskipun kolom kunci API sengaja dibiarkan kosong, sambil tetap melaporkan modul belum sepenuhnya dikonfigurasi sampai kunci yang valid diberikan.
