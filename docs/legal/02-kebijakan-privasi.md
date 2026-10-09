# Kebijakan Privasi (Privacy Policy) — IHSG Storm
## Kepatuhan Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)

**Status Dokumen:** DRAFT (Menunggu Tinjauan Toby & Persetujuan Bobby / Konsultan Hukum)  
**Terakhir Diperbarui:** 8 Oktober 2026  
**Versi:** 1.0.0-DRAFT  
**Penyusun:** Erin (Client Success & Delivery PM)  
**Pemberitahuan:** *Dokumen ini merupakan draf operasional dan BUKAN merupakan nasihat hukum formal (not legal advice).*

---

## 1. Komitmen Pelindungan Data dan Peran Kami

Selamat datang di **IHSG Storm** (`ihsg.badai.tech`). Kami di **BAD.AI** ("Kami", "Pengelola", atau "IHSG Storm") berkomitmen penuh melindungi hak privasi dan data pribadi setiap Pengguna sesuai dengan amanat **Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)** serta peraturan pelaksanaannya.

Dalam pengelolaan platform IHSG Storm, BAD.AI bertindak sebagai **Pengendali Data Pribadi (Data Controller)** yang menentukan tujuan dan melakukan kendali pemrosesan data pribadi Anda.

---

## 2. Prinsip Minimalisasi Data (Strict Data Minimization)

Kami menerapkan prinsip minimalisasi data yang sangat ketat (*strict data minimization*). Kami hanya memproses data pribadi yang benar-benar esensial untuk penyediaan Layanan.

### 2.1 Data yang Kami Kumpulkan:
1. **Identitas Akun (Google OAuth via Firebase):**
   - Alamat email Google, Nama tampilan (*display name*), dan ID Unik Pengguna Google (*Firebase User Identifier / UID*).
   - Kami **TIDAK PERNAH** meminta atau menyimpan kata sandi (*password*) Anda; proses autentikasi ditangani sepenuhnya oleh Google OAuth.
2. **Referensi Transaksi Pembayaran (Mayar Payment Gateway):**
   - ID Pembayaran internal (*payment ID*), ID Faktur / Transaksi Mayar (*Mayar Invoice ID / Payment ID*), tautan pembayaran (*payment link*), nominal transaksi, metode pembayaran (misal: QRIS Dinamis / E-Wallet), dan status transaksi.
   - **TIDAK ADA DATA KARTU/BANK MENTAH:** Seluruh pembayaran diproses melalui *hosted checkout* terlisensi Bank Indonesia (Mayar — PT Mayar Solusi Karya). Kami **TIDAK PERNAH** mengumpulkan, memproses, atau menyimpan nomor kartu kredit/debit, nomor CVV, PIN, atau kredensial perbankan Pengguna.
3. **Analitik Penggunaan Platform (Privacy-First Analytics):**
   - Data telemetri agregat melalui **Umami Cloud** (platform analitik sumber terbuka yang patuh privasi).
   - Pengumpulan data tidak menggunakan cookie pihak ketiga (*no third-party tracking cookies*), tidak melacak riwayat lintas situs, dan alamat IP Pengguna dianonimkan (*anonymized IP hash*).
4. **Data Umpan Balik dan Pelaporan (Opsional):**
   - Alamat email atau *handle* Telegram yang Anda masukkan secara sukarela saat mengirimkan laporan kesalahan data atau saran fitur, beserta deskripsi laporan Anda.
5. **Data Preferensi Pengguna:**
   - Daftar pantauan saham pribadi (*watchlist*) dan pengaturan preferensi notifikasi Telegram (jika Anda menautkan akun bot Telegram).

### 2.2 Data yang Secara Mutlak TIDAK KAMI KUMPULKAN:
- Nomor Induk Kependudukan (NIK) atau foto e-KTP.
- Nomor telepon pribadi atau alamat rumah fisik.
- Data biometrik, data medis, atau data keuangan sensitif lainnya.

---

## 3. Data Keterbukaan Pemegang Saham Publik (KSEI / BEI)

