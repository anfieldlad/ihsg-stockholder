# Tinjauan Wording D10: Penghentian Publikasi Dataset Statis & Penafian Statuter (OJK & UU PDP)
## Standar Resmi Salinan Antarmuka (UI Copy), Paywall Teasers, dan Penafian Hukum — IHSG Storm

- **Penulis:** Toby (Security, Privacy & Ops Watchdog — The BAD.AI Office)
- **ID Task:** `t_af31d9ae` (IHSG D10 Implementation)
- **Tanggal:** 9 Oktober 2026
- **Status:** APPROVED & MANDATORY COMPLIANCE BASELINE
- **Sasaran Dokumen:** Implementasi Dwight (Backend), Pam (Frontend/UI), Oscar (Pricing), Erin (Client Success/Legal), Bobby (Founder)
- **Dasar Keputusan:** Jim `architecture-v3.md` (Keputusan D1–D15, khusus D10 & Seksi 3.6), Oscar `freemium-plan-v3.1.md`, POJK No. 6/2026, UU No. 4/2023 (UU P2SK), dan UU No. 27/2022 (UU PDP).

---

## 1. Landasan Strategis & Yuridis Keputusan Jim D10

### 1.1 Prinsip "Data Publik Tetap Publik" (What Is Already Public Stays Public)
Pada arsitektur v1/v2, berkas `shareholder_data.json` (7.154 baris data kepemilikan September 2026) disajikan secara statis dan terbuka tanpa autentikasi. Sesuai Keputusan D10 dan Seksi 3.6 Jim:
1. **Irreversibilitas Data Historis:** Siapapun yang telah mengunduh data publik September 2026 memiliki salinan tersebut. IHSG Storm tidak melakukan klaim kepemilikan semu, penarikan paksa, ataupun enkripsi retrospektif yang sia-sia. Apa yang telah dipublikasikan sebagai data publik tetap berstatus publik.
2. **Keterbukaan Statuter KSEI/BEI:** Data kepemilikan efek di atas 1% (>1%) bersumber dari keterbukaan informasi wajib pasar modal Republik Indonesia (UU Pasar Modal jo UU P2SK). Mengklaim data mentah KSEI sebagai "rahasia dagang eksklusif" atau "bocoran data tertutup" melanggar etika keterbukaan informasi publik dan dapat dikategorikan sebagai penyesatan konsumen (UU Perlindungan Konsumen No. 8/1999).
3. **Alasan Penghentian Berkas Statis Monolitik (M1-5):** Penghentian berkas statis `shareholder_data.json` dilakukan bukan untuk "menyembunyikan data", melainkan karena:
   - **Beban Perangkat & Bandwidth:** Mengunduh dan mengurai (*parsing/indexing*) berkas JSON 1,52 MB (7.154 baris) di sisi browser ponsel melumpuhkan kinerja perangkat pengguna bernavigasi hemat memori.
   - **Arsitektur Skalabilitas Multi-Bulan:** Seiring bertambahnya arsip bulanan (Oktober 2026, November 2026, dst.), dataset akan melampaui puluhan ribu baris yang mustahil dimuat sekaligus dalam satu berkas statis peramban.
   - **Keberlanjutan Infrastruktur Peladen:** Layanan memerlukan pembatasan laju (*rate limiting*) dan kuota ekspor agar peladen VPS 2GB tidak tumbang akibat *scraping* massal tak bertanggung jawab.

### 1.2 Nilai Tambah Berbayar yang Sah & Jujur (The Real Paid Value)
IHSG Storm tidak menjual "kerahasiaan data". Nilai jual komersial IHSG Storm bertumpu murni pada **Rekayasa Perangkat Lunak, Agregasi, dan Kenyamanan Analisis**:
1. **Histori Multi-Bulan (Multi-Month Archive):** Akses arsip longitudinal kepemilikan saham lintas kuartal dan tahun tanpa perlu mengumpulkan dan mencocokkan PDF/Excel bulanan secara mandiri.
2. **Deteksi Perubahan Otomatis (MoM Diffs Engine):** Algoritma komputasi instan yang mendeteksi posisi baru (*new*), keluar (*exit*), akumulasi (*increase*), dan distribusi (*decrease*) beserta delta lembar dan delta persentase.
3. **Notifikasi Otomatis Terjadwal (Alerts):** Bot Telegram instan yang memberi tahu pengguna begitu KSEI merilis snapshot baru untuk emiten dalam daftar pantauan (*watchlist*).
4. **Ekspor Data Bersih Terstruktur (CSV Export):** Format tabel siap olah untuk spreadsheet analisis pribadi (kuota 50 berkas/bulan untuk Pakar).
5. **Kenyamanan & Kecepatan (Convenience & Canonical Identity):** Normalisasi entitas pemegang saham (menggabungkan variasi ejaan nama investor) dan pemetaan konglomerasi/konsentrasi kepemilikan instan.
6. **Kelengkapan Daftar Pemegang (Complete Holder Rows):** Akses seluruh baris pemegang saham terdaftar (pemegang ke-6 s.d. ke-N), sementara tier gratis difokuskan pada 5 pemegang terbesar.

