# Penafian Investasi Statuter (OJK Statutory Disclaimer) — IHSG Storm
## Kepatuhan POJK No. 6 Tahun 2026, UU No. 4 Tahun 2023 (UU P2SK), dan UU Pasar Modal

**Status Dokumen:** DRAFT (Menunggu Tinjauan Toby & Persetujuan Bobby / Konsultan Hukum)  
**Terakhir Diperbarui:** 8 Oktober 2026  
**Versi:** 1.0.0-DRAFT  
**Penyusun:** Erin (Client Success & Delivery PM)  
**Pemberitahuan:** *Dokumen ini merupakan draf operasional dan BUKAN merupakan nasihat hukum formal (not legal advice).*

---

## 1. Landasan Hukum dan Mandat Regulasi

Sesuai arahan pengawasan risiko dan kepatuhan hukum oleh Toby (**Task `t_b711dabb` / `security-review.md` Section 5.3**):
1. **POJK No. 6 Tahun 2026:** Peraturan Otoritas Jasa Keuangan tentang Perilaku Penyampai Informasi Sektor Jasa Keuangan melarang keras entitas tanpa izin memberikan nasihat investasi, rekomendasi transaksi efek, atau proyeksi harga di ruang publik maupun digital.
2. **UU No. 4 Tahun 2023 (UU P2SK) jo UU Pasar Modal Pasal 237:** Pihak yang tanpa izin OJK menyelenggarakan kegiatan pemberian nasihat investasi atau sinyal transaksi efek dapat dikenakan sanksi administratif (pemblokiran domain oleh Satgas PASTI) hingga sanksi pidana (penjara hingga 5 tahun dan denda maksimal Rp 5 Miliar).
3. **Status Hukum IHSG Storm:** IHSG Storm (`ihsg.badai.tech`) adalah penyedia perangkat lunak independen (*software tool*) untuk visualisasi data publik. IHSG Storm **BUKAN** Manajer Investasi, **BUKAN** Penasihat Investasi Berlisensi OJK, dan **BUKAN** Perusahaan Pialang/Sekuritas.

---

## 2. Naskah Penafian Resmi (Official Statutory Disclaimer Text)

### 2.1 Teks Penafian Bahasa Indonesia (Resmi):
> **PENAFIAN PENTING (DISCLAIMER):**  
> IHSG Storm (`ihsg.badai.tech`) adalah platform perangkat lunak independen untuk visualisasi, agregasi, dan analisis data keterbukaan informasi kepemilikan efek publik yang bersumber dari PT Kustodian Sentral Efek Indonesia (KSEI) dan PT Bursa Efek Indonesia (BEI).  
> **IHSG Storm BUKAN merupakan penasihat investasi berlisensi Otoritas Jasa Keuangan (OJK), bukan perusahaan pialang efek, dan tidak terafiliasi dengan OJK atau BEI.**  
> Seluruh data, grafik, estimasi pergerakan kepemilikan antar-bulan (MoM delta), metrik arus kepemilikan, dan informasi yang disajikan di platform ini disediakan semata-mata untuk **tujuan edukasi, penelitian independen, dan transparansi informasi publik**.  
> Tidak ada konten, materi, atau notifikasi di situs ini yang merupakan atau dapat ditafsirkan sebagai rekomendasi investasi, anjuran beli atau jual saham, sinyal transaksi (*trading signals*), atau target harga instrumen efek apapun.  
> Investasi saham mengandung risiko pasar yang signifikan termasuk potensi kehilangan modal. Seluruh keputusan transaksi finansial dan investasi adalah tanggung jawab mutlak dan independen dari masing-masing pengguna (*Do Your Own Research / DYOR*). IHSG Storm dan pengelolanya tidak bertanggung jawab atas segala keuntungan maupun kerugian finansial yang timbul dari pemanfaatan data ini.

### 2.2 English Version (Statutory Notice):
> **IMPORTANT STATUTORY DISCLAIMER:**  
> IHSG Storm (`ihsg.badai.tech`) is an independent software tool for data visualization, aggregation, and analysis of publicly disclosed Indonesian capital market ownership records published by PT Kustodian Sentral Efek Indonesia (KSEI) and the Indonesia Stock Exchange (IDX).  
> **IHSG Storm is NOT a licensed investment advisor under the Indonesia Financial Services Authority (OJK), is NOT a broker-dealer, and is NOT affiliated with OJK or IDX.**  
> All data, charts, month-on-month ownership changes, flow metrics, and notifications provided on this platform are for **educational, informational, and independent research purposes only**.  
> Nothing on this website constitutes investment advice, financial planning, a solicitation, an offer, or a recommendation to buy, hold, or sell any security or financial instrument. No trading signals or price targets are provided.  
> Equities investing involves significant financial risk, including the loss of principal. All investment decisions are the sole and independent responsibility of the user. IHSG Storm and its operators accept no liability for any direct or consequential loss arising from the use of this service.