1. Data kepemilikan saham di atas 1% (>1%) yang ditampilkan pada dashboard IHSG Storm (nama pemegang saham, kode emiten, jumlah lembar, persentase, klasifikasi lokal/asing) merupakan **data publik pasar modal**.
2. Data ini dipublikasikan secara resmi oleh KSEI dan BEI berdasarkan kewajiban hukum undang-undang pasar modal (**Pasal 50 UU PDP jo UU Pasar Modal**).
3. **Komitmen Anti-Doxxing:** Kami menampilkan informasi strictly sesuai dengan lembar publikasi resmi KSEI. Kami **SECARA TEGAS MELARANG DAN TIDAK PERNAH** melakukan pengayaan data (*data enrichment*) berupa doxxing nomor telepon pribadi, alamat rumah, nomor pokok wajib pajak (NPWP), atau media sosial pribadi pemegang saham publik.

---

## 4. Dasar Hukum Pemrosesan Data Pribadi (Pasal 20 UU PDP)

Kami memproses data pribadi Anda berdasarkan ketentuan Pasal 20 UU PDP:
1. **Pelaksanaan Kontrak (Pasal 20 ayat 2 huruf b):** Pemrosesan email dan UID Google diperlukan untuk memvalidasi hak akses pass berbayar, menyediakan dashboard, dan mengelola akun Anda.
2. **Kepatuhan Kewajiban Hukum (Pasal 20 ayat 2 huruf b):** Penyimpanan catatan transaksi pembayaran diperlukan untuk memenuhi kewajiban hukum perpajakan dan pembukuan keuangan di Indonesia.
3. **Persetujuan Eksplisit (Pasal 20 ayat 2 huruf a):** Pengiriman notifikasi Telegram atau balasan tiket umpan balik didasarkan pada persetujuan sukarela Anda saat mengaktifkan fitur terkait.

---

## 5. Periode Retensi Data (Jangka Waktu Penyimpanan)

Kami menyimpan data pribadi Anda hanya selama diperlukan untuk tujuan pemrosesan yang sah:

| Kategori Data | Elemen Data | Masa Simpan (Retention Window) | Dasar Aturan |
| :--- | :--- | :--- | :--- |
| **Profil Pengguna** | Email Google, Nama, Google UID | Selama pass aktif + 30 hari pasca-permohonan penghapusan | Keperluan operasional akun & masa sanggah |
| **Transaksi Finansial** | ID Faktur Mayar, Nominal, Waktu Bayar | **10 Tahun** | Kewajiban Undang-Undang Dokumen Perusahaan (UU No. 8/1997) & Perpajakan |
| **Tiket Umpan Balik** | Kontak pelapor, deskripsi laporan | 90 hari setelah tiket terselesaikan | Pelacakan kualitas data |
| **Riwayat Publik KSEI** | Nama pemegang saham emiten publik | Permanen (Arsip Terbuka) | Keterbukaan informasi pasar modal |

---

## 6. Hak Subjek Data Pribadi (Pasal 5, 7, 8 UU PDP)

Sesuai dengan UU PDP, Anda sebagai Subjek Data memiliki hak-hak fundamental sebagai berikut:

### 6.1 Hak Mendapatkan Informasi dan Akses Data (Pasal 5 UU PDP)
Anda berhak mengetahui data apa saja yang kami simpan mengenai diri Anda dan mendapatkan salinannya.

### 6.2 Hak Portabilitas Data (Pasal 7 UU PDP)
- Anda dapat mengunduh salinan seluruh data profil, hak akses, riwayat transaksi, daftar pantauan (*watchlist*), dan tiket bantuan Anda dalam format terstruktur dan ramah mesin (*structured JSON*).
- **Alur Mandiri:** Anda dapat mengakses endpoint `GET /api/v1/me/export` langsung dari menu pengaturan profil (dibatasi maksimal 3 kali ekspor per hari untuk mencegah penyalahgunaan).