---

## 2. Matriks Pemisahan Fitur: Gratis vs Berbayar

| Fitur / Kemampuan | Tier Gratis (Pemula) — Rp 0 | Tier Investor — Rp 19k/bln (Rp 190k/thn) | Tier Pakar — Rp 49k/bln (Rp 490k/thn) / Founder Pass |
| :--- | :--- | :--- | :--- |
| **Akses Snapshot KSEI** | Snapshot terbaru saja | Snapshot terbaru saja | Snapshot terbaru + Seluruh arsip multi-bulan |
| **Daftar Pemegang per Emiten** | **Top 5 pemegang saham terbesar** | **Seluruh pemegang (>1%) tanpa batas (1..N)** | **Seluruh pemegang (>1%) tanpa batas (1..N)** |
| **Portofolio Investor** | Jumlah kepemilikan saja (tanpa rincian) | Portofolio lengkap seluruh emiten | Portofolio lengkap seluruh emiten |
| **Harga Bursa Saham** | Harga penutupan harian (EOD Close) | Harga penutupan harian (EOD Close) | Harga penutupan harian (EOD Close) |
| **Pencarian Emiten & Investor** | Tersedia (Dasar) | Tersedia (Lengkap) | Tersedia (Lengkap + Multi-kriteria) |
| **Analisis Perubahan (MoM Diffs)** | Terkunci (Hanya ringkasan indikator) | Terkunci | **Akses penuh deteksi perubahan MoM & filter akumulasi** |
| **Notifikasi Bot Telegram** | Tidak tersedia | Tidak tersedia | **Tersedia (Alert otomatis rilis KSEI)** |
| **Ekspor Berkas CSV** | Tidak tersedia | Tidak tersedia | **Tersedia (Kuota 50 berkas CSV / bulan)** |
| **Daftar Pantauan (Watchlist)** | Disimpan lokal di peramban (maks 5) | Akun tersinkronisasi (maks 20) | Akun tersinkronisasi (maks 50 emiten) |

*Catatan Kejujuran Gating:* Pada dataset KSEI September 2026, sebanyak 595 dari 961 emiten memiliki lebih dari 5 pemegang saham terdaftar. Untuk 366 emiten lainnya, top 5 mencakup 100% pemegang publik. Tier Gratis memberikan transparansi penuh yang nyata untuk 366 emiten tersebut dan representasi substansial (>80% kepemilikan) untuk 595 emiten lainnya.

---

## 3. Naskah Resmi Salinan Antarmuka (User-Facing Copy & Paywall Teasers)

### 3.1 Naskah Pengumuman Transisi Data Publik (Untuk Halaman Bantuan & FAQ)
**Judul:** *Transisi Ketersediaan Data: Mengapa Format Berkas Berubah & Apa yang Tetap Gratis?*  
**Isi Pesan:**  
> "IHSG Storm berkomitmen menjaga transparansi data pasar modal Indonesia. Data keterbukaan kepemilikan efek KSEI yang telah dirilis ke publik pada bulan-bulan sebelumnya tetap menjadi data publik.  
> Untuk menjaga stabilitas peladen, kecepatan respon peramban ponsel, dan keberlanjutan layanan seiring bertambahnya arsip bulanan, kami beralih dari satu berkas statis monolitik raksasa menjadi antarmuka API terstruktur.  
> **Komitmen Kami:** Fitur pencarian, ringkasan snapshot terbaru, dan daftar 5 pemegang saham terbesar untuk seluruh emiten tetap dapat diakses **100% GRATIS tanpa biaya**. Akses berbayar disediakan bagi Anda yang membutuhkan kenyamanan komputasi tingkat lanjut: riwayat multi-bulan, detektor perubahan kepemilikan (MoM diffs), bot notifikasi Telegram instan, dan ekspor CSV siap olah."

