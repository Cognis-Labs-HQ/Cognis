# Jalur Pengujian Ringkas

**Cabang Fitur:** refactor-fixture-paths

## Ratakan berkas uji build

Simpan aset build UI dalam direktori berkas uji yang ringkas. Susun tata letak produksi hanya dalam pengujian build sementara. Pertahankan titik masuk bersama, penerbitan lembar gaya, dan penanganan aset statis.

Hapus salinan berkas uji SQLite yang tidak digunakan. Berkas uji PostgreSQL mempertahankan direktori penyedia dan tahapan SQL yang digunakan dalam penemuan basis data.

## Kelompokkan pengujian terkait

Tempatkan pengujian terkait dalam direktori berdasarkan topik dengan nama berkas yang lebih singkat. Perbarui impor dan referensi sumber daya tanpa mengubah penemuan pengujian secara rekursif.

## Terapkan aturan jalur

Instruksi AI utama dan pemeriksaan repositori melarang penyalinan struktur sumber ke berkas uji serta awalan topik pengujian yang berulang. Struktur penyedia dan paket yang bermakna tetap didukung.

## Komit

- [813655a37](https://github.com/Cognis-Labs-HQ/Cognis/commit/813655a3755f2b63a051ba6bdf928f02ece6dc65)
