# Pemuatan aset UI andal

## Galat aset tidak lagi disimpan

Proksi web dan API kini mencegah respons JavaScript dan CSS beridentitas versi yang tidak ditemukan agar tidak disimpan sebagai aset tetap. Klien dapat pulih dengan baik setelah tumpang tindih penerapan alih-alih mempertahankan respons JSON 404 untuk URL aset.

## Perenderan halaman masuk dipulihkan

Penyusun halaman kini menyediakan perender elemennya ke setiap jalur tata letak sehingga halaman masuk tidak lagi gagal dengan galat `renderElementContent is not defined` sebelum gaya dan kontennya selesai dimuat.

## Proksi web mengikuti penggantian kontainer aplikasi

Nginx kini menemukan resolver DNS milik lingkungan kontainer yang aktif dan menggunakannya untuk memperbarui alamat aplikasi Cognis. Permintaan publik tidak lagi tetap terhubung ke kontainer aplikasi yang telah diganti, baik Cognis dijalankan dengan Docker, Kubernetes, Podman, maupun platform kontainer lainnya.

Proksi web mengambil nama host layanan aplikasi dari `HOST` alih-alih menganggap layanan selalu bernama `cognis`. Nama berkualifikasi namespace yang mengandung titik, seperti `cognis.cognis`, didukung untuk mencegah kumpulan upstream kosong pada Kubernetes dan penerapan lain yang menggunakan nama layanan tercakup.
