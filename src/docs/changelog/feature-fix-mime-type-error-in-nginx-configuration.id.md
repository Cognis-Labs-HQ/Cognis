# Pemuatan aset UI andal

## Galat aset tidak lagi disimpan

Proksi web dan API kini mencegah respons JavaScript dan CSS beridentitas versi yang tidak ditemukan agar tidak disimpan sebagai aset tetap. Klien dapat pulih dengan baik setelah tumpang tindih penerapan alih-alih mempertahankan respons JSON 404 untuk URL aset.

## Perenderan halaman masuk dipulihkan

Penyusun halaman kini menyediakan perender elemennya ke setiap jalur tata letak sehingga halaman masuk tidak lagi gagal dengan galat `renderElementContent is not defined` sebelum gaya dan kontennya selesai dimuat.

## Proksi web mengurai nama layanan lingkungan

Nginx kini mengurai layanan aplikasi Cognis melalui penguraian nama host standar lingkungan kontainer. Cara ini mendukung domain pencarian dan pemetaan host yang sama dengan alat lain di Docker, Kubernetes, Podman, dan platform kontainer lainnya, sehingga mencegah galat `no live upstreams` ketika nama host berfungsi di tempat lain dalam kontainer web.

Proksi web mengambil nama host layanan aplikasi dari `HOST` alih-alih menganggap layanan selalu bernama `cognis`. Nama berkualifikasi namespace yang mengandung titik, seperti `cognis.cognis`, didukung untuk mencegah kumpulan upstream kosong pada Kubernetes dan penerapan lain yang menggunakan nama layanan tercakup.

## Proses awal kontainer tetap netral

Proses awal kontainer disederhanakan menjadi sekadar menjalankan perintah aplikasi. Default yang dapat dijalankan kini berada dalam image, file lingkungan buatan dan `setup.sh` dihapus, dan penerapan dapat mengganti variabel melalui mekanisme lingkungan bawaannya. Proksi web mengaktifkan TLS secara otomatis hanya ketika kedua file sertifikat yang dikonfigurasi dapat dibaca; tidak ada variabel mode TLS.
