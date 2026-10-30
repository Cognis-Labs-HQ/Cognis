# Papan Peringkat Study

Permintaan definisi dan peringkat tanpa autentikasi menjalankan pemeriksaan autentikasi yang diinjeksi dan selesai dengan HTTP 401 sebelum membaca data. Parameter rute memakai kontrak HTTP bertipe dan otorisasi yang sudah ada.

Snapshot dibagi pada batas Unicode menjadi baris paling besar 60.000 byte UTF-8 dan diganti secara transaksional. Snapshot satu baris yang sudah ada menggunakan jalur baca yang sama. Metode metadata registerDefinition, assignCohort, dan setParticipation kini mengembalikan Promise<void> dan harus ditunggu. Metode menjalankan alur ctx bernama, meneruskan kegagalan penyimpanan, dan membatalkan perubahan metadata yang gagal. Pergantian musim juga mengembalikan promise yang ditunggu. Pendaftaran papan kelas secara bersamaan berbagi satu proses pendaftaran yang masih berjalan.

Adaptor papan peringkat mengurutkan bukti belajar terverifikasi dalam kelompok yang diizinkan dan menyajikan peringkat yang aksesibel.

## Penggunaan

```ts
const leaderboard = ctx.capabilities.require("study:leaderboard");
const table = await leaderboard.requestTableModel(query, "id");
```

## Spesifikasi Teknis

### Integrasi penyedia

Adapter menerbitkan `study:leaderboard` melalui `ctx`. Paket bahasa atau penyedia Study lain dapat meminta kapabilitas ini saat bootstrap dan mendaftarkan definisi kelas atau acara pilihan. Definisi menentukan peringkat leksikografis atau berbobot, bukti minimum, jendela bergulir atau musiman, aturan seri, kebijakan kohor, serta promosi atau degradasi opsional.

Penyedia mengirim kumpulan yang selesai melalui kapabilitas publik `engagement:recordActivity`. Untuk memasukkan XP ke papan peringkat, panggil `scoreActivity` pada `study:leaderboard` dengan pelaku yang berwenang, ID definisi, ID kriteria, dan kumpulan aktivitas berbasis bukti yang sama. Papan peringkat memverifikasi setiap peristiwa melalui `study:progress` sebelum mencatat observasi.

### Privasi dan kelas

Peringkat menampilkan alias kecuali pemeriksa visibilitas profil mengizinkan identitas terlihat oleh pengamat. Pemblokiran dan aturan akun privat tetap berlaku di kelas. Penetapan kohor dan partisipasi berlaku per definisi, sehingga kompetisi kelas, pribadi, dan acara dapat berjalan bersama tanpa mencampur audiens.

### Siklus hidup

Gunakan `rollover` untuk mengarsipkan musim yang selesai dan membuka musim berikutnya. Koreksi membatalkan bukti lama sebelum penggantian. Gunakan `requestTableModel` untuk tabel lokal yang aksesibel, sedangkan `queryStandings` menyediakan model peringkat netral.

Bootstrap memerlukan gateway DB. Kegagalan penyimpanan dicatat dan tidak menghalangi penyimpanan berikutnya. Pengiriman ulang observasi identik menyimpan status tanpa menambah observasi. Akses kelas diperiksa setiap pemanggilan, termasuk setelah pencabutan.

## Imbalan Latihan Tersimpan

XP latihan yang telah disimpan mencapai papan peringkat melalui `study:leaderboard:recordPractice`, memakai skor tersimpan tanpa menghabiskan pengubah lagi. Latihan kelas kanonis membuat papan XP kelas dengan aturan privasi ukuran kelompok minimum yang sudah ada. Kriteria XP eksplisit pada acara yang dapat diakses dan telah disetujui pesertanya juga dapat menerima hasil. Identitas pengamatan mencakup papan dan kriterianya. Koreksi membatalkan pengamatan terkait, dan keanggotaan kelas terkini diperiksa sebelum menampilkan peringkat.
