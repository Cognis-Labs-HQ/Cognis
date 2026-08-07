# Pemuatan aset UI andal

## Galat aset tidak lagi disimpan

Proksi web dan API kini mencegah respons JavaScript dan CSS beridentitas versi yang tidak ditemukan agar tidak disimpan sebagai aset tetap. Klien dapat pulih dengan baik setelah tumpang tindih penerapan alih-alih mempertahankan respons JSON 404 untuk URL aset.

## Perenderan halaman masuk dipulihkan

Penyusun halaman kini menyediakan perender elemennya ke setiap jalur tata letak sehingga halaman masuk tidak lagi gagal dengan galat `renderElementContent is not defined` sebelum gaya dan kontennya selesai dimuat.

## Proses awal kontainer stabil dipulihkan

Alur Docker yang telah terbukti dipulihkan: `setup.sh` membuat file lingkungan aplikasi dan web yang terpisah, entrypoint Cognis memvalidasi konfigurasi, menyusun `DATABASE_URL`, mencatat peristiwa siklus hidup, dan meneruskan sinyal penghentian. Image `cognis-web` tetap tersedia sebagai batas cache dan TLS terpisah tanpa mengubah kontrak awal aplikasi yang telah mapan.
