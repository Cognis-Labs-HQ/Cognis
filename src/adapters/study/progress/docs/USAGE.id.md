# Penggunaan

Prosedur praktis untuk Kemajuan Belajar.

## Prasyarat

Tinjau [persyaratan akses](/docs/adapters/study/progress) sebelum menjalankan prosedur ini.

## Contoh

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Hasil yang Diharapkan

Contoh ini memakai antarmuka Kemajuan Belajar yang didokumentasikan. Periksa respons atau keadaan tersimpan yang dijelaskan dalam [Teknis](/docs/adapters/study/progress/technical) sebelum mengulangi operasi tulis.

## Pemecahan Masalah

Jika Kemajuan Belajar tidak tersedia, periksa status masuk dan minta administrator memeriksa komponen beserta dependensinya.