### 3.2 Lock Card Pemegang Saham Ke-6 s.d. Ke-N (`modal-stock.html`)
Ditempatkan tepat di bawah baris ke-5 pemegang saham pada tabel detail emiten:
- **Badge:** `🔒 AKSES INVESTOR / PAKAR`
- **Headline:** *Menampilkan 5 Pemegang Terbesar dari Total {total_holders} Pemegang Terdaftar*
- **Sub-headline:** *Buka rincian lengkap pemegang saham ke-6 hingga ke-{total_holders} untuk melihat kepemilikan institusi dan perorangan secara menyeluruh.*
- **Call-to-Action (CTA):** `[Buka Akses Lengkap — Mulai Rp 19.000 / Bulan]`
- **Micro-copy:** *Sekali bayar via QRIS • Tanpa langganan berulang • Akses langsung aktif*

### 3.3 Lock Card Portofolio Lengkap Investor (`modal-investor.html`)
Ditempatkan saat pengguna gratis mengklik profil investor terdaftar:
- **Badge:** `🔒 FITUR INVESTOR`
- **Headline:** *Portofolio Lengkap {investor_name} Terkunci*
- **Sub-headline:** *Investor ini tercatat memiliki porsi kepemilikan di {holding_count} emiten bursa. Dapatkan rincian kode saham, jumlah lembar, dan estimasi nilai portofolio.*
- **Call-to-Action (CTA):** `[Lihat Seluruh Saham Investor — Pass Rp 19k]`

### 3.4 Lock Card Tab Perubahan Kepemilikan (MoM Diffs Screener)
Ditempatkan pada tab `Perubahan Kepemilikan` (`tab-changes.html`):
- **Badge:** `🔒 KHUSUS PAKAR (PRO)`
- **Headline:** *Deteksi Otomatis Perubahan Kepemilikan Saham (Month-over-Month Delta)*
- **Sub-headline:** *Hemat puluhan jam analisis spreadsheet manual. Temukan emiten dengan akumulasi pemegang terbesar baru, penurunan porsi institusi, dan perubahan posisi strategis antar-bulan secara instan.*
- **Fitur Terkunci yang Diberitahukan:**  
  • *Penyaring Akumulasi / Distribusi Bersih*  
  • *Riwayat Perubahan Kepemilikan Multi-Bulan*  
  • *Peringatan Otomatis via Bot Telegram*  
- **Call-to-Action (CTA):** `[Aktifkan Pass Pakar — Rp 49.000 / Bulan]`
- **Micro-copy:** *Tersedia opsi Pass 12-Bulan (Hemat 2 Bulan) & Founder Pass Seumur Hidup (Terbatas 50 Kursi).*

### 3.5 Modal Ekspor Data CSV & Batasan Kuota (`export_csv`)
Ditempatkan saat tombol ekspor CSV diklik:
- **Untuk Pengguna Gratis / Investor:**  
  *Headline:* `Ekspor Data Terstruktur CSV Khusus Pengguna Pakar`  
  *Deskripsi:* `Unduh berkas data kepemilikan bersih yang siap diolah pada Microsoft Excel, Google Sheets, atau Python pandas. Termasuk identitas investor terkanonikalisasi dan persentase kepemilikan.`  
  *CTA:* `[Upgrade ke Pakar untuk Ekspor CSV]`
- **Untuk Pengguna Pakar (Penghitung Kuota):**  
  *Status:* `Sisa Kuota Ekspor Bulan Ini: {remaining}/50 berkas CSV`  
  *Pemberitahuan Lisensi:* `Berkas CSV ini dilisensikan untuk kebutuhan riset pribadi Anda. Baris header memuat identifikasi penafian kepatuhan OJK dan ID lisensi pengguna.`

### 3.6 Setup Integrasi Notifikasi Bot Telegram (`modal-telegram.html`)
- **Headline:** *Hubungkan Bot Telegram IHSG Storm*
- **Sub-headline:** *Dapatkan notifikasi instan langsung di aplikasi Telegram Anda segera setelah data keterbukaan KSEI bulan terbaru selesai diverifikasi dan dipublikasikan.*
- **Langkah-langkah Mudah:**  
  1. *Klik tombol 'Hubungkan Telegram' di bawah.*  
  2. *Buka bot resmi kami di Telegram (`@IHSGStormBot`) dan tekan Mulai (Start).*  
  3. *Notifikasi saham dalam daftar pantauan Anda akan otomatis dikirimkan.*
