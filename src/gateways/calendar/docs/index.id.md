# Gateway Kalender

## Pengiriman berbagi

Calendar berkontribusi ke gateway Share melalui hook alur dan kapabilitas `ctx`. Pengiriman kepada pengguna membuat kalender bersama milik penerima dan mengembalikan URL navigasi generik beserta umpan balik berhasil terlokalisasi satu kali. Kata sandi tetap dimiliki Share dan diambil dari keyring dengan pengenal berbagi kanonis.

## Perender berbagi publik

Calendar menyediakan `/static/gateways/calendar/ui/share-renderer.js` sebagai `mountScriptUrl` untuk tautan kalender. Share meneruskan payload kalender yang telah diselesaikan, kapabilitas yang diberikan, token tamu terbatas, terjemahan, dan sinyal pembatalan kepada `mount(root, options)`. Perender adapter memasang satu kartu kalender dengan pilihan tampilan hari, minggu, bulan, dan tahun serta tabel slot waktu standar; kalender lain dan kontrol dasbor penerima tidak pernah dimuat. Hanya kisi slot waktu yang bergulir secara vertikal, sesuai dengan kartu Kalender pengguna. Berbagi baca menampilkan acara. Berbagi `calendar:write` dapat membuat, mengedit, dan menghapus acara melalui `/api/v1/calendar/shared/:calendarId/events` dengan token tamu terbatas.
