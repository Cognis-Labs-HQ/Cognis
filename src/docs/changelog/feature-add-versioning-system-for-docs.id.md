# Riwayat Docs yang Dapat Dijelajahi

**Cabang Fitur:** feature-add-versioning-system-for-docs

## Snapshot dokumentasi berversi

Cognis kini mengarsipkan dokumentasi setiap komponen saat aplikasi dimulai dengan versi yang dinyatakan dalam manifest komponen. URL dokumentasi menggunakan versi ajaib `latest` secara default, sementara snapshot lama tetap dapat diakses.

Pembaca dokumentasi dan catatan perubahan kini menangani indeks dokumentasi yang tidak tersedia atau tidak valid tanpa menggagalkan pemuatan halaman.

Pengembangan lokal kini menyimpan snapshot di direktori Cognis milik pengguna saat ini, sedangkan server terpaket menyertakan manifest platform yang diperlukan untuk memberi versi pada dokumentasi akar. Hal ini mencegah API docs mengembalikan respons `400` ketika tata letak runtime berbeda dari pohon sumber.

## Penjelajah versi

Pembaca dokumentasi kini menampilkan bilah versi horizontal yang dapat digulir di atas judul dokumen agar pembaca dapat beralih antara konten terbaru dan historis.

## Dokumen yang dihapus tetap tersedia

Indeks dokumentasi kini tetap memuat dokumen yang telah diarsipkan meskipun berkas sumbernya diganti nama atau dihapus, sehingga setiap versi yang tersimpan tetap dapat dijelajahi.

## Komit

- [ad5ede8](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad5ede84f3181c47669ecc0e3655b4321fba8a34)
