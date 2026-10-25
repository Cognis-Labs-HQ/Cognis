# Gateway Kalender

## Pengiriman berbagi

Calendar berkontribusi ke gateway Share melalui hook alur dan kapabilitas `ctx`. Pengiriman kepada pengguna membuat kalender bersama milik penerima dan mengembalikan URL navigasi generik beserta umpan balik berhasil terlokalisasi satu kali. Kata sandi tetap dimiliki Share dan diambil dari keyring dengan pengenal berbagi kanonis.

## Perender berbagi publik

Calendar menyediakan `/static/gateways/calendar/ui/share-renderer.js` sebagai `mountScriptUrl` untuk tautan kalender. Share meneruskan payload kalender yang telah diselesaikan, kapabilitas yang diberikan, token tamu terbatas, terjemahan, dan sinyal pembatalan kepada `mount(root, options)`. Perender adapter memasang satu kartu kalender dengan pilihan tampilan hari, minggu, bulan, dan tahun serta tabel slot waktu standar; kalender lain dan kontrol dasbor penerima tidak pernah dimuat. Hanya kisi slot waktu yang bergulir secara vertikal, sesuai dengan kartu Kalender pengguna. Berbagi baca menampilkan acara. Berbagi `calendar:write` dapat membuat, mengedit, dan menghapus acara melalui `/api/v1/calendar/shared/:calendarId/events` dengan token tamu terbatas.

## Batas interaksi Kalender

Halaman Kalender pengguna mendelegasikan tindakan tampilan, periode, dan slot waktu dari akar halaman yang persisten sehingga render ulang composer tidak melepaskan kontrol. Pembuatan acara lebih dahulu memfilter semua kalender dengan aturan kalender tulis standar; bila tidak ada tujuan, toast terlokalisasi tentang ketiadaan kalender tulis ditampilkan sebagai pengganti formulir. Berbagi publik yang dapat ditulis mengautentikasi mutasi acara dengan token tamu terbatas.

## Integrasi shell Share

Calendar mengikuti siklus hidup berbagi rapat yang sudah terbukti: Share menghapus composer pemuatan lalu meneruskan akar halaman, konteks terselesaikan, terjemahan, dan sinyal pembatalan ke Calendar. Calendar kemudian memiliki halaman `createPageComposer` lengkap dengan header standar, kontrol tema, dan footer tanpa navigasi akun. Elemen kalender tunggal mengimpor dependensi formulir, popup, stempel waktu, dan tampilan secara langsung, sedangkan mutasi acara diautentikasi dengan token tamu terbatas yang diberikan.

## Status ketersediaan

Acara kalender memperbarui ketersediaan pengguna saat dimulai atau saat acara dibuat pada rentang waktu saat ini. Status manual yang dipilih setelah aktivasi tersebut berlaku hingga acara lain dimulai. Pengguna dapat menonaktifkan pembaruan status dari kalender melalui Pengaturan Pengguna → Umum.

## Batalkan Muatan Kalender Lama

Meninggalkan Kalender menghentikan inisialisasi yang sudah tidak berlaku sebelum mengubah halaman atau URL. Sinyal rute diteruskan ke penyusun halaman; respons kalender, acara, dan undangan yang terlambat tidak dapat membangun kembali tujuan yang telah diganti. Inisialisasi yang dibatalkan tidak menampilkan pemberitahuan kegagalan terlambat atau memulai ulang pengatur waktu ketersediaan.

## Kalender Lebih Cepat

Kalender mulai mengambil undangan bersamaan dengan daftar kalender dan memuat acara segera setelah daftar tersedia. Penyusunan halaman tetap menunggu pembacaan yang diperlukan. Kegagalan undangan mempertahankan perilaku daftar undangan kosong, dan setiap navigasi meminta data terbaru. Pemeriksaan pembatalan mencegah hasil terlambat menyusun halaman yang sudah tidak berlaku.

## Pilihan Pengingat

Pilih beberapa pengingat melalui kotak centang standar yang terlihat dan simpan semuanya sekaligus. Menghapus seluruh pilihan menonaktifkan pengingat, termasuk ketika kalender memiliki nilai bawaan. Jarak waktu pengingat khusus yang sudah ada tetap tersedia saat mengedit.

Saat membuat acara, `reminderOffsetsMinutes` yang tidak disertakan memakai nilai bawaan kalender; larik kosong menonaktifkan pengingat. Pembaruan tanpa bidang ini mempertahankan pilihan yang ada.

## Aset luring dan Kalender

Setelah autentikasi terverifikasi, Calendar menyimpan daftar kalender, undangan, dan acara milik pengguna dengan paling banyak dua permintaan latar belakang sekaligus. Invalidasi cache memperbarui snapshot tanpa menunda login. Acara tersimpan tetap dapat dibaca; pembuatan, perubahan, penghapusan, respons, preferensi status, dan perubahan kalender masuk ke outbox bersama. Acara baru dan perubahan yang tertunda terlihat dalam daftar tersimpan. Pembuatan menggunakan UUID operasi yang stabil; pengiriman ulang mengembalikan acara yang ada tanpa menggandakan rangkaian atau mengirim ulang undangan. Penggunaan ulang dengan isi berbeda atau akun lain ditolak. Server memeriksa otorisasi saat pengiriman ulang.

Snapshot kalender hanya berada dalam tab dan dibatasi 4 MB/100 pembacaan. Outbox global tetap dibatasi 1 MB/1.000 catatan/tujuh hari. Acara berulang baru menampilkan kejadian pertama hingga server membuat rangkaiannya. Pembuatan kalender, pembuatan rapat, pengelolaan berbagi/kata sandi, dan kredensial tamu memerlukan koneksi; kata sandi berbagi tidak pernah masuk buffer. Messages memerlukan daftar ruang tersimpan dan Study memerlukan metadata bahasa/preferensi tersimpan sebelum navigasi luring diaktifkan.
