# Penampil Materi & Chat Kelas

## Materi kelas ditampilkan di dalam ubin agenda

Materi kelas yang dipilih kini terbuka dan ditampilkan langsung di dalam ubin agenda. File teks dan Markdown dirender dengan format penuh. Gambar ditampilkan dengan kontrol pan dan zoom yang dioperasikan guru; siswa melihat tampilan guru secara real time.

## Gateway dan adaptor File Reader

Gateway File Reader baru menyediakan arsitektur rendering file yang dapat diperluas. Adaptor teks (sebelumnya adaptor Notepad studi) menangani Markdown dan teks biasa. Adaptor gambar baru menangani format gambar dengan penampil pan/zoom berbasis pointer event yang menyiarkan viewport guru kepada siswa melalui API tata letak ruang kelas.

## Registri tipe file di seluruh aplikasi via CTX

`src/ui/reuse/file-reader.js` menyediakan `registerFileType`, `canRender`, `renderFileContent`, dan `showUnsupportedToast`. Adaptor mendaftarkan tipe file yang didukung saat bootstrap. Mencoba membuka tipe yang tidak didukung akan menampilkan notifikasi toast.

## Siswa dapat selalu membuka ubin chat

Kunci interaksi siswa tidak lagi memblokir ubin chat. Siswa dapat beralih ke chat kelas kapan saja, terlepas dari apakah guru hadir atau telah mengunci tampilan kerja.

## Chat kelas menghormati preferensi gaya pesan

Panel chat ruang kelas kini menerapkan gaya pesan yang dikonfigurasi pengguna (misalnya gelembung percakapan atau gaya IRC) secara konsisten dengan halaman Pesan.
