# Penggunaan

Prosedur praktis untuk Papan Peringkat.

## Prasyarat

Masuk; papan kelas memerlukan keanggotaan aktif dan sebagian acara memerlukan persetujuan ikut.

## Contoh

Pilih kelompok dan periode, lalu bandingkan posisi serta kriteria yang ditampilkan.

```ts
const leaderboard = ctx.capabilities.require("study:leaderboard");
const table = await leaderboard.requestTableModel(query, "id");
```

## Hasil yang Diharapkan

Peringkat memakai bukti yang memenuhi syarat dan identitas sesuai privasi; koreksi dapat mengubah posisi.

## Pemecahan Masalah

Periksa partisipasi, kelayakan kelompok, dan bukti minimum. Aktivitas selesai belum tentu memenuhi semua papan.
