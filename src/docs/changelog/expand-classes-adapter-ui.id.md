# Changelog PR — Ruang Kelas

## Ringkasan

Pengalaman classroom dipusatkan ke `/classroom` dan halaman lama `/classes`
serta `/my-classes` sekarang diarahkan ke sana.

Pemilih kelas dipindahkan ke footer study bersama, entri sub-navigasi classroom
di modul bahasa dihapus, dan halaman classroom terpadu diperluas untuk
pergantian tampilan guru/siswa, aksi chat/meeting di dalam ruang, penelusuran
kelas yang tersedia, dan pembuatan kelas lewat popup.

Adapter classes kini mendukung mode bergabung, pencegahan kelas ganda per
bahasa, penjadwalan agenda, resolusi chat classroom, dan record classroom yang
selalu tersedia; terjemahan serta tes regresi juga diperbarui mengikuti alur
baru.

Dropdown pemilih kelas dipindahkan ke footer global sebagai elemen footer
page-composer, ditampilkan sebagai "Kelas: [dropdown]" dengan penerapan instan.
Awalan "Guru:" dihapus dari daftar kelas dan tampilan guru.

Tampilan classroom dirancang ulang sepenuhnya sebagai komposit 2D dari atas.
Ruang dibatasi seperti dinding. Papan tulis hijau gelap menampilkan agenda kelas
dalam font miring bergaya kapur dengan tombol aksi. Daftar siswa yang dapat
digulir berada di sebelah kiri papan tulis. Pintu kayu dengan busur ayunan berada
di dinding kanan. Lantai diisi dengan baris meja dan kursi dinamis yang
menyesuaikan kapasitas. Page-composer kini mendukung parameter `footer`.

## Tindak Lanjut Toolbar Classroom

Daftar classroom sekarang memakai label "Siswa" dan menampilkan guru di bagian
teratas sehingga panel classroom mengikuti istilah yang diminta.

Toolbar classroom sekarang memakai label teks alih-alih kontrol emoji, menyembunyikan
strip aksi saat siswa asli melihat ruang, dan menghubungkan tombol chat/meeting
ke jendela classroom yang sudah ada agar terbuka dengan andal.

## Peningkatan Antarmuka Classroom

Mengklik avatar atau tombol nama siswa di daftar kelas kini langsung menavigasi
ke halaman `/profile/` mereka.

Baris guru di daftar kelas kini ditampilkan di atas judul "Siswa", bukan di dalam
kisi siswa.

Jendela pertemuan di ruang kelas kini terbatas di dalam papan tulis dan tidak
lagi menutupi seluruh halaman. Overlay diposisikan secara absolut dalam konteks
tumpukan blackboard.

Alur pertemuan di ruang kelas kini mencerminkan alur API lengkap yang digunakan
halaman Pertemuan: panggilan buat diikuti panggilan gabung dengan ID sesi
persisten. Penyematan Jitsi diinisialisasi dengan nama tampilan, email, dan avatar
pengguna saat ini beserta tombol toolbar standar.

Diperbaiki bug di mana guru tidak dapat melihat kelasnya dan tampak terjebak di
tampilan siswa. Penyebabnya adalah peran yang sudah usang di localStorage yang
tidak diperbarui saat mount, serta flag `classroomBound` pada elemen `#app`
persisten yang mencegah handler interaksi terikat ulang setelah navigasi SPA.

## Meeting classroom kini terbuka dengan benar untuk siswa

Siswa yang mengklik tombol meeting pada papan classroom kini bergabung ke
meeting aktif, bukan mencoba membuat meeting baru (yang merupakan tindakan
guru dan selalu gagal untuk siswa). Siswa yang tidak memiliki meeting aktif
tidak mengalami perubahan perilaku.

## Pembaruan DOM tidak lagi mereset iframe meeting Jitsi

Perubahan kehadiran sebelumnya memicu penggantian konten classroom secara penuh,
yang sempat memutuskan iframe meeting dari dokumen — kondisi yang didefinisikan
browser sebagai pemicu reload iframe. Frame dihancurkan setiap kali status
peserta berubah. Perubahan kehadiran kini menggunakan jalur `refreshDynamicDom`
yang ditargetkan, yang hanya mengganti node lantai meja dan daftar anggota tanpa
menyentuh overlay meeting.

