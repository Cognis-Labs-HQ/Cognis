# Kerangka Bahasa Studi

## Ringkasan

Kerangka Kerja Bahasa Studi mendefinisikan bagaimana konten pembelajaran bahasa disusun, didaftarkan, dan disampaikan di Cognis. Ini menyediakan arsitektur berlapis yang memisahkan gerbang Studi (infrastruktur) dari modul bahasa individual (konten), dan memisahkan perpustakaan inti setiap bahasa (referensi kanonik setiap karakter, kata, dan definisi dalam bahasa) dari komponen turunannya (kegiatan belajar interaktif).

**Modul bahasa** adalah paket TypeScript mandiri yang mendaftarkan dirinya ke gateway Studi pada waktu bootstrap. Hal ini tidak mengikuti pola adaptor yang digunakan oleh masalah infrastruktur seperti database atau sistem notifikasi; sebaliknya, ini adalah modul konten yang tugas utamanya adalah mengisi dan mengekspos pustaka bahasa serta mengiklankan komponen turunannya sehingga UI dapat menavigasi ke komponen tersebut. Menambahkan bahasa baru berarti menambahkan direktori modul baru; gateway Studi menemukannya secara otomatis.

Kerangka kerja ini dirancang agar bersifat granular. Kontributor dapat memperluas suatu bahasa dengan menambahkan satu komponen anak (misalnya kuis Hiragana, penampil urutan guratan kanji) tanpa menyentuh modul bahasa inti. Setiap komponen anak mendaftarkan sendiri entri sub-navigasi yang muncul di halaman Studi ketika pengguna memilih bahasa tersebut.

## Tanggung jawab

- Tentukan kontrak yang harus diterapkan oleh setiap modul bahasa.
- Tentukan model data perpustakaan: daftar karakter berlapis, karakter alternatif, definisi, kata, dan kalimat.
- Tentukan bagaimana komponen anak mendaftarkan halaman sub-navigasi dan berintegrasi dengan perpustakaan.
- Tentukan bagaimana gateway Studi menemukan modul bahasa dan memaparkannya ke UI.
- Memberikan standar agar kontributor dapat menambahkan karakter, kata, atau aktivitas belajar tanpa memahami sistem secara keseluruhan.

Tidak bertanggung jawab atas: cara gateway Studi menemukan adaptor (yang didokumentasikan dalam dokumen gateway), sesi umum atau manajemen kelas (yaitu adaptor kelas), atau alur kerja permintaan guru.

## Arsitektur

### Kontrak modul bahasa

Setiap modul bahasa mengekspor dua fungsi bernama:

```ts
export function createLanguageModule(): LanguageModule | null;
export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void>;
```

`createLanguageModule` dipanggil selama penemuan adaptor sehingga gateway dapat mengisi registri bahasanya dengan cepat, sebelum bootstrap penuh. Kembalikan `null` untuk menyisih dengan baik (misalnya ketika variabel lingkungan yang diperlukan tidak ada).

`bootstrapLanguageModule` dipanggil selama fase bootstrap dan menerima objek konteks yang melaluinya modul mendaftarkan rute, komponen anak, dan aset statis.

Antarmuka `LanguageModule`:

```ts
interface LanguageModule {
    readonly languageCode: string; // BCP 47 code, e.g. 'ja', 'ko', 'zh-TW'
    readonly languageName: string; // Human-readable name in the language itself
    readonly languageFlag: string; // Emoji flag, e.g. '🇯🇵'
    readonly version: string; // Semver
    listChildComponents(): LanguageChildComponent[];
}
```

### Model data perpustakaan

Perpustakaan adalah register multi-lapis yang otoritatif dari segala sesuatu dalam suatu bahasa. Lapisan dibangun satu sama lain dari bawah ke atas:

**Lapisan 1 — Karakter (`characters`)**
Unit penulisan atom suatu bahasa. Untuk orang Jepang, ini adalah hiragana dan katakana; untuk bahasa Korea, jamo. TIDAK menyertakan simbol gabungan seperti Kanji (yang termasuk dalam alt_characters). Setiap karakter membawa:

