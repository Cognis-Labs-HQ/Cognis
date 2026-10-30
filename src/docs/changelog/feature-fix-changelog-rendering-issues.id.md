# Ringkasan changelog rilis yang lengkap

**Cabang Fitur:** feature-fix-changelog-rendering-issues

## Tampilkan detail changelog pada popup rilis

Notifikasi rilis kini menampilkan isi penjelasan di bawah setiap heading perubahan, bukan hanya menampilkan heading.

## Sertakan modul eksternal yang terpasang

Umpan rilis kini menemukan file changelog terlokalisasi dari modul eksternal yang terpasang dan menautkan setiap entri ke halaman changelog modulnya.

## Changelog tertaut dan terkelompok

Heading pada popup rilis kini tertaut langsung ke changelog Cognis Core yang lengkap. Changelog modul eksternal menampilkan modulnya secara terpisah dan disertakan dalam indeks Changelog lengkap.

## Referensi repositori diperbarui

Tautan commit historis kini mengarah ke repositori Cognis-Labs-HQ/Cognis saat ini.

## Komit

- [968c109](https://github.com/Cognis-Labs-HQ/Cognis/commit/968c109885b2db1e168a7c62cc29b3c6be3d7b27)
- [0a22467](https://github.com/Cognis-Labs-HQ/Cognis/commit/0a224676b04a06123eb6f4dd256051d6a2fc5933)
- [4c60e84](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c60e8410ee4b50e01fea0248b521199757f48fc)

## Asal changelog yang lengkap

Pemeriksaan otomatis kini mewajibkan setiap changelog terlokalisasi mencantumkan feature branch dan tautan commit kanonis. Entri yang tidak dapat dicocokkan dengan salah satu repositori historis secara eksplisit menggunakan N/A dengan daftar commit kosong.

## Referensi commit pendek

Halaman Changelog kini menampilkan setiap tautan commit sebagai referensi tujuh karakter sambil mempertahankan URL commit kanonis lengkap sebagai tujuan tautan.

## Referensi pendek di popup rilis

Popup changelog rilis kini menerapkan pemformat referensi pendek yang sama seperti halaman Changelog lengkap dan mempertahankan URL commit lengkap sebagai tujuan tautan.

## Alur asal commit

Instruksi kontribusi AI kini mewajibkan, jika diminta sebelum implementasi, commit pembukuan akhir yang hanya mengubah changelog dan mencatat commit implementasi tepat sebelumnya.

## Perbarui dokumentasi yang dihasilkan

Proses penyerapan dokumentasi kini memperbarui arsip untuk versi komponen yang sedang terpasang. Dengan demikian, koreksi faktual pada sumber seperti pembaruan URL repositori menggantikan salinan lama yang dihasilkan, sementara cuplikan versi terdahulu tetap tersedia.

## Perbarui arsip dokumentasi dengan aman

Proses penyerapan dokumentasi kini membiarkan file arsip yang tidak berubah tetap utuh dan mengganti hanya isi yang berubah secara atomik, sehingga mencegah penulisan berulang dan pembacaan file yang belum lengkap saat permintaan berjalan bersamaan.

## Escape nama modul eksternal

Navigasi changelog kini melakukan escape pada nama yang disediakan modul sebelum memasukkannya ke label dan atribut, sehingga metadata modul tidak dapat membuat markup aktif.

## Tautan commit yang konsisten

Daftar commit changelog historis kini secara konsisten menggunakan referensi tujuh karakter tertaut sambil mempertahankan URL commit kanonis yang lengkap.

## Label asal yang dilokalkan

Heading cabang fitur dan komit kini menggunakan bahasa setiap changelog yang dilokalkan, bukan mempertahankan label bahasa Inggris dalam file terjemahan.