---

## 3. Matriks 5 Titik Penempatan Disclaimer Wajib (Mandatory Placements)

Sesuai rekomendasi SEC-15 Toby, penafian wajib disematkan secara mencolok di 5 lokasi berikut:

| No | Titik Penempatan (Location) | Elemen UI / Komponen | Format Naskah yang Digunakan |
| :--- | :--- | :--- | :--- |
| **1** | **Global Persistent Footer** | `public/index.html` (Footer seluruh halaman) | Teks lengkap bilingual dengan tautan ke halaman legal penuh (`/legal/disclaimer`). |
| **2** | **Checkout & Registrasi Gate** | Modal Pembayaran (`modal-pro.html` / Mayar checkout) | **Checkbox wajib (unchecked by default):**<br>*"Saya menyetujui Ketentuan Layanan dan memahami bahwa IHSG Storm adalah alat analisis data publik, BUKAN penasihat investasi berlisensi OJK, dan tidak memberikan rekomendasi beli/jual saham."* |
| **3** | **Sheet Detail Saham & Investor** | `modal-stock.html` & `modal-investor.html` | **Banner Peringatan Atas:**<br>*"Data kepemilikan historis KSEI & harga bursa tertunda. Bukan ajakan bertransaksi efek atau rekomendasi investasi."* |
| **4** | **Header Berkas Ekspor CSV** | Baris 1–3 pada seluruh output file CSV yang diunduh | `# DISCLAIMER: IHSG Storm bukan penasihat investasi berlisensi OJK.`<br>`# Data bersumber dari keterbukaan KSEI/BEI untuk tujuan riset dan edukasi saja.`<br>`# Bukan rekomendasi jual/beli saham. DYOR.` |
| **5** | **Siaran Notifikasi (Telegram & Email)** | Bagian bawah setiap pesan Bot Telegram dan email | *"Catatan: Informasi ini disajikan murni untuk edukasi data publik KSEI dan bukan rekomendasi transaksi saham."* |

---

## 5. Panduan Standar Terminologi Kepatuhan (Compliance Terminology Guide)

Seluruh salinan teks antarmuka (*UI copy*), pesan bot, email promosi, dan materi bantuan wajib mematuhi pemisahan terminologi berikut guna mencegah jeratan hukum pom-pom pasar modal:

| Kategori | Terminologi DILARANG KERAS (Prohibited) | Terminologi PATUH & DIIZINKAN (Compliant) |
| :--- | :--- | :--- |
| **Sinyal Transaksi** | • *"Buy / Sell Signals"*<br>• *"Sinyal Masuk / Titik Keluar"*<br>• *"Waktunya Borong Saham Ini"* | • *"Perubahan Kepemilikan Saham (MoM Delta)"*<br>• *"Peningkatan / Penurunan Lembar Efek"*<br>• *"Arus Net Masuk / Keluar Kepemilikan"* |
| **Rekomendasi Saham** | • *"Rekomendasi Akumulasi Saham"*<br>• *"Saham Pilihan Cuan"*<br>• *"Top Picks Saham Pekan Ini"* | • *"Daftar Pemegang Saham Terbesar >1%"*<br>• *"Emiten dengan Penambahan Kepemilikan Terbanyak"*<br>• *"Distribusi Kepemilikan Berdasarkan Kategori"* |
| **Proyeksi Harga** | • *"Target Harga (Price Target)"*<br>• *"Potensi Cuan 50%"*<br>• *"Estimasi Lonjakan Harga"* | • *"Harga Penutupan Terakhir (Bursa Tertunda 15 Menit)"*<br>• *"Nilai Pasar Berdasarkan Harga Penutupan"* |
| **Slang Pasar Gelap** | • *"Bandar Sedang Menggoreng"*<br>• *"Ikuti Jejak Bandar Cuan"*<br>• *"Bocoran Titipan Saham"* | • *"Konsentrasi Kepemilikan Kustodian"*<br>• *"Aktivitas Rekening Sub-Account Bank"*<br>• *"Rasio Kepemilikan Investor Asing vs Lokal"* |

---

## 6. Protokol Verifikasi & Penegakan Kepatuhan

1. Setiap fitur baru yang menampilkan visualisasi data perubahan kepemilikan wajib diperiksa oleh QA dan Compliance Lead (Toby) untuk memastikan tidak menyertakan indikator sinyal otomatis.
2. Tim Client Success (Erin) wajib menolak setiap pertanyaan pengguna yang meminta saran saham dan memberikan jawaban standar penafian sesuai panduan Customer Support Playbook.
