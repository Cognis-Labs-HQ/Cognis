# Pool Koneksi PostgreSQL

## PostgreSQL kini memakai pool koneksi terbatas

Operasi database biasa dapat berjalan bersamaan melalui `pg.Pool`, sedangkan setiap transaksi tetap menggunakan satu klien hingga commit atau rollback. Pengaturan lingkungan membatasi ukuran pool serta batas waktu koneksi, menganggur, dan pernyataan opsional.

## Penghentian server mengosongkan koneksi database

Adapter PostgreSQL mendaftarkan penutupan pool melalui kapabilitas siklus hidup ctx agar server berhenti menerima permintaan dan mengosongkan pool dengan bersih.

## Penyiapan Docker kini memakai profil lingkungan yang jelas

File env bersama, PostgreSQL, pengembangan, dan produksi kini menyimpan nilai default container. Compose memilih profil yang sesuai tanpa menginterpolasi variabel pool yang belum diatur sehingga peringatan variabel kosong hilang.

## MariaDB kini menggunakan connection pooling yang setara

Adapter MariaDB kini menggunakan pool `mysql2` terbatas untuk kueri serentak, mengikat transaksi ke satu koneksi, mengosongkan pool saat penghentian, dan mendukung pengaturan terbatas untuk ukuran maksimum serta batas waktu menganggur dan koneksi.

## Profil Docker kini memilih driver database

PostgreSQL dan MariaDB kini memiliki file Compose dan lingkungan produksi serta pengembangan yang terpisah. Administrasi hanya menandai adapter database yang dikonfigurasi sebagai aktif, mengunci semua tombol driver, dan menjelaskan pengelolaan Docker pada judul gateway database.

## Container produksi memerlukan rahasia sebelum dimulai

Entrypoint container PostgreSQL dan MariaDB kini segera menolak pengaturan database dan kunci enkripsi data yang belum diberikan serta menyebutkan file env untuk setiap nilai yang hilang.

## Profil lingkungan menggantikan contoh lama

Contoh lingkungan lama di root repositori telah dihapus. File yang dipilih di bawah `docker/env/` dan panduan DevOps yang diterjemahkan kini menjadi referensi penyiapan lengkap.

## Container membangun URL koneksi database

Setiap profil database memberikan host, port, database, nama pengguna, dan kata sandi khusus mesinnya kepada entrypoint container, yang memvalidasi nilai tersebut dan membangun `DATABASE_URL` tanpa interpolasi Compose. `.env` di root tertaut ke profil default bersama, sedangkan tautan Compose default memilih deployment PostgreSQL yang paling didukung.

## Nilai default driver dipisahkan berdasarkan mesin

Nilai default host, port, database, nama pengguna, dan pool PostgreSQL serta MariaDB kini hanya berada dalam profil env drivernya masing-masing. Profil default bersama hanya berisi pengaturan aplikasi yang netral terhadap mesin.

## File rahasia yang dikelola pengguna tidak dilacak

File env rahasia produksi kini diabaikan oleh Git dan memiliki template `.example` yang terlacak. Kesalahan validasi Compose menyebutkan file profil persis tempat setiap nilai yang hilang harus diisi.

## Impor env Compose tetap relatif terhadap repositori

Path runtime internal container tetap absolut ketika lokasinya diketahui. Impor file env Compose dan Dockerfile kini menggunakan path relatif repositori yang eksplisit agar direktori kerja yang dicapai melalui symlink tidak bergantung pada path host absolut.

## Penyiapan interaktif menggantikan banyak profil

`setup.sh` baru memandu pilihan deployment dan database, membuat rahasia, menulis satu file env runtime yang diabaikan Git, dan memilih driver Compose yang sesuai. Profil env pengembangan, produksi, driver, dan contoh yang terpisah tidak lagi diperlukan.

## Identitas deployment publik diwajibkan

Penyiapan kini meminta host layanan Cognis, URL publik, dan email kontak. Docker memvalidasi ketiganya, aplikasi juga mewajibkan URL publik dan email kontak, sedangkan path tata letak image ditetapkan oleh entrypoint dan tidak diekspos sebagai konfigurasi env.

## Pertahankan versi aset rilis

Image Docker kini mempertahankan versi aset yang diberikan saat build agar penerapan yang ditingkatkan membatalkan sumber daya statis dalam cache.

## Susun URL basis data dengan aman

Entrypoint kontainer melakukan pengodean persen pada kredensial PostgreSQL dan MariaDB sebelum menempatkannya dalam URL koneksi.

## Jaga isolasi dan versi komponen basis data

Validasi pengaturan pool kini dimiliki masing-masing adapter basis data, sedangkan versi workspace adapter dan gateway serta batas atas dependensinya telah diselaraskan.
