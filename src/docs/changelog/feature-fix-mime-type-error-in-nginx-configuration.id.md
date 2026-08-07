# Pemuatan aset UI andal

## Galat aset tidak lagi disimpan

Proksi web dan API kini mencegah respons JavaScript dan CSS beridentitas versi yang tidak ditemukan agar tidak disimpan sebagai aset tetap. Klien dapat pulih dengan baik setelah tumpang tindih penerapan alih-alih mempertahankan respons JSON 404 untuk URL aset.

## Perenderan halaman masuk dipulihkan

Penyusun halaman kini menyediakan perender elemennya ke setiap jalur tata letak sehingga halaman masuk tidak lagi gagal dengan galat `renderElementContent is not defined` sebelum gaya dan kontennya selesai dimuat.

## Proksi web mengurai nama layanan lingkungan

Nginx kini mengurai layanan aplikasi Cognis melalui penguraian nama host standar lingkungan kontainer. Cara ini mendukung domain pencarian dan pemetaan host yang sama dengan alat lain di Docker, Kubernetes, Podman, dan platform kontainer lainnya, sehingga mencegah galat `no live upstreams` ketika nama host berfungsi di tempat lain dalam kontainer web.

Proksi web mengambil nama host layanan aplikasi dari `HOST` alih-alih menganggap layanan selalu bernama `cognis`. Nama berkualifikasi namespace yang mengandung titik, seperti `cognis.cognis`, didukung untuk mencegah kumpulan upstream kosong pada Kubernetes dan penerapan lain yang menggunakan nama layanan tercakup.

## Galat lingkungan Kubernetes lebih jelas

Proses awal kontainer kini membaca pengaturan wajib langsung dari lingkungan proses yang diekspor dan menyebutkan kontainer aplikasi Cognis dalam galat pengaturan yang hilang. Penerapan Kubernetes harus menetapkan `CONTACT_EMAIL` pada kontainer aplikasi; menetapkannya hanya pada sidecar `cognis-web` tidak membagikannya antar kontainer.

Log awal kini melaporkan apakah setiap pengaturan publik wajib terlihat tanpa mengungkap nilainya. Panduan Kubernetes memperjelas bahwa membuat ConfigMap saja tidak cukup: kontainer aplikasi harus merujuknya melalui `envFrom` atau `env.valueFrom`.
