# Gateway Kalender

## Pengiriman berbagi

Calendar berkontribusi ke gateway Share melalui hook alur dan kapabilitas `ctx`. Pengiriman kepada pengguna membuat kalender bersama milik penerima dan mengembalikan URL navigasi generik beserta umpan balik berhasil terlokalisasi satu kali. Kata sandi tetap dimiliki Share dan diambil dari keyring dengan pengenal berbagi kanonis.

## Perender berbagi publik

Calendar menyediakan `/static/gateways/calendar/ui/share-renderer.js` sebagai `mountScriptUrl` untuk tautan kalender. Share meneruskan payload kalender yang telah diselesaikan, kapabilitas yang diberikan, token tamu terbatas, terjemahan, dan sinyal pembatalan kepada `mount(root, options)`. Perender adapter memasang satu kartu kalender dengan pilihan tampilan hari, minggu, bulan, dan tahun serta tabel slot waktu standar; kalender lain dan kontrol dasbor penerima tidak pernah dimuat. Hanya kisi slot waktu yang bergulir secara vertikal, sesuai dengan kartu Kalender pengguna. Berbagi baca menampilkan acara. Berbagi `calendar:write` dapat membuat, mengedit, dan menghapus acara melalui `/api/v1/calendar/shared/:calendarId/events` dengan token tamu terbatas.

## Batas interaksi Kalender

Halaman Kalender pengguna mendelegasikan tindakan tampilan, periode, dan slot waktu dari akar halaman yang persisten sehingga render ulang composer tidak melepaskan kontrol. Pembuatan acara lebih dahulu memfilter semua kalender dengan aturan kalender tulis standar; bila tidak ada tujuan, toast terlokalisasi tentang ketiadaan kalender tulis ditampilkan sebagai pengganti formulir. Berbagi publik yang dapat ditulis mengautentikasi mutasi acara dengan token tamu terbatas.

## Integrasi shell Share

Calendar mengikuti siklus hidup berbagi rapat yang sudah terbukti: Share menghapus composer pemuatan lalu meneruskan akar halaman, konteks terselesaikan, terjemahan, dan sinyal pembatalan ke Calendar. Calendar kemudian memiliki halaman `createPageComposer` lengkap dengan header standar, kontrol tema, dan footer tanpa navigasi akun. Elemen kalender tunggal mengimpor dependensi formulir, popup, stempel waktu, dan tampilan secara langsung, sedangkan mutasi acara diautentikasi dengan token tamu terbatas yang diberikan.
