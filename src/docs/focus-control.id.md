# Kontrol Fokus

## Skema manifes

Halaman dan elemen composer dapat mendeklarasikan `focusControl` dengan ID stabil, kunci teks terlokalisasi, rute terdaftar, mode presentasi, dan status yang dapat diserialkan. Pesan tidak menerima HTML atau callback.

## Alur dan penyedia

Alur bernama memisahkan deklarasi, otorisasi, mulai, pemuatan, publikasi, penerapan, pemindahan, dan akhir. Penyedia mendaftarkan kapabilitas hanya melalui ctx.

## Keamanan dan sinkronisasi

Setiap operasi diautentikasi, dibatasi pada sumber daya kolaborasi, serta memvalidasi keanggotaan dan peran. Status dibatasi 64 KiB dan revisi monoton melindungi konflik serta mendukung penyambungan kembali.

## Modul eksternal

Modul papan tulis menunjuk rute modul yang ditemukan. Hanya referensi sumber daya dan metadata presentasi yang disinkronkan; dokumen tetap melalui penyedia papan tulis.

## Kelayakan halaman komponen

Halaman modul eksternal tidak tersedia bagi komponen lain kecuali bootstrap-nya mendaftarkan rute SPA dengan `componentPage`. Deklarasi harus menyediakan kunci pelokalan huruf kecil pada `labelKey` dan `descriptionKey`, serta setidaknya satu mode yang didukung (`overlay`, `fullscreen`, atau `pip`). Cognis menambahkan UUID modul dari manifes terverifikasi; modul tidak boleh menyediakan atau menyimpulkan path berkas maupun URL skrip modul lain.

Gunakan titik sebagai pemisah kata pada setiap kunci pelokalan baru, misalnya `module.example.canvas.label`. Jangan menambahkan garis bawah atau tanda hubung di antara kata; hanya ID modul bertanda hubung yang sudah terdaftar yang boleh mempertahankan tanda hubung di segmen namespace modul.

```js
ctx.registerSpaRoute({
    id: "whiteboard.canvas",
    pattern: "^/whiteboards/[^/]+$",
    base: "/whiteboards",
    scriptUrl: "/static/modules/nextcloud-whiteboard/app.js",
    componentPage: {
        labelKey: "module.nextcloud-whiteboard.canvas.label",
        descriptionKey: "module.nextcloud-whiteboard.canvas.description",
        modes: ["overlay", "fullscreen"],
    },
});
```

Modul entri halaman harus mengekspor `mount(root, { signal, focusState })`, mematuhi sinyal pembatalan, merender hanya di dalam `root`, dan menerima konteks pemanggil yang dapat diserialkan melalui `focusState`. Pernyataan kelayakan hanya membuka presentasi; modul penyedia tetap bertanggung jawab atas otorisasi, pembuatan sumber daya, akses peserta, persistensi, dan sinkronisasi dokumen langsung.

## Meminta halaman komponen lain

Peminta mengidentifikasi penyedia dengan UUID manifes yang tidak berubah dan ID rute stabil. Kode browser memperoleh `component-pages:request` dari `uiCtx.capabilities`; kode tidak boleh mengimpor penyedia atau menyusun URL asetnya. Capability mengembalikan `null` ketika modul dinonaktifkan, tidak dapat diakses, tidak tersedia, atau belum mengizinkan penggunaan rute oleh komponen.

`component-pages:request` hanya memeriksa ketersediaan dan tidak pernah memasang UI. Jendela komponen dibuka melalui `component-pages:spawn` secara sinkron di dalam penangan klik atau aktivasi papan ketik tombol Whiteboard. Pemanggil memberikan ID panggung yang sudah ada dan dimilikinya serta `AbortSignal` halaman. Cognis mewajibkan aktivasi pengguna yang masih aktif, membatasi jendela ke panggung tersebut, mencegah navigasi tautan dan formulir mencapai router dasbor, serta meneruskan `navigationAllowed: false` kepada penyedia.

Capability spawn mengembalikan handle dengan `discard()`. Pemanggil wajib membuangnya saat aksi tutup atau kembali digunakan; abort signal maupun perpindahan rute SPA juga akan membuangnya. Sebagai alternatif, `component-pages:discard` membuang jendela berdasarkan ID panggung, sedangkan `component-pages:discardAll` tersedia bagi koordinator siklus hidup shell. Pemeriksaan ketersediaan saat halaman rapat dimuat hanya boleh memakai `component-pages:request`. Penyedia wajib merender hanya di root yang diberikan, menghormati signal, melepaskan sumber dayanya ketika dibuang, dan tidak menjalankan navigasi langsung saat disematkan.

ID panggung hanya boleh berisi huruf, angka, titik, garis bawah, titik dua, atau tanda hubung. Jika penyedia memiliki sumber daya tambahan, `mount` mengembalikan fungsi pembersihan atau objek dengan `destroy` maupun `unmount`.

Untuk Focus Control tersinkron, deklarasikan loader `module-route` dengan `moduleId` berupa UUID tersebut dan `routeId` berupa ID rute yang memenuhi syarat. Penyedia kolaborasi tetap harus mengotorisasi permintaan, membuat atau menemukan whiteboard melalui capability ctx sisi server, memberikan akses kepada peserta rapat, dan hanya menerbitkan pengenal sumber daya stabil melalui `focus:transport`.

