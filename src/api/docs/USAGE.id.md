# Penggunaan

Prosedur praktis untuk Server Aplikasi.

## Prasyarat

Operator menerapkan server; pembaca tidak perlu akses administrator untuk dokumentasi publik.

## Contoh

Pilih Info, Penggunaan, atau Teknis serta versi; pastikan pilihan versi bertahan saat berganti tampilan.

Panggil `store.diff(fromVersion, toVersion)` melalui penyimpanan yang dibuat oleh kapabilitas `docs:versionStore`. Modul runtime dapat mengembalikan hasil terstruktur melalui rute terautentikasinya sendiri, memperoleh `ui:documentDiff` melalui ctx browser, dan meneruskan hasil tersebut ke `renderDocumentDiff(diff)`.

## Hasil yang Diharapkan

Setiap versi terbit berisi paket lokal lengkap; tampilan hilang tidak dibuat dari versi lain.

## Pemecahan Masalah

Periksa topik, versi, dan akses server. Arsip memerlukan lokasi yang dapat ditulis.
