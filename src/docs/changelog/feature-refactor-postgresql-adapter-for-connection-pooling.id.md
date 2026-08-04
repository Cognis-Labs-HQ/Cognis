# Pool Koneksi PostgreSQL

## PostgreSQL kini memakai pool koneksi terbatas

Operasi database biasa dapat berjalan bersamaan melalui `pg.Pool`, sedangkan setiap transaksi tetap menggunakan satu klien hingga commit atau rollback. Pengaturan lingkungan membatasi ukuran pool serta batas waktu koneksi, menganggur, dan pernyataan opsional.

## Penghentian server mengosongkan koneksi database

Adapter PostgreSQL mendaftarkan penutupan pool melalui kapabilitas siklus hidup ctx agar server berhenti menerima permintaan dan mengosongkan pool dengan bersih.
