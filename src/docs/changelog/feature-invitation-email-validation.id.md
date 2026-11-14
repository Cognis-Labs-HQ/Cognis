# Umpan Balik Email Undangan

**Cabang Fitur:** feature-invitation-email-validation

## Perbaiki Penerima Sebelum Mengirim

Registration 1.2.10 memvalidasi alamat penerima wajib dengan pembuat formulir bersama dan sintaks email bawaan. Toast terjemahan menandai dan memfokuskan kolom yang tidak valid sambil mempertahankan input untuk diperbaiki. Klik dan Enter memakai pemeriksaan yang sama.

## Batasi Tindakan Undangan

Tindakan berulang tidak dapat mengirim permintaan duplikat dalam satu percobaan yang sedang berjalan. Tutup, Escape, dan navigasi melepaskan formulir email; hasil terlambat tidak memperbarui halaman pengganti. Kebijakan server dan hasil undangan yang ada tetap berlaku. Panduan undangan menjelaskan perbaikan dalam keempat bahasa.

## Pertahankan Batas Validasi

Terjemahan validasi yang hilang tetap menjadi kesalahan aplikasi yang eksplisit, bukan kegagalan undangan umum. Dialog yang baru dibuka mempertahankan kaitan label dan kesalahannya sendiri meskipun dialog sebelumnya masih ditutup. Detail kesalahan penyedia tidak ditampilkan sebagai teks validasi.

## Commit

- [d7abffa488609d4d3644526683ed2058e2cf78cf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d7abffa488609d4d3644526683ed2058e2cf78cf)