## Pembaruan DOM penuh mempertahankan meeting dan jendela chat aktif

Untuk pembaruan DOM yang mengganti seluruh elemen konten classroom (pengaturan
kelas, manajemen tempat duduk, dll.), elemen overlay meeting dan chat kini
dipindahkan ke ancestor yang hidup sebelum konten diganti dan dikembalikan ke
papan tulis sesudahnya. Ini menjaga kedua elemen — dan semua iframe di dalamnya
— tetap terhubung ke dokumen selama operasi berlangsung.

## Siklus Hidup Meeting Classroom — Paritas Jitsi Penuh

Logika meeting di classroom dipindahkan ke factory `createClassroomMeetingEmbed`
baru di modul `jitsi-meet` dan kini mengikuti siklus hidup halaman Meetings
secara tepat:

- `videoConferenceJoined` — menangkap ID peserta lokal, menentukan status
  moderator, dan menerapkan nama tampilan, email, serta avatar lewat perintah
  Jitsi.
- `participantRoleChanged` — memperbarui status moderator agar subjek dan
  kata sandi diterapkan ulang saat peran berubah.
- `passwordRequired` — mengirimkan kata sandi meeting yang tersimpan.
- `notificationTriggered` / `errorOccurred` — mendeteksi notifikasi penghentian
  dari server dan menutup jendela dengan flag kehadiran `terminated`.
- `videoConferenceLeft` / `readyToClose` — pembersihan saat peserta keluar.
- Timer heartbeat — mengirim `presence active=true` setiap 10 detik.
- Timer pembaruan status — melakukan polling status meeting setiap 5 detik dan
  menutup jendela segera setelah server melaporkan `endedAt`.

`classroom-windows.js` kini mendelegasikan sepenuhnya ke
`createClassroomMeetingEmbed` dan tidak memiliki logika meeting sendiri.

## Notepad dan Whiteboard Kelas

Ditambahkan **Notepad** per-kelas — catatan sesi yang dapat diakses semua
anggota kelas via toolbar. Catatan disimpan di `sessionStorage` dan tidak
dikirim ke server. Tombol "Unduh sebagai Markdown" mengekspor isi sebagai file `.md`.

Ditambahkan kemampuan **Papan Tulis** yang didukung oleh Nextcloud Whiteboard
(`NEXTCLOUD_WHITEBOARD_URL` / `NEXTCLOUD_WHITEBOARD_SECRET`). Guru dapat
membuat dan menghapus papan tulis bernama per kelas; semua anggota dapat
membuka papan tulis dalam tampilan layar penuh.

## Komponen dan berkas yang diubah