```ts
interface Character {
    id: string; // Stable unique identifier, e.g. 'ja:char:a'
    symbol: string; // The rendered glyph, e.g. 'あ'
    romanization?: string; // Standard romanization, e.g. 'a'
    category?: string; // Grouping within the script, e.g. 'hiragana', 'katakana'
}
```

**Lapisan 2 — Karakter Alternatif (`alt_characters`)** _(opsional)_
Simbol majemuk atau logografis yang berasal dari karakter dasar. Kanji adalah contoh kanonik: setiap kanji dapat dipetakan ke satu atau lebih karakter dasar atau kombinasi karakter dasar. Setiap alt_character membawa:

```ts
interface AltCharacter {
    id: string; // Stable unique identifier, e.g. 'ja:kanji:日'
    symbol: string; // The rendered glyph, e.g. '日'
    components: string[]; // IDs of constituent characters or other alt_characters
    readings?: string[]; // Romanized or phonetic readings, e.g. ['nichi', 'jitsu', 'hi']
}
```

**Lapisan 3 — Definisi (`definitions`)**
Sebuah gudang makna yang datar. Definisi adalah frasa atau kalimat pendek dalam bahasa tertentu (_bahasa definisi_, biasanya bahasa UI pelajar) yang menjelaskan suatu konsep. Definisi direferensikan melalui kata-kata dan kalimat, bukan disisipkan di dalamnya, sehingga satu definisi dapat dibagikan ke banyak kata.

```ts
interface Definition {
    id: string; // Stable unique identifier
    text: string; // The definition text
    language: string; // BCP 47 code of the definition language, e.g. 'en'
}
```

**Lapisan 4 — Kata-kata (`words`)**
Kombinasi satu atau lebih karakter atau alt_characters yang membentuk satu kesatuan yang bermakna. Kata-kata dipetakan ke satu atau lebih definisi, diurutkan berdasarkan kesamaan sehingga tarikan yang sederhana selalu mengembalikan makna yang paling umum terlebih dahulu.

```ts
interface Word {
    id: string; // Stable unique identifier, e.g. 'ja:word:nihon'
    graphemes: string[]; // Ordered list of character/alt_character IDs
    definitionIds: string[]; // Ordered by commonality (primary first)
    reading?: string; // Romanized reading of the whole word
    jlptLevel?: string; // Optional proficiency tag, e.g. 'N5'
}
```

**Lapisan 5 — Kalimat (`sentences`)**
Urutan kata yang diurutkan. Sebuah kalimat mungkin memiliki referensi definisi eksplisit (definisi khusus yang ditulis hanya untuk kalimat ini), atau mungkin mewarisi maknanya dengan menggabungkan definisi utama dari setiap kata penyusunnya.

```ts
interface Sentence {
    id: string; // Stable unique identifier
    wordIds: string[]; // Ordered word IDs that form the sentence
    definitionId?: string; // Optional explicit definition; falls back to word definitions
}
```

### Komponen anak

Komponen anak adalah fitur pembelajaran yang dapat disampaikan secara mandiri untuk bahasa tertentu. Itu mengiklankan dirinya sendiri melalui modul bahasa sehingga UI dapat membangun menu sub-navigasi. Komponen anak pada dasarnya harus berupa antarmuka ke dan dari perpustakaan — komponen tersebut menggunakan data perpustakaan dan secara opsional menulis kembali ke dalamnya (misalnya, kuis mencatat karakter mana yang telah dipraktikkan pengguna).

```ts
interface LanguageChildComponent {
    id: string; // Unique within the language, e.g. 'hiragana-alphabet'
    label: string; // Display name shown in the sub-nav, e.g. 'Hiragana Alphabet'
    pageUrl: string; // URL the router navigates to, e.g. '/study/explore/ja/kana'
    order?: number; // Lower numbers appear first in the sub-nav menu
}
```

Setiap komponen anak mendaftarkan rutenya sendiri selama `bootstrapLanguageModule` melalui `ctx.registerChildRoute`. Rute ini menyajikan halaman HTML atau titik akhir API. UI membuat `<nav>` di bawah halaman Studi dari daftar komponen anak yang terdaftar untuk bahasa aktif.

