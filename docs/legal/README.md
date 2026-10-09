# Paket Dokumen Legal & Customer Support Playbook — IHSG Storm
## Status: DRAFT — Menunggu Tinjauan Toby (Compliance) & Persetujuan Bobby (Founder) / Penasihat Hukum

**Penyusun:** Erin (Client Success & Delivery PM — The BAD.AI Office)  
**Tanggal:** 8 Oktober 2026  
**Lokasi Direktori:** `/home/hermes/company/ihsg/legal/`  
**Pemberitahuan Kepatuhan:** *Seluruh draf dalam direktori ini disusun untuk kebutuhan operasional layanan dan BUKAN merupakan nasihat hukum formal (not legal advice).*

---

## 1. Daftar Dokumen (Deliverables Manifest)

Direktori ini memuat 5 instrumen dokumen hukum dan panduan dukungan pelanggan dalam Bahasa Indonesia lugas (*plain-language Indonesian*):

| Berkas | Judul Dokumen | Fokus Kepatuhan & Isi Utama | Status |
| :--- | :--- | :--- | :--- |
| **`01-syarat-dan-ketentuan.md`** | Syarat dan Ketentuan Layanan (Terms of Service) | Model One-Time Pass (tanpa auto-renew), aturan stacking tier yang sama, blokir tier lebih rendah, alur upgrade bayar selisih, Founder Pass (kuota 50 kursi), Marketing Comp (D9), dan penafian OJK. | DRAFT |
| **`02-kebijakan-privasi.md`** | Kebijakan Privasi (Privacy Policy) | Kepatuhan UU No. 27/2022 (UU PDP), peran BAD.AI sebagai Pengendali Data, minimalisasi data ketat (Google OAuth Firebase, Xendit payment refs, Umami analytics; tanpa NIK/KTP/HP), hak ekspor (`GET /api/v1/me/export`) & hak hapus (`DELETE /api/v1/me`) beserta alur 6-tahap anonimisasi dan replay DR Litestream. | DRAFT |
| **`03-kebijakan-refund.md`** | Kebijakan Pengembalian Dana (Refund Policy) | Model akses prabayar digital sekali bayar, prinsip "Strictly No Refund setelah login dan konsumsi data KSEI", syarat refund 100% (transaksi ganda QRIS 48 jam & kegagalan sistem permanen 2x24 jam), dan non-eligible cases. | DRAFT |
| **`04-disclaimer-ojk.md`** | Penafian Investasi Statuter (OJK Statutory Disclaimer) | Kepatuhan POJK No. 6/2026 jo UU P2SK No. 4/2023 Pasal 237, teks resmi bilingual (ID/EN), 5 titik penempatan wajib (footer, checkbox checkout unchecked, modal emiten/investor, header CSV rows 1-3, notifikasi Telegram/email), serta kamus terminologi patuh vs dilarang (anti-pom-pom). | DRAFT |
| **`05-customer-support-playbook.md`** | Customer Support Playbook & SOP Penanganan Tiket | Panduan operasional Erin & Bobby, filosofi nada bicara OPC, SLA triase P1-P4, dan template balasan lengkap: (1) Data salah & data lag, (2) Akses belum aktif pasca-bayar, (3) Refund disetujui & ditolak sopan, (4) Permohonan hapus akun & ekspor data UU PDP. | DRAFT |

---

## 2. Pemetaan Kepatuhan Terhadap Keputusan Arsitektur & Keuangan

Dokumen-dokumen ini secara presisi mengimplementasikan seluruh keputusan strategis yang telah ditetapkan:
1. **Keputusan Jim (Architecture v3 D1–D15):**
   - **D1 & D6:** Pembayaran diproses di lingkungan VPS melalui gateway terlisensi (Xendit QRIS-first / Mayar fallback).
   - **D7:** Model autentikasi berbasis Bearer ID token Firebase, hak akses (*entitlement*) dikelola di basis data internal SQLite.
   - **D8:** Aturan pass stacking sejenis, pemblokiran pembelian tier lebih rendah saat tier lebih tinggi aktif, alur upgrade terpisah, kuota Founder Pass 50 kursi dicek ketat, dan GRACE_DAYS = 0.
   - **D9:** Peniadaan kunci satu sesi tunggal untuk akun comp; proteksi melalui kuota ekspor (50 CSV/bln) dan batasan laju (*rate limits*).
   - **D10:** Penghentian publikasi dataset penuh secara statis; nilai tambah berbayar diposisikan pada data historis, diffs MoM, alert, dan ekspor.
   - **D11:** Notifikasi transaksional via Resend dan alert saham via Bot Telegram.
2. **Kajian Keuangan Oscar & Jim (Freemium Plan v3):**
   - Model One-Time Pass murni (tanpa auto-renew) karena karakteristik QRIS yang merupakan rel pembayaran searah (*push payment*).
   - Penegasan status Non-PKP dan PPh Final 0,5% PP 55/2022 (harga bersih tanpa PPN 11%).
   - Kebijakan penolakan refund untuk keluhan perubahan pikiran (*buyer's remorse*) dan salah tafsir sinyal saham.
3. **Kajian Risiko & Keamanan Toby (Security Review SEC-15 & UU PDP):**
   - Penerapan klausul statuter anti-pom-pom POJK No. 6/2026.
   - Penempatan checkbox wajib tanpa centang awal (*unchecked by default*) di modal checkout.
   - Mekanisme penghapusan akun 6-langkah dan sinkronisasi `deletion_log` pada pemulihan cadangan Litestream.

---

## 3. Langkah Tindak Lanjut (Next Steps)
1. **Review Toby:** Peninjauan kepatuhan risiko regulasi OJK dan klausul UU PDP.
2. **Persetujuan Bobby / Kuasa Hukum:** Pengesahan final dokumen sebagai syarat peluncuran gerbang pembayaran komersial.
3. **Integrasi UI (Dwight & Pam):** Pemasangan tautan dokumen dan checkbox checkout pada antarmuka web.