- **Prasyarat:** *Fitur eksklusif bagi pemegang Pass Pakar aktif.*

### 3.7 Ringkasan Nilai & Pilihan Paket pada Modal Checkout (`modal-checkout.html`)
- **Penegasan Model Pembayaran:**  
  *Badge Utama:* `🛡️ 100% SEKALI BAYAR (ONE-TIME PASS) — TANPA POTONG OTOMATIS (NO AUTO-RENEW)`  
  *Keterangan:* `Anda memegang kendali penuh. Kami tidak menyimpan kartu kredit dan tidak mendebet rekening Anda di kemudian hari. Bayar mudah menggunakan QRIS (GoPay, OVO, Dana, BCA, Livin, dll).`
- **Pilihan Paket Transparan:**  
  • **Investor 1-Bulan (Rp 19.000):** *Akses 30 hari data pemegang lengkap 1..N & portofolio investor.*  
  • **Investor 12-Bulan (Rp 190.000):** *Akses 365 hari (Hemat Rp 38.000 / 2 bulan gratis).*  
  • **Pakar 1-Bulan (Rp 49.000):** *Akses 30 hari seluruh fitur: MoM diffs, alert Telegram, & 50 ekspor CSV.*  
  • **Pakar 12-Bulan (Rp 490.000):** *Akses 365 hari (Hemat Rp 98.000 / 2 bulan gratis).*  
  • **Founder Pass Lifetime (Rp 599.000):** *Akses Pakar seumur hidup permanen. Khusus 50 pendukung awal platform.*

---

## 4. Naskah Penafian Statuter OJK (OJK Statutory Disclaimer)
*Kepatuhan penuh POJK No. 6 Tahun 2026, UU No. 4 Tahun 2023 (UU P2SK) Pasal 237, dan UU Pasar Modal.*

### 4.1 Naskah Penafian Footer Global (Persistent Footer)
Wajib ditampilkan di bagian bawah seluruh halaman web (`index.html`):
```text
PENAFIAN STATUTER (DISCLAIMER): IHSG Storm (ihsg.badai.tech) adalah platform perangkat lunak independen untuk agregasi dan visualisasi data keterbukaan informasi publik pasar modal (KSEI/BEI). IHSG Storm BUKAN Penasihat Investasi, BUKAN Manajer Investasi, dan BUKAN Perusahaan Pialang/Sekuritas berlisensi Otoritas Jasa Keuangan (OJK). Seluruh konten, metrik perubahan kepemilikan (MoM delta), dan data yang disajikan murni untuk tujuan edukasi dan riset mandiri, serta BUKAN merupakan rekomendasi investasi, anjuran jual/beli saham, atau sinyal transaksi. Seluruh keputusan transaksi finansial adalah tanggung jawab pribadi Pengguna (Do Your Own Research / DYOR).
```
*Tautan Pendamping:* `[Ketentuan Layanan] • [Kebijakan Privasi] • [Penafian Lengkap OJK] • [Kebijakan Refund]`

### 4.2 Kotak Centang Penafian Wajib di Modal Checkout (Checkbox Unchecked by Default)
Sebelum tombol proses pembayaran QRIS aktif, pengguna wajib mencentang dua kotak persetujuan berikut secara manual (tidak boleh dicentang otomatis oleh sistem):

1. **Kotak Centang 1 (Penafian OJK & Sifat Perangkat Lunak):**
   ```text
   [ ] Saya memahami dan menyetujui bahwa IHSG Storm adalah alat analisis dan visualisasi data keterbukaan publik KSEI/BEI, BUKAN penasihat investasi berlisensi OJK, dan TIDAK PERNAH memberikan anjuran, rekomendasi, target harga, atau sinyal jual/beli saham. Seluruh keputusan dan risiko transaksi investasi adalah tanggung jawab pribadi saya sepenuhnya.
   ```
2. **Kotak Centang 2 (Syarat Layanan & Kebijakan Akses Digital Sekali Bayar):**
   ```text
   [ ] Saya telah membaca dan menyetujui Syarat & Ketentuan serta Kebijakan Privasi. Saya memahami bahwa ini adalah pembelian pass digital sekali bayar (tanpa perpanjangan otomatis) yang langsung aktif seketika setelah pembayaran, dan biaya transaksi bersifat final serta tidak dapat dikembalikan setelah data diakses, kecuali terjadi kendala teknis sistemik terverifikasi.
   ```