## Jendela komponen tanpa bingkai

Teruskan `borderless: true` ke `component-pages:spawn` ketika halaman tertanam harus menyentuh setiap sisi panggung milik pemanggil. Cognis menghapus margin luar, padding, bingkai, dan radius jendela komponen, mengukur jendela beserta akar konten langsungnya agar memenuhi induk, serta meneruskan `borderless: true` ke opsi mount penyedia. Jarak internal konten tetap menjadi tanggung jawab penyedia.

Selama komponen tanpa bingkai terpasang, Cognis juga menghapus margin luar dari `.app-page__main` yang memuatnya. Margin halaman normal dipulihkan secara otomatis ketika komponen tanpa bingkai terakhir pada halaman tersebut dilepas.

Jendela komponen tidak membuat area gulir vertikal tersendiri. Panggung dan jendela tetap berada dalam tata letak flex normal serta tumbuh mengikuti konten tertanam, sementara masukan roda di atas komponen tetap menggulir halaman utama. Dengan demikian, posisi gulir tetap berada pada tingkat halaman di mana pun penunjuk berada.

### Tanggung jawab integrasi tanpa bingkai

- **Host Cognis:** menerapkan `component-page-stage--borderless`, merentangkan seluruh rantai `component-page-window → app-shell → workspace → composer grid → widget`, menghapus jarak workspace bertingkat, dan meneruskan `layout: { borderless: true, fillParent: true, scrollOwner: "document" }` ke mount penyedia.
- **Pemanggil rapat (misalnya Jitsi Meet):** meminta `borderless: true`; selama handle aktif, panggung rapat harus mengganti tinggi isi tetap atau luapan terpotong dengan tata letak yang tumbuh otomatis dan menampilkan luapan. Menutup komponen harus membuang handle broker dan memulihkan tata letak video normal panggung rapat.
- **Penyedia halaman (misalnya Nextcloud Whiteboard):** menghormati opsi mount `borderless` dan `layout` dengan membuat Page Composer memakai `frameless: true` dan `contentScrolling: false`. Pembungkus kanvas harus memenuhi widget composer dan panggung kanvas tidak boleh mendeklarasikan `overflow: auto`; pengguliran dokumen tetap dimiliki Cognis.

## Halaman komponen bawaan

Halaman dasbor terautentikasi yang disertakan bersama Cognis menggunakan UUID Cognis Core `b4d49c4a-61d0-5db2-84fd-f89b80fd6398`; Study menggunakan UUID gateway `338b9237-a2c8-5bcf-9437-bccc9abd9a27`. ID rute stabilnya adalah `core.dashboard`, `core.settings`, `core.users`, `core.invite`, `core.modules`, `core.administration`, `core.docs`, `core.changelogs`, `core.license`, `core.error`, `gateway.study`, dan `gateway.study.child`. Semuanya menggunakan kontrak `component-pages:request` yang sama dengan modul eksternal dan mendukung penyematan overlay atau layar penuh. Entri login dan demonstrasi bukan halaman komponen shell dasbor sehingga tidak memenuhi syarat.

## Jendela PiP yang dapat dipindahkan dan diubah ukurannya

Permukaan yang mendeklarasikan `pip` ditampilkan melalui perilaku jendela mengambang Cognis yang dapat digunakan kembali. Setiap jendela mengambang menyertakan toolbar tipis milik host yang dapat diseret dari sepanjang sisi atas serta pegangan ubah ukuran SVG yang terlihat di sudut kiri atas dan kanan bawah. Cognis menjaga jendela tetap di dalam area pandang dan melepaskan semua listener saat sesi fokus berakhir. Modul penyedia cukup mendeklarasikan `pip` dan memasang konten ke root yang diberikan; modul tidak boleh memasang handler seret atau ubah ukuran tingkat dokumen yang bersaing.

Penyedia dapat menyertakan `minSize: { width, height }` dalam metadata permukaan untuk menetapkan dimensi minimum PiP dalam piksel. Kedua dimensi harus berupa angka terbatas yang positif. Host meneruskannya ke pengendali jendela mengambang untuk diterapkan saat ukuran diubah; jika `minSize` tidak dicantumkan, nilai bawaan host digunakan.

Modul yang memiliki elemen PiP terpisah, seperti bingkai rapat, memperoleh `ui:makeFloatingWindow` melalui `uiCtx.capabilities`, meneruskan elemen, pegangan seret, dan sinyal halaman, lalu menyimpan fungsi pembersihan yang dikembalikan. Utility tidak boleh diimpor secara langsung.

Cognis mengangkat elemen penyedia yang sudah ada ke lapisan teratas peramban tanpa memindahkannya ke induk DOM lain. Dengan demikian, koneksi iframe dan rapat yang aktif tetap utuh ketika PiP dibuka atau ditutup. Peramban tanpa dukungan lapisan teratas mempertahankan elemen di panggung komponen asal dan membatasinya pada induk tersebut alih-alih memindahkan induknya.
