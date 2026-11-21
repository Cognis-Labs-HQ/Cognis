# Penggunaan

Prosedur praktis untuk Utilitas Frasa Sandi.

## Prasyarat

Tinjau [persyaratan akses](/docs/passphrase-utility) sebelum menjalankan prosedur ini.

## Contoh

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Hasil yang Diharapkan

Contoh ini memakai antarmuka Utilitas Frasa Sandi yang didokumentasikan. Periksa respons atau keadaan tersimpan yang dijelaskan dalam [Teknis](/docs/passphrase-utility/technical) sebelum mengulangi operasi tulis.

## Pemecahan Masalah

Jika Utilitas Frasa Sandi tidak tersedia, periksa status masuk dan minta administrator memeriksa komponen beserta dependensinya.