### 4.3 Format Standar Baris Header Berkas Ekspor CSV (Rows 1–4)
Setiap berkas CSV yang diunduh wajib menyertakan baris komentar berawalan `#` agar terbaca sebagai metadata oleh perkakas data (pandas/Excel) tanpa merusak struktur kolom tabel:
```csv
# =================================================================================================
# DISCLAIMER & LISENSI: IHSG Storm (ihsg.badai.tech) — Data Keterbukaan Kepemilikan Efek Publik KSEI
# PERINGATAN REGULASI: Platform ini BUKAN Penasihat Investasi berlisensi OJK. Bukan rekomendasi jual/beli efek. DYOR.
# LISENSI PENGGUNA: Diunduh oleh User ID: {masked_user_id} | Waktu Unduh (UTC): {timestamp_iso} | Dilarang mendistribusikan ulang secara massal.
# =================================================================================================
Kode Emiten,Nama Emiten,Nama Pemegang Saham,Tipe Investor,Lokal/Asing,Jumlah Lembar,Persentase Kepemilikan,Tanggal Data
```

### 4.4 Banner Peringatan pada Sheet Detail Saham & Investor
Ditempatkan di bagian atas sheet informasi saham (`modal-stock.html`) dan profil investor (`modal-investor.html`):
```text
⚠️ Informasi kepemilikan bersumber dari keterbukaan berkala KSEI & harga penutupan bursa. Disediakan murni untuk edukasi dan transparansi data, bukan anjuran bertransaksi saham.
```

### 4.5 Penafian Pesan Bot Telegram & Email Transaksional
Wajib disematkan pada baris penutup setiap pesan notifikasi:
```text
Catatan Kepatuhan: Informasi di atas disajikan murni untuk edukasi data publik KSEI dan bukan rekomendasi jual/beli saham. Seluruh keputusan investasi adalah tanggung jawab pribadi Anda (DYOR).
```

---

## 5. Teks Kepatuhan UU PDP (Pelindungan Data Pribadi — UU No. 27/2022)

### 5.1 Catatan Privasi & Pengendali Data di Footer
```text
Pelindungan Data: BAD.AI bertindak sebagai Pengendali Data Pribadi sesuai UU No. 27/2022 (UU PDP). Kami menerapkan prinsip minimalisasi data ketat dan tidak pernah menjual data pribadi Anda.
```

### 5.2 Notifikasi Transparansi Data di Modal Checkout
Ditempatkan tepat di bawah rincian tagihan pembayaran:
- **Transparansi Pemrosesan:**  
  *Data yang Diproses:* Alamat email Google & ID Akun (untuk penerbitan pass akses digital), serta ID Referensi Transaksi Xendit.  
  *Jaminan Keamanan Finansial:* Pembayaran diproses secara aman melalui gerbang pembayaran berizin Bank Indonesia. Kami **TIDAK PERNAH** meminta, memproses, atau menyimpan nomor kartu kredit/debit, CVV, PIN perbankan, ataupun NIK/KTP Anda.  
  *Analitik Tanpa Cookie Pihak Ketiga:* Lalu lintas web diukur secara agregat tanpa cookie pelacak lintas situs (didukung oleh Umami Cloud).

### 5.3 Naskah Hak Subjek Data Pribadi (Self-Service Privacy Rights)
Disediakan pada menu pengaturan akun pengguna (`/profil`):
1. **Hak Portabilitas Data (Pasal 7 UU PDP):**  
   *Teks Antarmuka:* `Unduh Salinan Data Pribadi Saya (Format JSON)`  
   *Keterangan:* `Dapatkan arsip lengkap profil, riwayat pembayaran, hak pass, daftar pantauan, dan catatan tiket Anda dalam format terstruktur yang ramah mesin (dibatasi 3 kali unduh per hari).`  
   *Endpoint Teknis:* `GET /api/v1/me/export`
2. **Hak Penghapusan & Pemusnahan Data (Pasal 8 UU PDP):**  
   *Teks Antarmuka:* `Hapus Akun & Musnahkan Data Pribadi`  
   *Keterangan Dialog Konfirmasi:* `Tindakan ini permanen. Seluruh daftar pantauan, tautan bot Telegram, dan identitas email Anda akan dimusnahkan secara sistematis dari basis data kami dan Google Firebase. ID akun akan dianonimkan (hash satu arah). Sesuai UU No. 8/1997 tentang Dokumen Perusahaan dan regulasi perpajakan, catatan nominal transaksi pembayaran disimpan secara teranonim selama 10 tahun untuk kewajiban audit pembukuan hukum.`  
   *Peringatan Hak Pass:* `Sisa masa aktif pass berbayar yang belum kedaluwarsa akan hangus saat akun dihapus.`  
   *Endpoint Teknis:* `DELETE /api/v1/me` (Wajib re-autentikasi Google dalam 5 menit terakhir).

