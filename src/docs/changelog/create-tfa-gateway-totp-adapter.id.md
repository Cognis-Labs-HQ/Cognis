# Gateway TFA & TOTP

## Tambah Gateway TFA Baru

Menambahkan gateway `tfa` khusus dengan penemuan adaptor di `src/adapters/tfa/*`, API metode pengguna, API siklus kode pemulihan, dan endpoint reset admin.

## Tambah Adaptor TOTP

Menambahkan adaptor `totp` di `src/adapters/tfa/totp` dengan verifikasi penyiapan dan verifikasi kode login.

## Integrasi Login dan Keamanan

Memperbarui alur login dan keamanan untuk prompt dua faktor, pengalihan setup wajib, toggle penegakan TFA di Administrasi, dan aksi reset TFA per pengguna.

## Dropdown Algoritma TOTP

Popup konfigurasi admin adaptor TOTP kini menampilkan dropdown HMAC Algorithm (SHA1, SHA256, SHA512) sebagai pengganti kolom metadata yang tidak dapat diedit. Algoritma yang dipilih digunakan saat membuat kode QR dan memverifikasi kode.

## Tata Letak Tabel Metode TFA

Panel Metode Tersedia dan Metode Pilihan kini menggunakan tata letak drag-and-drop berbasis tabel seperti Preferensi Bahasa, memperbaiki lebar placeholder kosong dan rendering drop zone.

## Penerapan Perubahan Metode TFA yang Ditangguhkan

Memindahkan metode antara Tersedia dan Pilihan kini menyimpan perubahan secara lokal; popup penyiapan dan panggilan API ditangguhkan hingga pengguna menyimpan pengaturan.

## Tooltip Kode Pemulihan

Ikon tooltip di samping judul Kode Pemulihan menjelaskan bahwa kode ini digunakan untuk mengakses akun ketika metode yang dikonfigurasi tidak tersedia.

## Toast Peringatan Metode Dinonaktifkan

Memindahkan metode TFA dari Pilihan ke Tersedia kini menampilkan toast peringatan dengan nama metode. Tanda centang (✓) kini hanya muncul pada metode di tabel Pilihan.

## Perbaikan Jarak Popup Setup Wajib

Jarak antara teks petunjuk dan dropdown metode pada popup setup TFA wajib telah diperbaiki.

## Penyempurnaan Lanjutan Review

SHA256 kini menjadi algoritma default TOTP, nama adaptor TOTP untuk pengguna dipersingkat, dokumentasi komponen TFA/TOTP diperluas, pembuatan object URL QR SVG dipindahkan ke `src/ui/reuse/qr-image-source.js`, dan registrasi skrip pengaturan Security diperbarui ke `/static/gateways/auth/security-prefs/index.js`.

## Perbaikan Penegakan dan Kepemilikan

Status nonaktif adaptor TFA kini tetap bertahan setelah restart, konsumsi kode pemulihan berlangsung atomik, akun yang wajib menyiapkan TFA hanya menerima token dengan status setup tertunda yang tidak dapat memanggil API terlindungi di luar TFA, dan string browser, helper, serta style milik TFA dipindahkan ke aset statis gateway TFA dan adaptor TOTP.

## Pengaturan TFA Diintegrasikan ke Bagian Keamanan

Pengaturan Autentikasi Dua Faktor kini muncul di Pengaturan Pengguna → Keamanan, disumbangkan oleh gateway TFA melalui kemampuan `auth:registerSecuritySection` dan bukan sebagai item navigasi terpisah.

## Perbaikan Halaman Administrasi

Memperbaiki import `extendI18n` yang hilang sehingga menyebabkan halaman Administrasi gagal saat navigasi.
