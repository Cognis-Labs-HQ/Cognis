# Pulihkan halaman modul terpasang

## Muat rute UI modul eksternal dari direktori pemasangannya

Modul terpasang kini ditemukan berdasarkan UUID stabilnya di direktori modul eksternal. Halaman dan kontribusi navigasi yang dideklarasikan dimuat secara otomatis saat aplikasi dimulai, bukan dicari di jalur modul bawaan.

## Selesaikan bootstrap sebelum permintaan

Cognis kini menunggu pemulihan status modul tersimpan dan bootstrap modul selesai sebelum menerima permintaan. Dengan demikian, skrip dan gaya modul eksternal telah terdaftar sebelum diminta oleh halamannya.

## Sediakan kapabilitas autentikasi

Gateway autentikasi kini menerbitkan fungsi autentikasi permintaan dan akses peran melalui bus kapabilitas. Modul eksternal dapat memulai rute API terlindungi tanpa mengimpor internal gateway, sehingga aset UI dan pendaftaran navigasinya tetap aktif.

## Muat hanya kapabilitas UI yang dinyatakan

Modul dapat menyatakan `requiresCapabilities` dalam manifesnya. Sebelum memasang rute modul, Cognis hanya mengimpor skrip penyedia terdaftar untuk kapabilitas `ui:*` yang dinyatakan, sehingga layanan UI yang diperlukan siap tanpa memberikan integrasi yang tidak terkait.

## Periksa dan dokumentasikan kapabilitas

Owner dapat mencantumkan semua ID kapabilitas terdaftar melalui `GET /api/v1/system/capabilities` atau `cognisctl system:capabilities`. Dokumentasi modul, gateway Autentikasi, dan adapter Profil kini mencatat deklarasi kebutuhan serta kapabilitas yang disediakan setiap penyedia.

## Tampilkan arah versi rilis

Kartu dan tampilan detail modul terpasang kini menempatkan versi saluran terpilih yang berbeda di bawah versi saat ini. Peningkatan memakai panah ke atas, sedangkan penurunan versi yang jarang terjadi memakai panah ke bawah dalam pil oranye muda.

## Pertahankan detail modul stabil

Membuka atau memperbarui tampilan detail modul kini mempertahankan posisi halaman. Setiap versi yang ditampilkan memakai awalan `v`, dan pembaruan modul aktif menjalankan urutan nonaktifkan, pasang, lalu aktifkan kembali dalam satu tindakan.

## Stabilkan kontrol detail modul

Halaman detail modul kini memakai deep link UUID berbasis router sambil tetap berada di Page Composer. Penyegaran siklus hidup mempertahankan susunan tombol yang terlihat, termasuk saat modul aktif dinonaktifkan sementara untuk peningkatan.

## Bootstrap halaman modul langsung sekali

Pemuatan langsung rute SPA modul eksternal kini melalui entrypoint inti yang mengimpor penyedia kapabilitas yang dinyatakan sebelum rute modul. URL penyedia dan rute memakai versi aset yang sama dengan navigasi router, mencegah kapabilitas yang sesekali hilang dan kontribusi navbar ganda.