Browser menyediakan kapabilitas generik `ui:subPages` untuk penemuan halaman berkelompok, invalidasi tembolok, dan resolusi jalur. Gateway Study mendaftarkan bahasa sebagai grup dan komponen anak setiap bahasa sebagai halaman melalui `study:subPages`; hub, submenu bahasa terpilih, dan pemuat rute anak memakai model yang sama agar daftar halaman dan navigasinya selalu selaras.

### Alur pendaftaran

```
startup
  └─ Study gateway: discoverLanguageModules(modulesRoot)
       └─ for each language module dir: createLanguageModule() → register in languageRegistry
  └─ Study gateway: bootstrapLanguageModules(modulesRoot, ctx)
       └─ for each module: bootstrapLanguageModule(ctx)
            ├─ ctx.registerChildRoute(path, handler) — registers child page routes
            ├─ ctx.registerStaticDir(prefix, dir)   — serves static assets
            └─ ctx.gateway.registerLanguageModule(module) — adds to runtime registry
  └─ Study gateway exposes:
       GET /api/v1/study/languages/:code/modules → lists child components for that language
```

### Struktur direktori

Modul bahasa adalah repositori mandiri yang diinstal melalui Module Marketplace. Setiap repositori berisi:

```
cognis-module-japanese-learning/
  package.json          ← version + main field
  index.ts              ← exports createLanguageModule + bootstrapLanguageModule
  data/
    characters/
      hiragana.json     ← Layer 1 character records (one file per character class)
      katakana.json
    alt-characters/
      kanji.json        ← Layer 2 alt-character records (optional)
    definitions/
      common.json       ← Layer 3 definition records
    words/
      common.json       ← Layer 4 word records
    sentences/
      common.json       ← Layer 5 sentence records
  library/              ← TypeScript type documentation for this language's layers
    characters.ts
    alt-characters.ts
    definitions.ts
    words.ts
    sentences.ts
  components/           ← one sub-directory per child component
    hiragana-alphabet/
      ui/
        index.html
        app.js
    library/
      ui/
        index.html
        app.js          ← calls mountStudyLibraryPage from reuse/library-page.js
  docs/
    standard.en.md      ← language-specific contributor guide
```

Direktori `data/` adalah sumber kanonik untuk semua konten bahasa. Penyimpanan perpustakaan milik modul memuat file-file ini di bootstrap dan memaparkannya melalui API perpustakaan. **Jangan menyimpan data bahasa di mana pun selain `data/`.** File UI komponen turunan harus mengambil data dari API perpustakaan; mereka tidak boleh menyematkan data bahasa secara langsung.

Komponen anak sendiri mungkin berisi sub-komponen untuk fungsionalitas yang sangat bertumpuk (misalnya penjelajah Kanji dengan sub-bagian urutan guratan dan kosakata terpisah). `pageUrl` untuk sub-komponen tersebut akan menyertakan segmen jalur tambahan, dan UI komponen anak itu sendiri menangani sub-navigasi internal apa pun.

## Konfigurasi

Modul bahasa tidak memiliki variabel lingkungan global. `package.json` setiap modul membawa bidang `version`; menabraknya diperlukan setiap kali data perpustakaan modul, permukaan API, atau daftar komponen berubah.

## Poin Ekstensi

### Menambahkan bahasa baru

1. Buat repositori modul mandiri dengan `manifest.json` dan `package.json`.
2. Ekspor `bootstrapModule(ctx)` dari titik masuk bootstrap manifes.
3. Menyumbang kemampuan `study:language:<code>` yang berisi deskriptor bahasa dan komponen turunan.
4. Publikasikan repositori melalui sumber Module Marketplace yang dikonfigurasi.

### Menambahkan komponen anak ke bahasa yang sudah ada

1. Buat `components/<component-id>/index.ts` di repositori modul bahasa.
2. Ekspor fungsi `registerComponent(ctx)` yang memanggil `ctx.registerChildRoute()` dan mengembalikan deskriptor `LanguageChildComponent`.
3. Panggil `registerComponent(ctx)` dari `bootstrapLanguageModule(ctx)` dalam bahasa induk `index.ts`.
4. Tambahkan halaman UI di bawah `components/<component-id>/ui/`.

