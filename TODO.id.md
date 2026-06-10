# Item Umpan Balik Ditunda

## Code Review — tindak lanjut workspace classroom

### classroom-meeting-embed.js penamaan kelas CSS

**Reviewer suggestion:** Ganti nama `classes-meeting-window` di `src/modules/jitsi-meet/ui/classroom-meeting-embed.js` menjadi nama kelas yang lebih spesifik modul.

**Reason ignored:** Nama kelas ini adalah bagian dari kontrak styling yang sudah ada antara meeting embed dan adapter classes. Mengubahnya dengan aman memerlukan refaktor CSS lintas modul yang lebih besar di luar tugas ini.

### classroom.js flag interactionsBound

**Reviewer suggestion:** Hapus atau ubah flag `interactionsBound` di `src/adapters/study/classes/ui/classroom.js`.

**Reason ignored:** Ini false positive. Flag tersebut sudah berada dalam scope `mount()` dan dibuat ulang setiap kali halaman di-mount, jadi tidak ada regresi yang terkonfirmasi dari perilaku saat ini.

### classroom-presence.js penjadwalan heartbeat

**Reviewer suggestion:** Selaraskan interval heartbeat presence classroom dengan ambang away di `src/gateways/social/bootstrap.ts`.

**Reason ignored:** Ini adalah perubahan perilaku lintas komponen yang sudah ada sebelumnya dan tidak terkait langsung dengan perbaikan workspace/notepad/whiteboard. Perubahan ini sebaiknya ditangani dalam tindak lanjut terpisah.

### classroom-render.js validasi rosterItemClass

**Reviewer suggestion:** Validasi `member?.rosterItemClass` di `src/adapters/study/classes/ui/classroom-render.js` memakai whitelist, bukan hanya escape.

**Reason ignored:** Nilai saat ini berasal dari konstanta milik adapter. Pengetatan kontrak ini sebaiknya dilakukan bersama kode pembentuk data member, bukan disisipkan ke perubahan workspace ini.

### gateways/social/bootstrap.ts konstruksi JSON claims.sub

**Reviewer suggestion:** Bangun payload JSON untuk `claims.sub` di `src/gateways/social/bootstrap.ts` dengan cara yang aman.

**Reason ignored:** Ini adalah isu gateway terpisah di luar file yang diubah untuk tugas classroom ini.
