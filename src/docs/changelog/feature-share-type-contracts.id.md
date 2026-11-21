# Kontrak Share Bertipe

**Cabang Fitur:** feature-share-type-contracts

## Hasil Token Bertipe

Share 1.9.9 mendeklarasikan bidang token yang dikembalikan oleh kapabilitas penerbitan, pembaruan, dan daftar, termasuk metadata, kedaluwarsa, penerima, dan kapabilitas yang diberikan. Callback bootstrap dan fixture kueri terstruktur menggunakan kontrak eksplisit. Pemeriksaan pemilik dan pencabutan melalui daftar kapabilitas kosong tetap berlaku.

## Pengujian dan Keamanan

Pengujian sintetis mencakup hasil token tersimpan, penolakan pembaruan oleh bukan pemilik, dan pembersihan profil tamu. Pemeriksaan penerima, kata sandi, adaptor, dan kedaluwarsa mempertahankan perilaku sebelumnya.

## Komit

- [841fd8d38a298e4c1d4b529209d90be92bfba322](https://github.com/Cognis-Labs-HQ/Cognis/commit/841fd8d38a298e4c1d4b529209d90be92bfba322)
- [137c5eeebaee4702045181ff5880993ddd319913](https://github.com/Cognis-Labs-HQ/Cognis/commit/137c5eeebaee4702045181ff5880993ddd319913)
