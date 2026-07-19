# Penguatan review namespace file

## Rute administrasi kuota tidak lagi bertabrakan dengan rute objek file

Gateway Files sekarang mendaftarkan handler administrasi kuota sebelum catch-all objek namespace, sehingga permintaan `/api/v1/files/admin/...` selalu mencapai API kuota admin dan tidak ditafsirkan sebagai file dalam namespace `admin`.

## Pengguna baru menerima snapshot kuota namespace pada instalasi baru

Provisioning akun sekarang menanam baris kuota default untuk setiap namespace terdaftar sebelum mengambil snapshot kuota pengguna. Ini menjaga penegakan kuota namespace bahkan sebelum administrator membuka layar default kuota.

## Tautan berbagi terbatas menegakkan penerima

Resolusi token berbagi sekarang memeriksa penerima token sebelum menerbitkan akses tamu atau mengembalikan payload. Token yang dibatasi penerima mengharuskan pemohon menjadi pemilik token atau penerima pengguna yang disebutkan, sehingga pemegang tautan sembarang tidak dapat melewati daftar penerima.

## Dokumen versi tetap terlokalisasi

Dokumen versi komponen sekarang memuat teks aturan yang diterjemahkan secara konsisten di semua bahasa yang didukung.
