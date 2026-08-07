# Pemuatan aset UI andal

## Galat aset tidak lagi disimpan

Proksi web dan API kini mencegah respons JavaScript dan CSS beridentitas versi yang tidak ditemukan agar tidak disimpan sebagai aset tetap. Klien dapat pulih dengan baik setelah tumpang tindih penerapan alih-alih mempertahankan respons JSON 404 untuk URL aset.

## Perenderan halaman masuk dipulihkan

Penyusun halaman kini menyediakan perender elemennya ke setiap jalur tata letak sehingga halaman masuk tidak lagi gagal dengan galat `renderElementContent is not defined` sebelum gaya dan kontennya selesai dimuat.

## Proksi web mengurai nama layanan lingkungan

Nginx kini mengurai layanan aplikasi Cognis melalui penguraian nama host standar lingkungan kontainer. Cara ini mendukung domain pencarian dan pemetaan host yang sama dengan alat lain di Docker, Kubernetes, Podman, dan platform kontainer lainnya, sehingga mencegah galat `no live upstreams` ketika nama host berfungsi di tempat lain dalam kontainer web.

Proksi web mengambil nama host layanan aplikasi dari `HOST` alih-alih menganggap layanan selalu bernama `cognis`. Nama berkualifikasi namespace yang mengandung titik, seperti `cognis.cognis`, didukung untuk mencegah kumpulan upstream kosong pada Kubernetes dan penerapan lain yang menggunakan nama layanan tercakup.

## Proses awal kontainer tetap netral

Entrypoint aplikasi tidak lagi melakukan pravalidasi atau menyaring pengaturan publik seperti `CONTACT_EMAIL`. Variabel lingkungan diteruskan langsung ke Cognis tanpa bergantung pada Docker Compose, Kubernetes, Podman, atau sistem penerapan lain yang menyediakannya. Entrypoint hanya membentuk `DATABASE_URL` ketika field basis data terpisah digunakan, lalu menggantikan dirinya dengan proses aplikasi agar Cognis menangani validasi dan penghentian yang baik.
