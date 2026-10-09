# Paket Dokumen Legal & Customer Support Playbook — IHSG Storm
## Status: DRAFT — Menunggu Tinjauan Toby (Compliance) & Persetujuan Bobby (Founder) / Penasihat Hukum

**Penyusun:** Erin (Client Success & Delivery PM — The BAD.AI Office)  
**Tanggal:** 8 Oktober 2026 (Diperbarui 9 Oktober 2026 oleh Toby & Erin — Transisi Gateway ke Mayar)  
**Lokasi Direktori:** `/home/hermes/company/ihsg/legal/`  
**Pemberitahuan Kepatuhan:** *Seluruh draf dalam direktori ini disusun untuk kebutuhan operasional layanan dan BUKAN merupakan nasihat hukum formal (not legal advice).*

---

## 1. Daftar Dokumen (Deliverables Manifest)

Direktori ini memuat 6 instrumen dokumen hukum, tinjauan kepatuhan D10, dan panduan dukungan pelanggan dalam Bahasa Indonesia lugas (*plain-language Indonesian*):

| Berkas | Judul Dokumen | Fokus Kepatuhan & Isi Utama | Status |
| :--- | :--- | :--- | :--- |
| **`01-syarat-dan-ketentuan.md`** | Syarat dan Ketentuan Layanan (Terms of Service) | Model One-Time Pass (tanpa auto-renew), aturan stacking tier yang sama, blokir tier lebih rendah, alur upgrade bayar selisih, Founder Pass (kuota 50 kursi), Marketing Comp (D9), dan penafian OJK. | DRAFT |
| **`02-kebijakan-privasi.md`** | Kebijakan Privasi (Privacy Policy) | Kepatuhan UU No. 27/2022 (UU PDP), peran BAD.AI sebagai Pengendali Data, minimalisasi data ketat (Google OAuth Firebase, Mayar payment refs, Umami analytics; tanpa NIK/KTP/HP), hak ekspor (`GET /api/v1/me/export`) & hak hapus (`DELETE /api/v1/me`) beserta alur 6-tahap anonimisasi dan replay DR Litestream. | DRAFT |
| **`03-kebijakan-refund.md`** | Kebijakan Pengembalian Dana (Refund Policy) | Model akses prabayar digital sekali bayar, prinsip "Strictly No Refund setelah login dan konsumsi data KSEI", syarat refund 100% (transaksi ganda QRIS 48 jam & kegagalan sistem permanen 2x24 jam), alur refund via Saldo Dashboard Mayar, dan non-eligible cases. | DRAFT |
| **`04-disclaimer-ojk.md`** | Penafian Investasi Statuter (OJK Statutory Disclaimer) | Kepatuhan POJK No. 6/2026 jo UU P2SK No. 4/2023 Pasal 237, teks resmi bilingual (ID/EN), 5 titik penempatan wajib (footer, checkbox checkout unchecked, modal emiten/investor, header CSV rows 1-3, notifikasi Telegram/email), serta kamus terminologi patuh vs dilarang (anti-pom-pom). | DRAFT |
| **`05-customer-support-playbook.md`** | Customer Support Playbook & SOP Penanganan Tiket | Panduan operasional Erin & Bobby, filosofi nada bicara OPC, SLA triase P1-P4, SOP internal verifikasi & eksekusi refund Mayar via Saldo Dashboard, dan template balasan lengkap: (1) Data salah & data lag, (2) Akses belum aktif pasca-bayar, (3) Refund disetujui & ditolak sopan, (4) Permohonan hapus akun & ekspor data UU PDP. | DRAFT |
| **`disclaimer-and-paywall-wording.md`** | Tinjauan Wording D10 & Penafian Statuter (OJK & UU PDP) | Standar resmi salinan UI/paywall teaser paska penghentian dataset statis monolitik (D10), reposisi nilai berbayar (history/diffs/alerts/export/convenience), teks penafian OJK (footer, checkout checkbox unchecked, CSV header `#`), kepatuhan UU PDP & kamus anti-pom-pom. | APPROVED |

---

## 2. Pemetaan Kepatuhan Terhadap Keputusan Arsitektur & Keuangan

Dokumen-dokumen ini secara presisi mengimplementasikan seluruh keputusan strategis yang telah ditetapkan:
1. **Keputusan Jim (Architecture v3 D1–D15):**
   - **D1 & D6:** Pembayaran diproses di lingkungan VPS melalui gateway terlisensi (Mayar payment gateway untuk akun perorangan/WPOP).
   - **D7:** Model autentikasi berbasis Bearer ID token Firebase, hak akses (*entitlement*) dikelola di basis data internal SQLite.
   - **D8:** Aturan pass stacking sejenis, pemblokiran pembelian tier lebih rendah saat tier lebih tinggi aktif, alur upgrade terpisah, kuota Founder Pass 50 kursi dicek ketat, dan GRACE_DAYS = 0.
   - **D9:** Peniadaan kunci satu sesi tunggal untuk akun comp; proteksi melalui kuota ekspor (50 CSV/bln) dan batasan laju (*rate limits*).
   - **D10:** Penghentian publikasi dataset penuh secara statis; nilai tambah berbayar diposisikan pada data historis, diffs MoM, alert, dan ekspor.
   - **D11:** Notifikasi transaksional via Resend dan alert saham via Bot Telegram.
