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

## Siapkan modul bawaan untuk dipisahkan

Analytics dan Nextcloud Whiteboard kini menjadi repositori modul eksternal mandiri dengan metadata repositori khusus, lisensi, README, inventaris integritas lengkap, panduan distribusi terjemahan, dependensi UUID, dan kebutuhan kapabilitas eksplisit.

## Tingkatkan penjelajahan tangkapan layar modul

Tangkapan layar detail modul kini berada dalam karusel terbatas dengan kontrol sebelumnya dan berikutnya, pratinjau gambar di sebelah yang memudar, transisi animasi, dan rotasi otomatis. Manifes dengan kolom opsional `template: true` tidak ditampilkan dalam hasil marketplace maupun tampilan detail langsung.

## Terapkan modul marketplace yang unik

Analytics dan Nextcloud Whiteboard telah dipindahkan ke repositori khusus dan tidak lagi dibundel. Penemuan marketplace kini menerima repositori pertama untuk setiap UUID modul, mencatat serta menolak duplikat berikutnya, dan memperbarui metadata tampilan dari repositori yang diterima sambil mempertahankan status siklus hidup instalasi.

## Abaikan direktori infrastruktur gateway

Penemuan gateway otomatis kini hanya menjalankan direktori yang memiliki manifes gateway, sehingga direktori infrastruktur `gateways/reuse` tidak lagi diimpor sebagai gateway dalam build produksi.

## Perjelas umpan balik siklus hidup modul

Penonaktifan modul kini dicatat sebagai peringatan dan penghapusan modul eksternal dicatat secara eksplisit. Penyegaran marketplace menampilkan satu pemberitahuan selesai untuk setiap klik, sedangkan modul tetap terlihat kecuali manifesnya secara eksplisit menetapkan `template` ke `true`.

## Rekomendasikan modul Cognis HQ

Daftar rekomendasi bawaan kini memuat UUID modul Jitsi Meet, Nextcloud Whiteboard, dan Analytics yang diterbitkan oleh organisasi Cognis Labs HQ.

## Perluas pencatatan siklus hidup modul

Penambahan, pembaruan, penghapusan, pemindaian sumber modul, serta jumlah hasil pemindaian kini dicatat dengan tingkat yang sesuai, sedangkan kegagalan validasi dan pengaktifan dicatat sebagai kesalahan. Penemuan gambar marketplace juga menggunakan PNG yang cocok atau gambar lain yang didukung ketika manifes menyebut ekstensi yang tidak ada, sehingga gambar Jitsi Meet kembali tampil selama manifesnya masih menunjuk ke berkas SVG yang tidak tersedia.

## Cegah kilatan gambar modul

Kartu modul dan media detail kini tetap tersembunyi sampai setiap gambar yang disegarkan melaporkan dimensi yang valid. Dimensi ikon yang tetap juga menyediakan ruang kartu sebelum pemuatan, sehingga gambar modul mentah atau terlalu besar tidak lagi berkedip saat marketplace disegarkan.

## Pertahankan modul saat pemindaian tidak meyakinkan

Pemindaian marketplace tidak lagi menganggap respons repositori kosong, manifes yang sementara hilang, respons sementara yang tidak valid, atau kegagalan permintaan sumber sebagai bukti bahwa modul yang sebelumnya ditemukan telah dihapus. Entri cache tetap terlihat sampai sumbernya dihapus secara eksplisit, dan log peringatan menunjukkan pemindaian yang gagal serta jumlah modul yang dipertahankan.

## Penemuan modul lebih aman dan efisien

Penyegaran marketplace dipusatkan dalam satu pemindaian terautentikasi, token pengguna GitHub ditambahkan untuk sumber tepercaya, pemeriksaan dependensi dan persetujuan dipulihkan sebelum kode eksternal dijalankan, serta permintaan manifes GitHub Enterprise memakai API yang dikonfigurasi.

## Selesaikan pemuatan modul langsung

Pemuatan langsung halaman Modul kini selalu mengakhiri tugas pemuatan yang dilacak setelah penyusun halaman selesai atau gagal, sehingga roda pemuatan tidak terus terlihat setelah penyegaran browser.
