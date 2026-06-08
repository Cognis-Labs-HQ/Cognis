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