### Menambahkan sub-komponen yang sangat bertingkat

Jika komponen anak itu sendiri memerlukan sub-bagian (misalnya urutan guratan dan kosakata dalam penjelajah Kanji), kelola sub-navigasi internal dalam UI komponen anak itu sendiri. `LanguageChildComponent.pageUrl` menunjuk ke entri tingkat atas; semua perutean sub-bagian ditangani di sisi klien dalam halaman komponen tersebut.

## Rute API

| Method | Path                                    | Description                                          | Auth     |
| ------ | --------------------------------------- | ---------------------------------------------------- | -------- |
| GET    | `/api/v1/study/languages`               | List all available study languages                   | Required |
| GET    | `/api/v1/study/languages/:code/modules` | List child components registered for a language code | Required |

## Konvensi UI Perpustakaan dan Kelas

- Sub-navigasi Studi harus menampilkan entri **Perpustakaan** untuk pengguna admin/pemilik meskipun bahasa pembelajaran yang dipilih saat ini tidak mendaftarkan komponen anak Perpustakaan secara asli.
- Halaman Perpustakaan memperoleh konteks bahasa aktifnya dari pilihan sub-navigasi pengguna saat ini (melalui `loadStudySubNavigationModel`). Jangan menambahkan pemilih bahasa terpisah pada halaman Perpustakaan itu sendiri.
- Data perpustakaan bersifat holistik dan sadar bahasa: bahasa dimodelkan sebagai bidang catatan (misalnya `language`) daripada pembagian rute sulit per bahasa.
- Setiap modul bahasa harus mendaftarkan rute komponen anak **Kelas** sehingga guru dan siswa dapat mengakses tampilan kelas dalam cakupan bahasa.
- Halaman kelas harus menyertakan pemilih kelas, visualisasi kapasitas kursi, dan perilaku berbasis peran (kontrol manajemen guru vs. sebagian besar siswa + alur cuti).
- Modul bahasa memiliki implementasi Perpustakaan dan UI Kelas dan memaparkannya melalui rute komponen anak yang dinyatakan.

Lapisan belajar berada pada menu samping Jelajahi di `/study/explore/<bahasa ISO>/<navigationSlug>`. Modul dapat menetapkan `navigationSlug` unik per lapisan; jika tidak diberikan, ID lapisan digunakan. Rute Pustaka dan Permintaan tetap sama. Hanya pratinjau kalimat yang memotong judul dan definisi panjang.

[Impor Pustaka Terstruktur](/docs/adapters/study/library/import)

## Penelusuran dan Favorit Study

Flashcards membuka daftar dek milik sendiri, dek yang dibagikan kepada akun, dan dek awal lengkap dari penyedia bahasa aktif. Tautan berbagi tetap memerlukan izin yang berlaku dan bukan direktori publik. Menu + di kanan atas menawarkan Buat Dek dan Impor Dek. Jelajahi, Library, dan Flashcards menggunakan favorit Study tersimpan per akun dan kontrol urutan bersama. Pilih urutan penyedia, A–Z, Z–A, terbaru atau terlama. Bintang menjadi emas saat menyaring hasil favorit. Item Library, dek, dan kartu belajar memiliki favorit terpisah. Favorit tidak memberikan hak akses. Papan gambar mengakhiri sesi saat rute berubah dan tidak menimpa kelas composer atau shell.

## Latihan Kartu

Tindakan peramban menjalankan alur study:decks dengan tahap before, execute, dan after. Daftar dan detail server menjalankan authorize, read, dan audit; penyimpanan, ulasan, dan penghapusan mempertahankan validasi, izin, dan transaksi. Study memiliki papan gambar, penyusunan pola, kemiripan, dan alur tindakan bersama. Adaptor Gambar opsional hanya mengintegrasikan papan mengambang; Menulis tertanam tetap tersedia tanpanya. Halaman dan sesi dibatalkan saat ditinggalkan.

## Halaman Bahasa Bersama

