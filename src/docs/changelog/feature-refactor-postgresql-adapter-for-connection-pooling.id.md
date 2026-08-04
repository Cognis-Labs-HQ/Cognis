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

Profil Compose produksi PostgreSQL dan MariaDB kini menolak kata sandi database, URL koneksi, dan kunci enkripsi data yang belum diberikan sebelum container dibuat.

## Profil lingkungan menggantikan contoh lama

Contoh lingkungan lama di root repositori telah dihapus. File yang dipilih di bawah `docker/env/` dan panduan DevOps yang diterjemahkan kini menjadi referensi penyiapan lengkap.
