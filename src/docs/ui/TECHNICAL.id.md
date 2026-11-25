# Referensi Teknis

Host browser memiliki perutean, tampilan bersama, pelokalan, dan pemulihan aset publik.

## Antarmuka

`uiCtx.capabilities` meresolusikan penyedia browser aktif; `bindCapability(id)` menunda panggilan awal secara terbatas hingga registrasi tersedia. `ui:log` mengirim diagnostik ke [Logging](/docs/gateways/logging/technical). Halaman menerima AbortSignal dan melepaskan registrasinya saat selesai. [Page Composer](/docs/page-composer/technical), [Tutorial](/docs/tutorials/technical), dan [jendela komponen](/docs/focus-control/technical) mendefinisikan kontrak UI publiknya.

## Konfigurasi

Bahasa, tema, dan fon berasal dari Pengaturan akun. Label bersama memakai kunci datar `ui.reuse.*`; katalog komponen memakai namespace pemilik. Resolusi mencoba bahasa terpilih lalu Inggris; kunci Inggris yang hilang merupakan galat. Permukaan memakai token tema. [Profile](/docs/adapters/social/profile/technical) memiliki penyimpanan preferensi akun.

## Perilaku

Router SPA memuat halaman yang dideklarasikan dan membatalkan mount yang tergantikan; URL langsung memakai titik masuk yang sama. Aset shell terpisah dari halaman milik gateway/adaptor.

Service worker menyimpan aset publik, bukan respons API pribadi atau dokumen terautentikasi. Sumber daya yang berubah dapat mengembalikan salinan cache sambil melakukan penyegaran jaringan sesuai permintaan, paling sering sekali per menit. Aset dengan hash konten memakai ulang data tetap. Pembaruan worker menunggu tab yang dikendalikan ditutup. Pemulihan koneksi menawarkan penyegaran terlindungi.

Salinan offline pribadi dan antrean perubahan terikat pada akun/sesi serta pemiliknya. Kode publik dalam cache tidak memberikan akses data. Banner, indikator pemuatan, dan popup mengikuti siklus hidup host; kegagalan penyedia dicatat melalui gateway.

## Keamanan

Pemilik memvalidasi izin sebelum pembacaan dan mutasi; navigasi tersembunyi hanya aturan tampilan. Jangan menaruh data akun, kredensial, atau HTML terautentikasi dalam API cache publik. Teks kaya memakai renderer yang sesuai.

## Referensi

- [src/ui/reuse/ui-ctx.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/ui-ctx.js)
- [src/ui/reuse/app-router.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/app-router.js)
- [src/ui/reuse/i18n.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/i18n.js)
- [src/ui/public/sw.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/public/sw.js)