2. **Kajian Keuangan Oscar & Jim (Freemium Plan v3 / v3.2 Mayar):**
   - Model One-Time Pass murni (tanpa auto-renew) karena karakteristik QRIS yang merupakan rel pembayaran searah (*push payment*).
   - Penegasan status Non-PKP dan PPh Final 0,5% PP 55/2022 (harga bersih tanpa PPN 11%).
   - Biaya pemrosesan Mayar: 0,7% QRIS + 1,5% platform fee = 2,2% (Starter tier Rp 0/bln), biaya penarikan saldo flat Rp 2.775, settlement H+3.
   - Kebijakan penolakan refund untuk keluhan perubahan pikiran (*buyer's remorse*) dan salah tafsir sinyal saham.
3. **Kajian Risiko & Keamanan Toby (Security Review SEC-15 & UU PDP):**
   - Penerapan klausul statuter anti-pom-pom POJK No. 6/2026.
   - Penempatan checkbox wajib tanpa centang awal (*unchecked by default*) di modal checkout.
   - Mekanisme penghapusan akun 6-langkah dan sinkronisasi `deletion_log` pada pemulihan cadangan Litestream.

---

## 3. Langkah Tindak Lanjut (Next Steps)
1. **Review Toby (SELESAI — Task `t_af31d9ae`):** Peninjauan kepatuhan regulasi OJK & UU PDP serta perumusan salinan paywall D10 disahkan dalam `disclaimer-and-paywall-wording.md`.
2. **Persetujuan Bobby / Kuasa Hukum:** Pengesahan final dokumen sebagai syarat peluncuran gerbang pembayaran komersial.
3. **Integrasi UI (Dwight & Pam):** Pemasangan tautan dokumen dan checkbox checkout pada antarmuka web.

---

## 4. Harus diisi Bobby (Pre-Publishing Checklist & Placeholders)

Sebelum meluncurkan layanan secara komersial dan mempublikasikan dokumen legal ke ranah publik (`ihsg.badai.tech/legal/`), Founder Bobby wajib melengkapi dan menetapkan data placeholder definitif berikut:

| No | Parameter / Elemen Placeholder | Dokumen Terkait | Nilai Saat Ini (DRAFT) | Data Definitif yang Harus Diisi Bobby |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Nama Entitas Legal / Pemilik Resmi** | `01-syarat-dan-ketentuan.md`<br>`02-kebijakan-privasi.md` | `BAD.AI di bawah pengawasan Founder Bobby Dioriza` | Nama lengkap pemilik usaha (Bobby Dioriza) atau nama badan usaha (PT Perorangan / CV / PT) yang terdaftar resmi di Kemenkumham / NIB OSS. |
| 2 | **Alamat Fisik Operasional Kantor** | `01-syarat-dan-ketentuan.md`<br>`02-kebijakan-privasi.md` | `BAD.AI Office, Jakarta, Indonesia` | Alamat fisik surat-menyurat operasional lengkap di Indonesia (Jalan, Nomor, Kelurahan, Kecamatan, Kota, Kode Pos) untuk kepatuhan UU ITE & UU Perlindungan Konsumen. |
| 3 | **Alamat Email Dukungan Pelanggan (CS)** | `01-syarat-dan-ketentuan.md`<br>`03-kebijakan-refund.md`<br>`05-customer-support-playbook.md` | `support@badai.tech` | Pastikan kotak surat email dukungan telah aktif dan dihubungkan ke inbox Bobby / Mail client (atau gunakan email aktif lain seperti `bobby@dioriza.com` / `support@dioriza.com`). |
| 4 | **Alamat Email Khusus Privasi (DPO)** | `02-kebijakan-privasi.md` | `privacy@badai.tech` | Pastikan kotak surat privasi telah aktif untuk menerima permohonan hak subjek data (ekspor / hapus akun) sesuai mandat UU PDP No. 27/2022. |
| 5 | **Domisili Yurisdiksi Hukum Pengadilan** | `01-syarat-dan-ketentuan.md` | `Pengadilan Negeri Jakarta Selatan` | Sesuaikan domisili pengadilan negeri penyelesaian sengketa dengan wilayah domisili KTP atau kantor operasional Bobby. |
| 6 | **Nomor Kontak / Saluran Pengaduan** | `01-syarat-dan-ketentuan.md`<br>`05-customer-support-playbook.md` | *Hanya Email & In-App Form* | (Opsional/Direkomendasikan) Tentukan nomor WhatsApp Business atau nomor hotline pengaduan konsumen jika akan disediakan. |
| 7 | **Identitas Akun Mayar Live & Credentials** | `02-kebijakan-privasi.md`<br>`03-kebijakan-refund.md`<br>Konfigurasi Backend | *Dalam Persiapan Onboarding* | 1. Selesaikan KYC Individu (KTP + Selfie) di `mayar.id`.<br>2. Dapatkan API Key Live & Webhook Secret Token.<br>3. Konfigurasikan Webhook URL backend (`https://api.ihsg.badai.tech/webhooks/mayar`).<br>4. Pastikan nama display merchant di Mayar seragam dengan nama produk (`IHSG Storm`). |