Pilihan bahasa membuka halaman Jelajahi milik Cognis meskipun penyedia konten tidak mendeklarasikan halaman anak. Pergantian bahasa mempertahankan peran tulisan, kosakata atau kalimat yang setara; Flashcards, Library dan Permintaan mempertahankan konteks halaman bersama. Inggris mendeklarasikan alfabet, gabungan huruf, kosakata dan kalimat melalui slug sendiri. Pemuatan favorit yang dibatalkan melepaskan pemasangan tanpa pesan kegagalan yang menyesatkan.

Area gambar mengambang berada di atas dock tindakan halaman. Bagian kartu terkait membungkus hingga lima baris, lalu bergulir horizontal dengan scrollbar tersembunyi. Perubahan ukuran menghitung ulang batas, dan penutupan popup melepaskan pengamat. Nilai pelafalan IPA mempertahankan notasi aslinya dan menggunakan tipografi fonetik yang mudah dibaca.

Study menyediakan klasifikasi dan gaya pelafalan publik yang digunakan kembali oleh pratinjau Library, judul detail, varian, jawaban kartu, pilihan membaca, dan area gambar. IPA mempertahankan notasi aslinya; bacaan biasa mempertahankan tipografi aplikasi pilihan pengguna. Skema kalimat Jepang dan Inggris memerlukan sedikitnya dua referensi kata.

## Integrasi Ucapan Bersama

Pindahkan sintesis ElevenLabs ke modul terpisah yang dapat dikonfigurasi. Study memakai suara opsional per bahasa untuk kartu global tersimpan, sedangkan kartu pribadi dan kelas menerima unggahan terbatas dan rekaman mikrofon. Pertahankan komposisi kalimat berkelanjutan sebagai cadangan dari rekaman penyusun yang tersedia. Administrator dapat membuat ulang audio global saat mengedit.

`study:audio:provider.registerLanguage(language, configuration, resolveSpeech)` → `elevenlabs-tts:synthesis.synthesize({ text, language, voiceId? }, signal?)`

Naikkan versi paket konten Inggris dan Jepang saat menghapus rekaman bawaan. Selesaikan rekonsiliasi modul lain sebelum melaporkan aktivasi gagal agar rute persetujuan tetap memiliki alur terdaftar.

## Kepemilikan UI Bersama

Study menggunakan alur milik host `ui:pageOverlay.create({ signal, bottomInset })` untuk batas panel menggambar mengambang. Batas mengikuti perubahan halaman, kepala halaman, kaki halaman, dan area pandang tanpa mengubah tata letak halaman. Menutup tampilan atau melepas penyedia membersihkan pengamat, pendengar, dan elemen. Panel tertanam tetap menggunakan wadah yang diberikan.

Judul popup mempertahankan tipografi dan tata letak responsif sebelumnya melalui `headingLayout: "annotated"`, dengan posisi detail netral `aside` dan `below`. API popup menyediakan `appendHeadingAccessory(element)` dan `setContentConcealed(boolean)`. Penyembunyian memburamkan judul dan isi, memblokir interaksi, lalu memulihkan status aksesibilitas sebelumnya. Study hanya menata kontrol miliknya sendiri. Navigasi menggunakan `ui:navbarLinks`, termasuk tautan nonaktif dengan penjelasan terlokalisasi, serta menghapus tautan dan pendaftaran pencariannya saat dilepas.

## Imbalan Latihan Tersimpan

Study memuat dependensi UUID adapter dan kapabilitas inti wajib dari manifest. Dependensi diinisialisasi sebelum konsumen dan ketersediaan dihitung ulang setelah dinonaktifkan. Dependensi yang tidak tersedia membatasi Menggambar, Kartu Belajar, dan Papan Peringkat. Endpoint menggambar mengembalikan 503 jika Library atau Progress tidak tersedia. Progress menyimpan identitas proyeksi yang aman bagi basis data; latihan tepercaya menetapkan XP, pencapaian, dan peringkat berbukti secara persisten. Pengiriman imbalan kartu belajar berjalan setelah transaksi jadwal; percobaan ulang mempertahankan satu peristiwa, satu bukti imbalan, dan satu pembaruan jadwal.
