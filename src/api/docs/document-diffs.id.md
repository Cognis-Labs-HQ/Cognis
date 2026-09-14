# Perbedaan Dokumen

Perbedaan dokumen memungkinkan modul menjelaskan perubahan antara dua versi dokumen yang tidak dapat diubah sebelum pengguna mengambil tindakan terhadap salinan terbaru.

## Contoh Penggunaan

Panggil `store.diff(fromVersion, toVersion)` melalui penyimpanan yang dibuat oleh kapabilitas `docs:versionStore`. Modul runtime dapat mengembalikan hasil terstruktur melalui rute terautentikasinya sendiri, memperoleh `ui:documentDiff` melalui ctx browser, dan meneruskan hasil tersebut ke `renderDocumentDiff(diff)`.

## Spesifikasi Teknis

Kedua hash harus tersedia dalam namespace penyimpanan dan berasal dari slug dokumen yang sama. Hasilnya memuat hash sumber dan tujuan, slug bersama, serta baris terurut yang diklasifikasikan sebagai `unchanged`, `added`, `removed`, atau `changed`. Entri yang berubah memuat teks lama dan teks pengganti.

Renderer browser meng-escape teks dinamis serta menampilkan baris tambahan dengan warna hijau, perubahan dengan warna oranye, dan penghapusan dengan warna merah.

## Tampilan perbandingan Markdown

Gunakan `renderMarkdownDocumentDiff(diff)` dari kapabilitas browser `ui:documentDiff` untuk merender dokumen tujuan lengkap melalui perender Markdown host. Konten yang tidak berubah mempertahankan tampilan dokumen normal, sedangkan penambahan, penggantian, dan penghapusan memperoleh overlay hijau, oranye, dan merah dengan navigasi bilah ikhtisar.
