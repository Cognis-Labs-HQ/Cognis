# Menyelaraskan kepemilikan konfigurasi modul

## Gunakan endpoint konfigurasi milik modul

Cognis kini merender bidang yang dideklarasikan manifes modul sambil memuat dan menyimpan nilai melalui endpoint konfigurasi `GET` dan `PUT` milik tiap modul. Modul tetap bertanggung jawab untuk memvalidasi, menerapkan, dan menyimpan pengaturan operasionalnya; Cognis tidak lagi mempertahankan konfigurasi paralel berbasis preferensi.

## Berikan proses logging dan umpan balik host kepada modul

Konteks server modul kini menulis entri terlingkup ke pencatat aplikasi. Modul browser dapat memakai kapabilitas host untuk logging server terautentikasi, toast bertema, dan popup kesalahan runtime alih-alih membiarkan kegagalan operasional hanya di konsol browser.
