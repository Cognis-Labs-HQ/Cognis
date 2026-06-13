# Gateway Pembaca File

## Ikhtisar

Gateway Pembaca File menyediakan mekanisme terpadu berbasis adaptor untuk merender file di Cognis — materi kelas, lampiran yang diunggah, dan semua sumber daya yang dibuka pengguna di dalam aplikasi. Gateway ini memisahkan platform dari format file tertentu dengan menemukan adaptor rendering saat startup dan merutekan permintaan buka-file ke adaptor yang sesuai berdasarkan tipe MIME.

Menambahkan dukungan untuk format file baru hanya memerlukan adaptor baru di `src/adapters/file-reader/<id>/`. Tidak ada perubahan pada kode gateway atau core yang diperlukan.

## Tanggung Jawab

- Menemukan semua adaptor pembaca file saat startup dengan memindai `src/adapters/file-reader/`.
- Mempertahankan registry yang memetakan tipe MIME dan ekstensi ke adaptor yang menanganinya.
- Mengekspos kemampuan agar gateway dan adaptor lain dapat mencari renderer yang tepat untuk tipe MIME tertentu.
- Mendaftarkan aset statis dan rute API yang disumbangkan adaptor selama bootstrap.

Tidak bertanggung jawab atas: penyimpanan atau pengambilan byte file aktual (itu adalah tanggung jawab gateway penyimpanan file), penerapan batas ukuran unggahan, atau pengelolaan kontrol akses file.

## Arsitektur

Titik masuk gateway adalah `src/gateways/file-reader/bootstrap.ts`. Saat startup, file ini memindai `src/adapters/file-reader/`, mengimpor `index.ts` setiap adaptor, memanggil `bootstrapFileReaderAdapter(ctx)`, dan mengumpulkan tipe MIME yang didukung ke dalam registry.

Antarmuka `FileReaderAdapter` di `src/gateways/file-reader/gateway.ts` mendefinisikan kontrak yang harus diimplementasikan setiap adaptor.

## Titik Ekstensi

Untuk menambahkan renderer file baru:

1. Buat `src/adapters/file-reader/<id>/index.ts` dengan mengekspor `createFileReaderAdapter()` dan `bootstrapFileReaderAdapter(ctx)`.
2. Kembalikan tipe MIME yang didukung dari `getSupportedTypes()`.
3. Kontribusikan kemampuan `file-reader:<id>:ui` dengan `scriptUrl` dan `stylesheetUrl`.

Gateway akan menemukan adaptor baru secara otomatis saat startup berikutnya.