- Route dan store adapter study/classes:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes/index.ts`
    - `src/adapters/study/classes/routes/route-helpers.ts`
    - `src/adapters/study/classes/routes/available-classes-route.ts`
    - `src/adapters/study/classes/routes/enrolled-classes-route.ts`
    - `src/adapters/study/classes/store/classes.ts`
    - `src/adapters/study/classes/store/memberships.ts`
    - `src/adapters/study/classes/store/schema.ts`
    - `src/adapters/study/classes/store/teacher-requests.ts`
    - `src/adapters/study/classes/store/types.ts`
    - `src/adapters/study/classes/store/rows.ts`
- UI classroom dan navigasi study bersama:
    - `src/adapters/study/classes/ui/classroom.js`
    - `src/adapters/study/classes/ui/classroom-render.js`
    - `src/adapters/study/classes/ui/study-footer.js`
    - `src/adapters/study/classes/ui/view-mode.js`
    - `src/adapters/study/classes/ui/classes.css`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
    - `src/modules/study/languages/reuse/classroom-page.js`
    - `src/modules/study/languages/reuse/classroom-page.css`
    - `src/modules/study/languages/reuse/alphabet-page.js`
    - `src/modules/study/languages/reuse/library-page.js`
    - `src/ui/reuse/page-composer/init.js`
- Integrasi pendukung, string, dan tes:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/store/schema.ts`
    - `src/adapters/social/messages/store/rooms.ts`
    - `src/adapters/social/messages/store/db-messages-store.ts`
    - `src/gateways/study/ui/classes-dashboard-element.js`
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/study-followups.test.js`

    ## Tindak lanjut workspace dan skema

    Bootstrap skema adapter kelas tidak lagi mencoba menjalankan `PRAGMA` SQLite di
    Postgres saat mendeteksi dialek. Karena itu, startup meeting tidak lagi
    menghasilkan error SQL yang disengaja di log Postgres.

    Papan kelas sekarang memakai model workspace bersama dengan mode Agenda,
    Siswa, Notepad, Whiteboards, dan Meeting. Notepad kini tampil di workspace utama
    alih-alih sebagai overlay melayang, dan tombol whiteboard di toolbar sekarang
    membuka workspace whiteboard secara langsung sambil tetap menyediakan aksi
    pop-out yang eksplisit.

## Kontrol siswa kini mengikuti sesi guru yang aktif

Kontrol meeting dan whiteboard untuk siswa sekarang hanya ditampilkan ketika
guru benar-benar memiliki meeting classroom aktif atau whiteboard aktif yang
sedang terbuka.

Adapter classes sekarang menyimpan whiteboard classroom yang aktif di state
classroom, membatasi akses API whiteboard siswa hanya ke board aktif itu, dan
menghapus kontrol whiteboard yang usang begitu guru menutup board. Pemeriksaan
ketersediaan meeting classroom juga kini gagal secara lunak dan mengembalikan
daftar meeting aktif kosong alih-alih error 400 berulang ketika handle meeting
pemirsa tidak bisa diresolusikan.

Jendela chat classroom yang melayang sekarang dirender di atas header dashboard
dengan jarak atas yang lebih aman sehingga panel tidak lagi terpotong di bawah
area heading lengket saat dibuka.

## Kesalahan pencarian meeting aktif diperbaiki dan pengaman navigasi classroom ditambahkan

Kesalahan runtime (`store.getClass bukan fungsi`) yang menyebabkan endpoint
`/api/v1/modules/jitsi-meet/meetings/active` gagal saat resolver handle
peserta classroom berjalan, kini diperbaiki. Kemampuan tersebut menggunakan
panggilan `store.getClass` yang tidak ada; dikoreksi menjadi
`store.getClassById`, dan panggilan `store.listClassMembers` dikoreksi menjadi
`store.getClassMembers` dengan ID akun guru yang diambil dari baris kelas.

Embed meeting classroom kini mendaftarkan listener pengaman navigasi yang sama
dengan yang digunakan halaman Meetings mandiri: `beforeunload` memblokir
muat ulang halaman penuh, guard `click` fase capture mencegat navigasi link
SPA, dan guard `popstate` memblokir tombol back/forward browser — semuanya
menampilkan toast "Tinggalkan meeting sebelum berpindah halaman" saat meeting
sedang aktif.

## Pemuatan modul rute classroom

Rute SPA classroom dan bootstrap halaman langsung `/classroom` sekarang memuat
entri modul langsung dari
`/static/adapters/study/classes/classroom/index.js`. Ini menghapus jalur shim
perantara yang rapuh dan memperbaiki kegagalan fetch dynamic import saat
berpindah ke rute classroom.

## Modul opsional classroom dimuat via CTX

Sebelumnya, halaman classroom menggunakan impor modul ES statis untuk skrip
meeting embed Jitsi Meet dan jendela whiteboard Nextcloud. Jika salah satu
modul tidak terpasang, error 404 pada impor menyebabkan seluruh halaman
classroom gagal dimuat.

Kedua skrip kini dimuat secara dinamis melalui sistem capability CTX.
Setiap modul mendaftarkan URL skrip UI classroom-nya sebagai capability publik
(`meetings:classroomEmbedScriptUrl`, `whiteboard:classroomWindowScriptUrl`).
Adapter classes membaca capability ini saat bootstrap dan menyuntikkannya
sebagai meta tag ke HTML classroom. Client membaca meta tag tersebut saat
runtime dan mengimpor factory secara dinamis, serta tetap berfungsi dengan baik
bila salah satu modul tidak tersedia.

## Stabilitas rute classroom

Halaman classroom sekarang memuat helper avatar profil secara dinamis alih-alih
melalui impor gateway yang kaku. Jika aset UI gateway Social tidak tersedia,
`/classroom` tetap bisa dibuka, dan hanya hidrasi avatar yang diam-diam jatuh
ke fallback.

## Perbaikan Berdasarkan Umpan Balik Tinjauan

Bagian ini mendokumentasikan perubahan yang dilakukan sebagai respons terhadap
umpan balik tinjauan pada pull request ini.

## Modul whiteboard mengelola akses embed kelas

Adaptor classroom tidak lagi mengorkestrasi pembuatan JWT atau pemeriksaan
visibilitas papan aktif secara internal. Kemampuan baru
`whiteboard:getClassroomBoardEmbed` pada modul Nextcloud Whiteboard menangani
seluruh alur kontrol akses (memeriksa papan yang diaktifkan guru untuk siswa
melalui kemampuan `study:classes:resources`) dan mengembalikan URL embed atau
kode kesalahan. Rute classroom cukup memanggil kemampuan ini dan merespons
sesuai kebutuhan. Pembantu `getActiveWhiteboardId` telah ditambahkan ke kontrak
kemampuan `study:classes:resources`.

## Konfigurasi modul whiteboard tidak lagi menggunakan variabel lingkungan

Modul Nextcloud Whiteboard kini membaca konfigurasinya secara eksklusif dari
UI pengaturan berbasis database. Variabel lingkungan
`NEXTCLOUD_WHITEBOARD_URL`, `NEXTCLOUD_WHITEBOARD_SECRET`, dan
`NEXTCLOUD_WHITEBOARD_TOKEN_EXPIRY_SECONDS` telah dihapus dari
`docker/Dockerfile`. Administrator mengonfigurasi modul melalui panel
Administrasi → Modul.

## Kelas drag cursor generik di CSS reuse

Kelas utilitas `.can-drag` dan `.can-drag.is-dragging` telah dipindahkan ke
`src/ui/styles/reuse/layout.css`. Penampil gambar tidak lagi mendefinisikan
aturan kursor drag khusus komponen.

## Sensitivitas dan batas zoom penampil gambar

Faktor zoom pinch/scroll dikurangi dari 1,12 menjadi 1,07 untuk sensitivitas
yang lebih rendah. Zoom kini dibatasi pada rentang 0,25× – 5× (sebelumnya
0,1×–10×).

## Ruang nama URL notepad kelas dikoreksi

Semua rute API notepad dan agenda kelas kini berada di bawah
`/api/v1/file-reader/text/classroom-notes/:id/` alih-alih
`/api/v1/study/classes/:id/`. Ini menghilangkan pelanggaran kesadaran URL
lintas komponen.

## FileGatewayLike dihapus

Antarmuka ad-hoc `FileGatewayLike` di classroom-files-route.ts dan
text/routes/index.ts telah diganti dengan kontrak `FileStorageGateway` kanonik
dari `src/core/contracts/files-gateway.ts`.

## Peran admin di obrolan grup

Ruang obrolan grup kini mendukung peran **admin** yang berada di antara anggota
dan pemilik. Pemilik ruangan dapat mempromosikan dan menurunkan jabatan anggota
melalui endpoint baru
`PATCH /api/v1/social/messages/rooms/:id/members/:selector/role`. Admin dapat
menghapus dan membisukan anggota biasa tetapi tidak dapat bertindak terhadap
admin lain atau pemilik. Ruang pesan langsung tetap tidak berubah.

## Tata letak kisi avatar obrolan grup diperbaiki

Kisi avatar tiga anggota kini menampilkan anggota pertama di seluruh baris atas
dengan dua anggota lainnya berdampingan di bawah. Tata letak empat anggota
menggunakan kisi 2×2 standar.

## Ukuran file maksimum yang dapat dikonfigurasi di adaptor teks

Adaptor Text File Reader kini menyimpan ukuran file maksimum yang diterima di
database. Administrator dapat melihat dan mengubahnya dari panel Administrasi →
Adaptor di bawah gateway File Reader. Pengaturan dibatasi antara 16 KB dan 4 MB
(default 256 KB).

## Daftar adaptor gateway File Reader

Gateway File Reader kini mendaftarkan endpoint
`GET /api/v1/gateways/file-reader/adapters` yang mencantumkan adaptor yang
dipasang beserta URL kontrol adminnya.
