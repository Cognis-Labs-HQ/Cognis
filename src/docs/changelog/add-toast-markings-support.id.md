# Visibilitas Ikon Toast di Mode Terang

## Ringkasan

Memperbaiki bug ikon notifikasi toast (error ✕, sukses ✓, peringatan ⚠, info ℹ) yang tidak terlihat di mode terang. Pada mode terang, variabel `--color-danger-text` dan `--color-success-text` menghasilkan nilai `#fff` (putih di atas latar putih), sehingga penanda menghilang. Aturan baru untuk mode terang kini menggunakan token warna teks garis batas agar ikon tetap terlihat jelas.

## File / Komponen yang Diubah

- `src/ui/styles/reuse/toast.css` — menambahkan aturan `body[data-theme="light"]` yang mengganti warna ikon untuk varian toast error, sukses, dan peringatan.
- `src/ui/styles/reuse/theme.css` — menambahkan `--color-danger-outline-text` dan `--color-success-outline-text` ke `:root` (nilai mode gelap) agar token selalu terdefinisi.

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/1305bfc163422709964268baafe8b0036c7b5c10
