# Pemuatan aset UI andal

**Cabang Fitur:** feature-fix-mime-type-error-in-nginx-configuration

## Galat aset tidak lagi disimpan

Proksi web dan API kini mencegah respons JavaScript dan CSS beridentitas versi yang tidak ditemukan agar tidak disimpan sebagai aset tetap. Klien dapat pulih dengan baik setelah tumpang tindih penerapan alih-alih mempertahankan respons JSON 404 untuk URL aset.

## Perenderan halaman masuk dipulihkan

Penyusun halaman kini menyediakan perender elemennya ke setiap jalur tata letak sehingga halaman masuk tidak lagi gagal dengan galat `renderElementContent is not defined` sebelum gaya dan kontennya selesai dimuat.

## Proksi web mengurai nama layanan lingkungan

Nginx kini mengurai layanan aplikasi Cognis melalui penguraian nama host standar lingkungan kontainer. Cara ini mendukung domain pencarian dan pemetaan host yang sama dengan alat lain di Docker, Kubernetes, Podman, dan platform kontainer lainnya, sehingga mencegah galat `no live upstreams` ketika nama host berfungsi di tempat lain dalam kontainer web.

Proksi web mengambil nama host layanan aplikasi dari `HOST` alih-alih menganggap layanan selalu bernama `cognis`. Nama berkualifikasi namespace yang mengandung titik, seperti `cognis.cognis`, didukung untuk mencegah kumpulan upstream kosong pada Kubernetes dan penerapan lain yang menggunakan nama layanan tercakup.

## Jalur permintaan aset diteruskan tanpa perubahan

Templat nginx kini memberikan lokasi prefiks khusus untuk `/assets/` dan meneruskannya tanpa menulis ulang URI. Permintaan JavaScript dan CSS beridentitas mencapai penangan aset Cognis tepat pada jalur yang diminta tanpa bergantung pada pencocokan pola nama berkas.

## Proses awal kontainer tetap netral

Entrypoint aplikasi memulihkan pencatatan terstruktur dan penyusunan opsional `DATABASE_URL` dari field khusus penyedia sebelum menjalankan Cognis. Nilai sensitif seperti `DATABASE_URL` dan `DATA_ENCRYPTION_KEY` tidak lagi memiliki default image dan harus berasal dari lingkungan penerapan. Profil web kini menggunakan image nginx generik dan templat konfigurasi native dengan substitusi lingkungan alih-alih membangun image nginx khusus Cognis.

## Image produksi hanya memuat alat build saat pembangunan

Image aplikasi secara eksplisit memasang dependensi pengembangan untuk tahap build sehingga alat seperti esbuild tersedia meskipun `NODE_ENV` bernilai `production`. Paket khusus pengembangan dihapus setelah UI dan server hasil kompilasi diverifikasi sehingga paket tersebut tidak masuk ke image runtime.

## Pengaturan basis data Compose selaras dengan entrypoint

Profil Compose PostgreSQL dan MariaDB kini meneruskan field host, port, basis data, akun, dan kata sandi khusus penyedia yang digunakan entrypoint aplikasi. Cognis menyusun `DATABASE_URL` secara konsisten tanpa memerlukan URL rakitan yang berlebihan.

## cognisctl berjalan tanpa dependensi pengembangan

Skrip kontainer kini menjalankan CLI Cognis hasil kompilasi secara langsung alih-alih memuat sumber TypeScript melalui tsx. Dengan demikian, CLI tetap tersedia setelah paket khusus pengembangan dihapus dari image produksi.

## Runtime dan dependensi telah diperbarui

Image aplikasi dan CI kini menggunakan lini Node.js 24 LTS terbaru. Alat build, TypeScript, klien basis data, dan klien LDAP telah diperbarui ke rilis stabil terbaru, sedangkan perintah build Docker membisukan peringatan konfigurasi npm `http-proxy` yang usang. Semua versi komponen dan batas atas dependensi internal yang teruji telah dinaikkan serta diselaraskan pada manifest, lockfile, dan indeks versi terjemahan.

## Tanggung jawab login dibagi ke modul terfokus

Penemuan integrasi login dan penyimpanan sesi terautentikasi kini berada dalam modul khusus milik halaman login. Entrypoint login tetap berada di bawah batas ukuran berkas sumber dengan perilaku sesi yang sama, disertai cakupan regresi langsung untuk menyimpan dan menghapus status autentikasi.

## Pemeriksaan pengiriman pertama SMTP bersifat deterministik

Pembatas laju SMTP kini memeriksa apakah penerima memiliki catatan pengiriman sebelum membaca waktu. Penerima baru tidak akan dibatasi hanya karena waktu sistem bergerak mundur di antara pembacaan, sehingga kegagalan CI Node.js 24 yang sporadis hilang tanpa mengubah jendela pembatasan untuk pengiriman yang tercatat.

## Pemeriksaan kontainer tetap berfokus pada hasil

Pengujian tooling berlebihan yang hanya mengulang teks konfigurasi kontainer telah dihapus. Build kontainer dan rangkaian pengujian aplikasi tetap menjadi pemeriksaan penerimaan sehingga pemeliharaan berfokus pada berfungsinya aplikasi hasil build, bukan rincian format konfigurasi yang tidak penting.

## Pertahankan penerusan HTTPS

Proksi web kini mempertahankan skema HTTPS yang masuk agar kuki autentikasi tetap aman di belakang terminator TLS.

## Wajibkan rahasia penerapan

Compose kini mewajibkan kata sandi basis data dan kunci enkripsi data yang dikelola penerapan, sedangkan Kubernetes dan orkestrator lain tetap dapat memakai fasilitas rahasia native.

## Compose kini mewajibkan URL penerapan

Image aplikasi tidak lagi menetapkan localhost sebagai host publik. Kedua profil basis data Compose mewajibkan `EXTERNAL_HOST`, sehingga tautan autentikasi, undangan, dan pemberitahuan tidak mengarah ke komputer lokal setiap penerima.

## Komit

- [ec75586](https://github.com/Cognis-Labs-HQ/Cognis/commit/ec75586e143b25792032eaa906ba8b177868a6ef)
