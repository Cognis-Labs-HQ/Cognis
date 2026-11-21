# Penggunaan

Prosedur praktis untuk Pemulihan Komponen.

## Prasyarat

Tinjau [persyaratan akses](/docs/component-recovery) sebelum menjalankan prosedur ini.

## Contoh

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Hasil yang Diharapkan

Contoh ini memakai antarmuka Pemulihan Komponen yang didokumentasikan. Periksa respons atau keadaan tersimpan yang dijelaskan dalam [Teknis](/docs/component-recovery/technical) sebelum mengulangi operasi tulis.

## Pemecahan Masalah

Jika Pemulihan Komponen tidak tersedia, periksa status masuk dan minta administrator memeriksa komponen beserta dependensinya.