---

## 6. Standar Terminologi Kepatuhan (Compliance Terminology Guide)

Seluruh teks antarmuka (*UI copy*), pesan bot Telegram, materi FAQ, dan komunikasi pelanggan wajib mematuhi panduan pemisahan kosakata berikut guna mencegah jeratan hukum pasal manipulasi pasar modal dan pom-pom saham:

| Kategori | ❌ Terminologi DILARANG KERAS (Prohibited) | ✅ Terminologi PATUH & DIIZINKAN (Compliant) |
| :--- | :--- | :--- |
| **Perubahan Kepemilikan** | • *"Sinyal Beli / Jual (Buy/Sell Signals)"*<br>• *"Titik Masuk / Waktunya Serok"*<br>• *"Saham Siap Terbang / ARA"* | • *"Perubahan Kepemilikan Bulanan (MoM Delta)"*<br>• *"Peningkatan / Penurunan Lembar Saham"*<br>• *"Net Peningkatan Kepemilikan Investor Terbesar"* |
| **Daftar Saham** | • *"Rekomendasi Saham Pilihan"*<br>• *"Top Picks Saham Cuan"*<br>• *"Bocoran Emiten Potensial"* | • *"Emiten dengan Penambahan Kepemilikan Terbanyak"*<br>• *"Daftar Pemegang Saham Terbesar >1%"*<br>• *"Distribusi Kepemilikan Menurut Kategori"* |
| **Harga Saham** | • *"Target Harga (Price Target)"*<br>• *"Potensi Cuan 50%"*<br>• *"Prediksi Lonjakan Harga"* | • *"Harga Penutupan Bursa Terakhir"*<br>• *"Penutupan {tanggal} (Bursa Saham)"*<br>• *"Nilai Pasar Berdasarkan Harga Penutupan"* |
| **Slang Pasar Gelap** | • *"Bandar Sedang Menggoreng"*<br>• *"Ikuti Jejak Bandar Cuan"*<br>• *"Titipan Akun Rahasia"* | • *"Konsentrasi Kepemilikan Pemegang Saham"*<br>• *"Aktivitas Sub-Rekening Kustodian"*<br>• *"Rasio Kepemilikan Investor Institusi vs Perorangan"* |

---

## 7. Petunjuk Implementasi Teknis & Verifikasi Otomatis

### 7.1 Panduan untuk Pengembang Antarmuka (Pam & Dwight)
1. **Pemeriksaan Checkbox Checkout:** Checkbox penafian OJK dan persetujuan ToS wajib memiliki atribut HTML `checked = false` saat modal dibuka. Tombol *Bayar via QRIS* wajib berstatus `disabled` hingga kedua checkbox dicentang secara aktif oleh pengguna.
2. **Penyajian Header CSV:** Komponen ekspor CSV backend/frontend wajib menyuntikkan baris 1 s.d. 4 sesuai format Seksi 4.3 sebelum menuliskan baris nama kolom.
3. **Penyajian Penafian Footer:** Footer wajib memiliki kontras warna yang memenuhi standar aksesibilitas WCAG AA (misal: warna teks `#94a3b8` di atas latar belakang gelap `#0f172a`), tidak boleh disembunyikan menggunakan manipulasi CSS, dan selalu dapat diakses dari perangkat layar kecil (360px/375px).

### 7.2 Verifikasi Pengujian Kepatuhan (Test Suite Specification)
Pengujian otomatis (`tests/test_disclaimer_paywall_wording.py` dan `tests/test_legal_suite.py`) wajib memverifikasi:
- Ketersediaan berkas di `/home/hermes/company/ihsg/legal/disclaimer-and-paywall-wording.md` dan `docs/legal/disclaimer-and-paywall-wording.md`.
- Batasan jumlah baris berkas (<400 baris).
- Keberadaan seluruh klausa kunci: POJK No. 6/2026, UU P2SK Pasal 237, UU PDP No. 27/2022, D10 "data publik tetap publik", pemisahan fitur Gratis vs Berbayar, format komentar CSV `#`, dan checkbox checkout *unchecked by default*.
