# Pertahankan Input Formulir saat Grid Page Composer Di-render Ulang

## Ringkasan

Saat page composer beralih antara tampilan layar kecil dan layar besar, grid
di-render ulang dan sebelumnya menghapus semua teks, pilihan, atau kotak centang
yang telah diisi pengguna pada kartu elemen yang terlihat.  Nilai field formulir
kini diambil tepat sebelum grid dikosongkan dan dipulihkan ke kartu yang baru
di-render, sehingga pengguna tidak kehilangan masukan mereka saat ukuran layar
berubah.

Perbaikan ini mencakup grid composer utama maupun sub-grid composer.  Field
dicocokkan berdasarkan `name`, lalu `id`, lalu posisi urutan di dalam kartu
elemen masing-masing.

## File/Komponen yang Diubah

- `src/ui/reuse/page-composer.js` — helper `captureFormState` /
  `restoreFormState` ditambahkan; dipanggil di `renderGridComposer` dan
  `renderSubGrid`
- `src/ui/tests/page-composer-refresh.test.js` — tes struktural baru

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/9888e39