### 6.3 Hak Penghapusan Akun dan Pemusnahan Data (Right to Erasure — Pasal 8 UU PDP)
- Anda berhak meminta penghapusan akun dan data pribadi Anda sewaktu-waktu.
- **Alur Mandiri:** Anda dapat mengajukan penghapusan akun secara mandiri melalui menu akun atau mengirimkan permintaan ke `DELETE /api/v1/me` (memerlukan re-autentikasi login Google dalam waktu <5 menit).
- **Prosedur Pemusnahan dan Anonimisasi Sistem (Toby Security Review):**
  1. Daftar pantauan (*watchlists*), tautan bot Telegram, dan antrean pesan notifikasi dihapus secara permanen (*hard delete*).
  2. Data kontak pada riwayat umpan balik dinullkan (`reporter_contact = NULL`).
  3. Baris profil pengguna dianonimkan: email dihapus (`email = NULL`), nama diubah menjadi `'Deleted User'`, Google UID di-hash satu arah (`sha256(firebase_uid)`), dan dicatat `deleted_at = now()`.
  4. Akun identitas dihapus dari direktori Google Firebase Auth melalui Firebase Admin API.
  5. Catatan pencacatan permanen ditambahkan ke `deletion_log(user_hash, deleted_at)`.
  6. **Disaster Recovery Erasure Replay:** Saat pemulihan cadangan database (Litestream/backup) dilakukan, skrip restore secara otomatis menjalankan ulang daftar `deletion_log` sehingga akun yang telah dihapus tidak akan pernah dibangkitkan kembali (*zero resurrect risk*).

---

## 7. Pembagian Data kepada Pihak Ketiga

Kami **TIDAK PERNAH MENJUAL, MENYEWAKAN, ATAU MEMPERDAGANGKAN** data pribadi Pengguna kepada pihak ketiga atau pengiklan manapun. Data hanya dibagikan kepada mitra pemroses infrastruktur terpercaya yang terikat perjanjian kerahasiaan:
1. **Google Firebase (Autentikasi):** Memvalidasi identitas login Google OAuth Anda.
2. **Mayar (Payment Gateway — PT Mayar Solusi Karya):** Memproses invoice dan tautan pembayaran QRIS, antarmuka hosted checkout, serta verifikasi webhook status pembayaran pass berbayar.
3. **Resend (Email Transaksional):** Mengirimkan tanda terima pembayaran dan pengingat perpanjangan pass.
4. **Telegram (Bot API):** Mengirimkan pesan alert saham pantauan (hanya jika Anda mengaktifkan bot).
5. **Aparat Penegak Hukum:** Hanya apabila diwajibkan secara tegas oleh perintah pengadilan atau hukum Republik Indonesia yang sah.

---

## 8. Keamanan Data dan Pengamanan Infrastruktur

Kami menerapkan langkah-langkah teknis dan organisasional mutakhir guna mengamankan data pribadi Anda:
1. Seluruh lalu lintas data dienkripsi dengan protokol HTTPS / TLS modern.
2. Akses basis data SQLite terlindungi di lingkungan peladen terisolasi (unprivileged user sandbox, cgroup v2 limits, cgroup isolation).
3. Basis data dicadangkan secara berkala menggunakan enkripsi asimetris (*age encryption*) sebelum diunggah ke penyimpanan objek awan (*Cloudflare R2 / Backblaze B2*).
4. Kunci rahasia API disimpan di berkas konfigurasi dengan izin ketat (*chmod 600*) dan tidak pernah dicatat pada log aplikasi.

---

## 9. Kontak Petugas Pelindungan Data (DPO / Privacy Contact)

Apabila Anda memiliki pertanyaan, keberatan, atau ingin menggunakan hak subjek data Anda (ekspor/penghapusan akun) secara manual, silakan hubungi tim Pelindungan Data Pribadi kami:
- **Email Khusus Privasi:** `privacy@badai.tech`
- **Subjek Email:** `[Hak UU PDP] Permohonan Ekspor / Hapus Akun - [Email Akun Anda]`
- **SLA Tanggapan:** Maksimal 3 x 24 jam kerja.
