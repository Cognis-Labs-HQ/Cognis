# Kunci Unik PostgreSQL

**Cabang Fitur:** fix-postgres-unique-reconciliation

## Rekonsiliasi Kunci Unik

PostgreSQL `ensureTable()` menyelaraskan deklarasi kolom `unique: true` dan `uniqueKeys` gabungan pada tabel yang sudah ada maupun tabel baru. Indeks unik yang valid, langsung berlaku, dan tidak parsial dikenali berdasarkan kolom kuncinya; hanya indeks yang belum tersedia yang dibuat. Beberapa nilai NULL tetap diizinkan. Kunci primer yang sudah ada tidak diganti.

Inisialisasi skema berjalan dalam transaksi dengan kunci advisory per tabel, termasuk saat dipanggil dalam transaksi executor yang sudah aktif. Nilai duplikat atau benturan nama indeks menggagalkan inisialisasi dan membatalkan perubahan skema; tidak ada rekaman yang dihapus atau dialihkan. Kegagalan dicatat pada batas transaksi.

## Komit

- [74a33d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/74a33d36a60b53bb8258d827e484ab39651a27ed)
