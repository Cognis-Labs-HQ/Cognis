# Penggunaan

Prosedur praktis untuk Kemajuan Belajar.

## Prasyarat

Berlatih melalui aktivitas Study aktif; rekaman kelas memerlukan akses saat ini.

## Contoh

Selesaikan percobaan, tinjau umpan balik, lalu kembali untuk melanjutkan kemajuan tersimpan.

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Hasil yang Diharapkan

Peristiwa bertahan setelah mulai ulang; latihan tepercaya dapat memberi XP. Koreksi menambah riwayat, bukan menimpanya.

## Pemecahan Masalah

Periksa akun dan konteks kelas. Mengulang peristiwa sama tidak membuat kemajuan atau hadiah tambahan.
