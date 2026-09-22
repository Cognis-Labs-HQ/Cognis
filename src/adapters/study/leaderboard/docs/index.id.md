# Papan Peringkat Study

## Integrasi penyedia

Adapter menerbitkan `study:leaderboard` melalui `ctx`. Paket bahasa atau penyedia Study lain dapat meminta kapabilitas ini saat bootstrap dan mendaftarkan definisi kelas atau acara pilihan. Definisi menentukan peringkat leksikografis atau berbobot, bukti minimum, jendela bergulir atau musiman, aturan seri, kebijakan kohor, serta promosi atau degradasi opsional.

Penyedia mengirim kumpulan yang selesai melalui kapabilitas publik `engagement:recordActivity`. Untuk memasukkan XP ke papan peringkat, panggil `scoreActivity` pada `study:leaderboard` dengan pelaku yang berwenang, ID definisi, ID kriteria, dan kumpulan aktivitas berbasis bukti yang sama. Papan peringkat memverifikasi setiap peristiwa melalui `study:progress` sebelum mencatat observasi.

## Privasi dan kelas

Peringkat menampilkan alias kecuali pemeriksa visibilitas profil mengizinkan identitas terlihat oleh pengamat. Pemblokiran dan aturan akun privat tetap berlaku di kelas. Penetapan kohor dan partisipasi berlaku per definisi, sehingga kompetisi kelas, pribadi, dan acara dapat berjalan bersama tanpa mencampur audiens.

## Siklus hidup

Gunakan `rollover` untuk mengarsipkan musim yang selesai dan membuka musim berikutnya. Koreksi membatalkan bukti lama sebelum penggantian. Gunakan `requestTableModel` untuk tabel lokal yang aksesibel, sedangkan `queryStandings` menyediakan model peringkat netral.
