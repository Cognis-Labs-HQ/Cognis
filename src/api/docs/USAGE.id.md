# Penggunaan

Prosedur praktis untuk Server Aplikasi.

## Prasyarat

Operator menerapkan server; pembaca tidak perlu akses administrator untuk dokumentasi publik.

## Contoh

Pilih Info, Penggunaan, atau Teknis serta versi; pastikan pilihan versi bertahan saat berganti tampilan.

Panggil `store.diff(fromVersion, toVersion)` melalui penyimpanan yang dibuat oleh kapabilitas `docs:versionStore`. Modul runtime dapat mengembalikan hasil terstruktur melalui rute terautentikasinya sendiri, memperoleh `ui:documentDiff` melalui ctx browser, dan meneruskan hasil tersebut ke `renderDocumentDiff(diff)`.

Gunakan titik akhir keamanan sistem atau penegakan TFA yang terautentikasi untuk mengubah kewajiban penyiapan. Penerapan kebijakan yang gagal mengembalikan kesalahan, bukan penyimpanan yang berhasil.

`await ctx.getCapability("share:getGuestClaims")(request)`

GET /api/v1/docs menyertakan metadata groupPresentation opsional bersama group, slug, title, path, dan versions yang sudah ada. Grup tetap memakai UUID modul yang tidak berubah; label tidak menggantikan identitas atau rute.

Kirim `DELETE /api/v1/users/:username` dengan kredensial permintaan berwenang yang biasa digunakan. Respons normal tetap HTTP 200 dengan `{"data":{"deleted":true}}`.

Jika penghapusan telah dikonfirmasi tetapi hook alur berikutnya gagal, responsnya HTTP 500 dengan `{"error":{"code":"user_deletion_cleanup_incomplete"},"data":{"deleted":true,"outcome":"committed","cleanup":"incomplete"}}`. Jangan mengulangi penghapusan untuk memperbaiki pembersihan. Periksa kegagalan yang tercatat di server dan prosedur pemulihan komponen terkait.

## Hasil yang Diharapkan

Setiap versi terbit berisi paket lokal lengkap; tampilan hilang tidak dibuat dari versi lain.

## Pemecahan Masalah

Periksa topik, versi, dan akses server. Arsip memerlukan lokasi yang dapat ditulis.
