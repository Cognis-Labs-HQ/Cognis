# Gaya Pesan di Semua Halaman

**Feature Branch:** copilot/respect-user-preferences-message-style

## Gaya gelembung ucapan dan IRC kini dihormati di obrolan Rapat

Panel mini-obrolan di halaman Rapat sekarang membaca preferensi gaya pesan pengguna (Default, Gelembung Ucapan, atau IRC) dan menerapkannya pada pesan obrolan, sesuai dengan perilaku halaman Pesan mandiri.

## Indikator pengetikan dipindahkan ke posisi yang benar

Notifikasi "seseorang sedang mengetik…" di halaman Pesan telah dipindahkan dari atas utas pesan ke tepat di atas kolom input komposer — posisi tempat pesan masuk berikutnya akan muncul.

## Tata letak IRC dan reaksi mini-obrolan diperbaiki

Tata letak IRC di halaman Pesan kini menempatkan tanda baca sebagai dibaca tetap sebaris dengan pesan dan memusatkan avatar baca dengan benar. Gelembung ucapan juga dibuat lebih jelas. Mini-obrolan di halaman Rapat sekarang memiliki menu reaksi melayang dan pemilih emoji yang sama seperti di halaman Pesan.

## Gelembung kini lebih menonjol

Pesan bergaya gelembung sekarang memakai token permukaan yang lebih terangkat dan bayangan yang lebih kuat agar tetap jelas di latar gelap.

## Warna gelembung mode gelap

Pesan sendiri menggunakan latar belakang biru tua (#1d2f4a) dan pesan orang lain menggunakan teal gelap (#1a3336) di mode gelap.

## Ikon status pengiriman SVG

Indikator lingkaran diganti dengan ikon SVG: tanda tanya dalam kotak segera setelah pengiriman, dan tanda centang dalam kotak setelah pengiriman dikonfirmasi.

## Avatar tanda baca bertumpuk

Beberapa avatar pembaca kini ditampilkan bertumpuk dari kanan ke kiri. Lingkaran kosong sebelum dibaca dihapus. Mengarahkan kursor ke tumpukan menampilkan popup dengan nama dan waktu baca setiap pembaca. Avatar status tidak lagi memicu kartu pratinjau profil.

## Reaksi dipindahkan ke luar gelembung

Reaksi kini muncul di bawah gelembung dengan latar belakang tipis saat ada chip aktif.

## Format handle IRC

Di tata letak IRC, pengirim ditampilkan dalam format `{{handle}}` dengan kurung kurawal ganda.

## Avatar pengirim pada gelembung ucapan

Di mode gelembung ucapan, pesan sendiri menampilkan avatar pengirim yang semi-besar tumpang tindih di sudut kanan atas gelembung.

## Luapan horizontal pesan sendiri diperbaiki

Gelembung pesan sendiri kini menyesuaikan lebarnya dengan konten terlebar, baik teks pesan maupun baris metadata (stempel waktu + ikon status). Pesan singkat tidak lagi menyebabkan gulir horizontal.

## Tata letak tinggi viewport tanpa gulir halaman

Panel utas pesan kini mengisi penuh tinggi viewport dengan benar. Daftar pesan bergulir secara internal sementara area komposer tetap terpaku di bagian bawah. Tidak ada bilah gulir tingkat halaman yang muncul, dan navigasi ke halaman lain memulihkan perilaku gulir normal mereka.

## Popup hover tanda baca sebagai dibaca diperbaiki

Popup "Dilihat oleh N orang" yang muncul saat mengarahkan kursor ke avatar tanda baca kini menggunakan `position: fixed` agar muncul di posisi yang benar di layar.

## Overflow horizontal pesan sendiri dihilangkan (perbaikan tata letak)

`max-width` kini diterapkan pada flex item pembungkus pesan, bukan pada gelembung itu sendiri, sehingga persentase diselesaikan dengan benar terhadap lebar utas.

## Komposer tidak lagi terpotong

Rantai tinggi penuh dari viewport hingga panel konten kini menerapkan `height: 100%; overflow: hidden` di setiap level, termasuk `.content-panel`.

## IRC: pesan sendiri rata kiri di semua bagian

Dalam gaya IRC, chip reaksi emoji, pemilih reaksi, dan status tanda baca untuk pesan sendiri kini rata kiri sesuai pesan masuk. Jarak antar pesan ditingkatkan untuk keterbacaan yang lebih baik.

## Avatar gelembung ucapan tumpang tindih di sudut

Avatar pengirim dalam gaya gelembung ucapan kini tumpang tindih secara visual di sudut kanan atas gelembung pesan sendiri dan sudut kiri atas gelembung pesan masuk.

## Tanda baca di luar gelembung ucapan

Dalam gaya gelembung ucapan, baris tanda waktu dan tanda baca kini ditampilkan di bawah gelembung, bukan di dalamnya.

## Deck emoji cepat selalu menampilkan lima opsi

Ketika emoji yang disarankan digunakan sebagai reaksi, emoji tersebut diganti dari kumpulan emoji agar bilah saran selalu menampilkan lima pilihan.

## Opsi `contentScrolling` pada page composer

Opsi `contentScrolling` baru (default `true`) pada `createPageComposer` memungkinkan halaman mengaktifkan mode tinggi penuh dengan meneruskan `contentScrolling: false`. Kisi konten kemudian membatasi panel konten ke viewport yang tersedia dan menonaktifkan pengguliran internalnya sendiri, sehingga halaman dapat mengelola pengguliran internal secara mandiri.

## Komposer tetap terlihat pada utas panjang

Halaman Pesan kini memakai mode konten tinggi-penuh sehingga daftar utas dibatasi dan komposer tetap terlihat meski riwayat sangat panjang.

## "Reaksi Lainnya" kini menampilkan nama dan waktu sebaris

Popup Reaksi Lainnya sekarang menampilkan tiap baris sebagai: emoji + nama pengguna + waktu reaksi dalam satu baris.

## Header "Dilihat oleh X orang" kini menampilkan avatar

Header popup kini menampilkan strip avatar pembaca selain teks jumlah.

## Jarak IRC ditingkatkan untuk kontrol reaksi

Jarak antar pesan pada gaya IRC ditingkatkan agar pemilih reaksi melayang dan area tooltip tampil bersih di antara pesan.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ae50b1649e1dc2ea87972a89dbbe6e735c3a3ad7
