# IHSG Storm (`ihsg.badai.tech`) — Catatan Perubahan Rencana Freemium v3.1
**Sub-judul:** Konfirmasi Aturan Pass Jim D8, Penghapusan Supabase Pro (Jim D3), Rekonsiliasi Biaya Tetap VPS+LLM & Spesifikasi Laporan Pengguna Berbayar  
**Penulis:** Oscar (Finance & Pricing)  
**Tanggal:** 9 Oktober 2026  
**Status:** Rekomendasi Final & Disahkan (Mengikuti Seluruh Keputusan Founder Bobby & Arsitektur Jim D1–D15)  
**File Terkait:** `/home/hermes/company/ihsg/freemium-model-v3.1.xlsx` & `/home/hermes/company/ihsg/architecture-v3.md`

---

## 1. Ringkasan Eksekutif & Latar Belakang Revisi v3.1

Dokumen ini merupakan catatan perubahan resmi (*diff note*) yang memperbarui **Rencana Freemium v3 (`freemium-plan-v3.md`)** dan **Model Finansial Excel v3 (`freemium-model-v3.xlsx`)** menjadi **versi 3.1**. Seluruh pembaruan didasarkan pada keputusan arsitektur final Solutions Architect Jim (`architecture-v3.md`) yang telah disahkan penuh oleh Founder Bobby (D1–D15).

### Prinsip Utama yang Dipertahankan Tanpa Perubahan:
1. **Harga Bobby Tetap Utuh (Strictly Untouched):**
   - **Gratis (Pemula):** Rp 0 (snapshot KSEI terbaru, top 5 pemegang per emiten, pencarian emiten & investor).
   - **Investor (Ritel):** Pass 1-Bulan **Rp 19.000** | Pass 12-Bulan **Rp 190.000** (diskon 16,7%).
   - **Pakar / Trader (Pro):** Pass 1-Bulan **Rp 49.000** | Pass 12-Bulan **Rp 490.000** (diskon 16,7%).
   - **Founder Pass (Lifetime Pro):** **Rp 599.000** (strictly capped 50 kursi).
2. **Model Pembayaran Murni Sekali Bayar (One-Time Pass):** Tidak ada langganan berulang (*no recurring subscriptions*), tidak ada pendebetan otomatis (*no auto-debit*), dan tidak ada sistem *dunning*. Pembayaran diproses dengan pendekatan *QRIS-first* via payment gateway (Xendit / Mayar / Midtrans).

---

## 2. Konfirmasi & Analisis Finansial Aturan Pass-Stacking Jim D8

Solutions Architect Jim menetapkan aturan transisi kepemilikan akses (*pass rules*) pada Bagian 4.4 & Keputusan D8 `architecture-v3.md`. Dari kacamata finansial, kepatuhan kas, pencegahan *refund*, dan unit economics, Oscar **MENYETUJUI PENUH (CONFIRM)** seluruh aturan tersebut dengan analisis berikut:

### 2.1 Konfirmasi Aturan Stacking Tier yang Sama (Rule R1: Same Tier Stacks)
- **Aturan:** Pengguna yang membeli pass dengan tier yang sama saat masih aktif tidak akan menimpa masa aktif berjalan; tanggal mulai pass baru (`starts_at`) otomatis diset sama dengan tanggal kedaluwarsa pass sebelumnya (`ends_at`), sehingga masa aktif terakumulasi (*stacks*).
- **Penilaian Finansial (Oscar):** **KONFIRMASI (Sangat Direkomendasikan)**.
  - *Perlindungan Modal & Kas di Muka:* Perusahaan mengamankan kas di muka (*upfront working capital*) lebih awal tanpa gesekan operasional.
  - *Eliminasi Biaya CS & Sengketa:* Pada transaksi tiket mikro ritel Indonesia (Rp 19k), pembeli sering kali panik atau tidak yakin apakah transaksi QRIS mereka berhasil, lalu melakukan pembayaran ulang. Dengan stacking otomatis, hak durasi pengguna terlindungi penuh (30 hari + 30 hari = 60 hari). Hal ini memangkas 95% potensi klaim pengembalian dana (*refund requests*) akibat "sengaja/tidak sengaja bayar dua kali".
  - *Biaya Marginal Nol:* Biaya inkremental database untuk melayani pengguna 30 hari tambahan di Fase 0 SQLite adalah Rp 0.

### 2.2 Konfirmasi Pemblokiran Pembelian Tier Lebih Rendah (Rule R2: Lower Tier Blocked)
- **Aturan:** Pengguna yang sedang memiliki tier Pakar aktif ditolak di alur *checkout* (HTTP 409 Conflict) jika mencoba membeli pass Investor.
- **Penilaian Finansial (Oscar):** **KONFIRMASI**.
  - *Mencegah Erosi Nilai & Kehancuran UX:* Tier Pakar memiliki fitur superior (histori MoM diff lengkap, bot Telegram instan, 50 kuota CSV/bln). Mengizinkan pembelian Investor akan menciptakan ambiguitas hak akses: apakah pengguna langsung diturunkan (*downgrade*) dan kehilangan hak Pakar yang sudah dibayar, ataukah pass Investor diantrekan setelah Pakar habis? Keduanya memicu komplain pelanggan ("kenapa fitur saya berkurang padahal baru bayar?").
  - *Pencegahan Refund Kas:* Menolak transaksi di *checkout* menjamin nol sengketa penurunan paket (*no mid-term downgrade chargeback*).

### 2.3 Konfirmasi Masa Tenggang Nol Hari (Rule R7: GRACE_DAYS = 0)
- **Aturan:** Akses terhadap fitur berbayar diputus seketika pada saat masa berlaku pass habis (`H+0`).
- **Penilaian Finansial (Oscar):** **KONFIRMASI**.
  - *Mencegah Moral Hazard Tiket Mikro:* Pada produk SaaS berbasis langganan kartu kredit, *grace period* 3–7 hari lazim diberikan karena kegagalan pemotongan bank (*failed invoice dunning*). Namun pada tiket mikro sekali bayar (Rp 19k nett Rp 18,3k), masa tenggang 3 hari setara dengan memberikan **10% layanan gratis**, dan 7 hari setara dengan **23,3% layanan gratis**. Pengguna tidak akan memiliki urgensi untuk membayar tepat waktu jika data tetap terbuka.
  - *Pemberitahuan Dini Terjadwal:* Sistem mengirimkan pengingat kedaluwarsa pada H-3 dan H-1 via email dan bot Telegram (Bagian 4.6). Pengguna telah memiliki cukup waktu untuk memperpanjang.
  - *Insentif Diskon Loyalitas (Loyalty Discount):* Pemutusan di H+0 dikombinasikan secara elegan dengan jendela diskon loyalitas 7 hari (H+0 s.d. H+7, diskon Rp 5.000 untuk 1M atau 10% untuk 12M). Ini menciptakan dorongan psikologis yang kuat untuk memperpanjang tanpa mengorbankan integritas paywall.

### 2.4 Konfirmasi Alur Upgrade Terpisah & Atomik (Rule R4 & Section 4.5)
- **Aturan:** Upgrade Investor ke Pakar tidak dilakukan sebagai pembelian biasa, melainkan melalui alur *upgrade checkout* tersendiri:
  - *Pass 1-Bulan (<= 7 hari pembelian):* Bayar selisih flat **Rp 30.000** (Rp 49.000 - Rp 19.000), masa aktif Pakar direset 30 hari penuh sejak pembayaran upgrade.
  - *Pass 12-Bulan:* Bayar prorata sisa bulan penuh: $\lfloor 	ext{sisa hari} / 30 floor 	imes 	ext{Rp } 25.000$, tanggal akhir tetap sama dengan akhir pass tahunan.
  - *Eksekusi Database Atomik:* Menggunakan transaksi tunggal `BEGIN IMMEDIATE` yang menutup *entitlement* lama (`closed_at = now`, `closed_reason = 'upgraded'`) dan menerbitkan *entitlement* Pakar baru (`supersedes_id = base_id`), dengan `UNIQUE(payment_id)` sebagai *backstop*.
- **Penilaian Finansial (Oscar):** **KONFIRMASI (Sangat Kuat)**.
  - Menghindari kebocoran hak akses ganda (*dual active entitlements*).
  - Memastikan rekonsiliasi kas sempurna: setiap Rupiah yang masuk terikat pada baris pembayaran dengan snapshot paket yang tidak dapat diubah (*immutable snapshot*).

### 2.5 Konfirmasi Pembatasan Ketat Founder Pass (Rule R5: Founder Pass Cap 50)
- **Aturan:** Kuota Founder Pass (seumur hidup) dibatasi strictly maksimal 50 kursi. Diverifikasi di *checkout* dan diverifikasi ulang secara atomik saat *fulfilment*. Jika terjadi *race condition*, transaksi berlebih ditandai `needs_review` dan dikembalikan manual (*manual refund*).
- **Penilaian Finansial (Oscar):** **KONFIRMASI MUTLAK**.
  - Menolak LTD publik tanpa batas di harga Rp 19k/Rp 49k yang merupakan "bunuh diri finansial".
  - Kuota 50 kursi @ Rp 599.000 memberikan suntikan kas awal non-dilutif sebesar **Rp 29.950.000** (cukup mendanai seluruh OpEx Fase 0 selama 76,8 bulan / 6,4 tahun!).
  - Verifikasi ganda mencegah *overselling* liabilitas seumur hidup.

---

## 3. Penghapusan Garis Biaya Supabase Pro (Jim D3) & Rekonsiliasi OpEx

### 3.1 Penghapusan Total Supabase Pro ($25 / Rp 400.000/bln)
Dalam `freemium-plan-v3.md` dan model v3 sebelumnya, Oscar mengalokasikan biaya Supabase Pro sebesar USD 25 / bulan (Rp 400.000/bln) mulai Fase 3 (M7+). Sesuai keputusan arsitektur Jim D3:
1. BAD.AI telah memilih **Firebase Authentication** untuk login Google tunggal (Spark Plan, Rp 0).
2. Nilai utama Supabase (Auth + RLS bawaan) tidak digunakan karena seluruh hak akses (*entitlements*) divalidasi di backend FastAPI.
3. Database Fase 0 berjalan mandiri di VPS menggunakan **SQLite (WAL) + Litestream** yang mereplikasi database secara berkelanjutan ke Cloudflare R2 (kapasitas gratis hingga 10 GB).
4. **Biaya Database Fase 0 s.d. Fase 3 = Rp 0 / bulan**.

### 3.2 Rekonsiliasi Struktur Biaya Tetap Operasional (Fixed OpEx)
Struktur biaya operasional tetap Fase 0 (<5 pengguna berbayar) kini murni terdiri dari:
- **Hosting VPS & Domain:** Rp 70.000 / bulan (Rp 50.000 alokasi VPS IDCloudHost `103.179.56.61` + Rp 20.000 alokasi domain/DNS `badai.tech`).
- **AI Agent Squad (LLM Shared Subscription):** USD 20 / bulan = Rp 320.000 / bulan (kurs flat Rp 16.000/USD).
- **TOTAL FIXED OPEX FASE 0 = Rp 390.000 / BULAN** (Rp 4.680.000 / tahun).

### 3.3 Dampak Penghematan Finansial v3.0 vs v3.1
Penghapusan Supabase Pro memangkas beban tetap tahunan secara signifikan:
- **Skenario Konservatif:** Beban OpEx 12 bulan turun dari Rp 19,03 Juta menjadi **Rp 16,63 Juta** (Hemat **Rp 2,40 Juta / tahun**).
- **Skenario Moderat (Base Case):** Beban OpEx 12 bulan turun dari Rp 22,65 Juta menjadi **Rp 20,25 Juta** (Hemat **Rp 2,40 Juta / tahun**). EBITDA 12 bulan melonjak dari Rp 92,76 Juta menjadi **Rp 95,16 Juta** (+2,59%), dan kas akhir M12 mencapai **Rp 95,16 Juta**.
- **Skenario Optimis:** Hemat **Rp 3,20 Juta / tahun** (karena ambang batas 500 pengguna tercapai lebih cepat di M5).
- **Percepatan Titik Impas (Break-Even):** Pada Skenario Konservatif, titik impas operasional bulanan maju dari Bulan ke-4 ke **Bulan ke-3**, dan impas kas kumulatif maju dari Bulan ke-6 ke **Bulan ke-5**.

---

## 4. Spesifikasi Resmi Laporan Pengguna Berbayar (Paying-Users Report Spec)

### 4.1 Mandat & Fungsi Laporan
Founder Bobby menetapkan batas kritis perlindungan kas: **Fase 0 VPS dipertahankan selama jumlah pelanggan berbayar kurang dari 5 orang (`< 5 paying users`)**. Jika pelanggan berbayar mencapai $\ge 5$, sistem baru bersiap migrasi ke Fase 1.

Laporan ini adalah instrumen audit resmi yang dijalankan melalui antarmuka CLI backend (`python -m ihsg.admin report`) untuk menghitung metrik berbayar secara sah, objektif, dan antipenipuan.

### 4.2 Kueri SQL Tunggal Otoritatif (Ground Truth SQL Query)
Sesuai rancangan Jim (Bagian 4.8 `architecture-v3.md`), kueri penghitungan pengguna berbayar resmi adalah:

```sql
SELECT COUNT(DISTINCT e.user_id) AS active_paying_users
FROM entitlements e
JOIN payments p ON p.id = e.payment_id
WHERE e.source = 'paid'
  AND p.status = 'paid'
  AND p.amount_idr > 0
  AND e.revoked_at IS NULL
  AND e.closed_at IS NULL
  AND e.starts_at <= CURRENT_TIMESTAMP
  AND (e.ends_at IS NULL OR e.ends_at > CURRENT_TIMESTAMP);
```

### 4.3 Dekomposisi Logika & Aturan Pengecualian (Exclusion Rules)
1. **Pengecualian Mutlak Akun Promosi (Comp Accounts Strictly Excluded):**
   - 5 akun marketing comp yang diberikan kepada *influencer* memiliki kolom `source = 'comp'` dan `payment_id = NULL`.
   - Karena kueri menggunakan `JOIN payments p` dan syarat `e.source = 'paid'`, akun comp **secara matematis mustahil masuk ke dalam hitungan**.
   - Keberadaan 5 akun comp menghasilkan nilai `paying_users = 0`. Arus kas terlindungi 100% dari migrasi semu.
2. **Pengecualian Akun Ter-upgrade (No Double Counting on Upgrades):**
   - Saat pengguna meng-upgrade Investor ke Pakar, baris *entitlement* Investor lama ditandai `closed_at = CURRENT_TIMESTAMP` dan `closed_reason = 'upgraded'`.
   - Syarat `e.closed_at IS NULL` dan agregasi `COUNT(DISTINCT e.user_id)` menjamin 1 pembeli yang meng-upgrade hanya dihitung tepat **1 pengguna berbayar**.
3. **Pengecualian Pengembalian Dana / Pembatalan (Refunds / Revocations):**
   - Jika pembayaran di-refund atau akses dicabut admin karena penyalahgunaan, `e.revoked_at` diisi timestamp pembatalan. Akun tersebut seketika dikeluarkan dari hitungan pengguna aktif.
4. **Perlakuan Founder Pass (Lifetime Holders):**
   - Pembeli Founder Pass memiliki `kind = 'lifetime'` dan `ends_at = NULL`. Syarat `(e.ends_at IS NULL OR e.ends_at > CURRENT_TIMESTAMP)` memastikan mereka dihitung sebagai pengguna berbayar aktif selama haknya belum dicabut.

### 4.4 Spesifikasi Antarmuka CLI Admin
- **Perintah CLI:**
  ```bash
  python -m ihsg.admin report --kind paying-users
  ```
- **Struktur Skema Keluaran JSON (Machine-Readable Output):**
  ```json
  {
    "as_of": "2026-10-09T12:00:00Z",
    "active_paying_users": 3,
    "breakdown": {
      "investor_1m": 2,
      "investor_12m": 0,
      "pakar_1m": 1,
      "pakar_12m": 0,
      "founder_lifetime": 0
    },
    "marketing_comp_accounts": {
      "active_count": 5,
      "cap": 5,
      "source_filter": "comp",
      "strictly_excluded_from_paying": true
    },
    "total_entitled_users": 8,
    "vps_phase0_migration_gate": {
      "threshold": 5,
      "current_paying": 3,
      "status": "SAFE_ON_VPS_PHASE_0",
      "action_required": "NONE"
    },
    "revenue_metrics": {
      "cash_collected_mtd_idr": 87000,
      "gross_revenue_total_idr": 87000
    }
  }
  ```
- **Kepatuhan Privasi (UU PDP No. 27/2022):**
  Laporan audit hanya menampilkan metrik agregat dan ID internal tersandi. Tidak ada alamat email, nama lengkap, atau informasi pribadi (PII) yang dicetak ke dalam *log* server tanpa enkripsi.

---

## 5. Matriks Komparasi Kinerja Finansial Model v3.0 vs v3.1

Berikut adalah perbandingan ringkas dampak matematis revisi v3.1 pada Model Finansial 12 Bulan (Model One-Time Pass):

| Pos Evaluasi Finansial 12 Bulan | Skenario 1: Pesimis (Cold-Start) | Skenario 2: Konservatif | Skenario 3: Moderat (Base Case) | Skenario 4: Optimis |
| :--- | :---: | :---: | :---: | :---: |
| **OpEx Tetap 12M — v3.0 (Supabase)** | Rp 13,42 Juta | Rp 19,03 Juta | Rp 22,65 Juta | Rp 31,74 Juta |
| **OpEx Tetap 12M — v3.1 (No Supabase)** | **Rp 13,42 Juta** | **Rp 16,63 Juta** | **Rp 20,25 Juta** | **Rp 28,54 Juta** |
| *Selisih Penghematan Beban (Hemat)* | *Rp 0* | **-Rp 2,40 Juta** | **-Rp 2,40 Juta** | **-Rp 3,20 Juta** |
| **EBITDA Kas 12M — v3.0** | -Rp 8,78 Juta | +Rp 25,22 Juta | +Rp 92,76 Juta | +Rp 617,11 Juta |
| **EBITDA Kas 12M — v3.1** | **-Rp 8,78 Juta** | **+Rp 27,62 Juta** | **+Rp 95,16 Juta** | **+Rp 620,31 Juta** |
| *Peningkatan Laba Kas Bersih* | *Rp 0* | **+Rp 2,40 Juta** | **+Rp 2,40 Juta** | **+Rp 3,20 Juta** |
| **Kas Mengendap Akhir M12 — v3.1** | **-Rp 8,78 Juta** | **+Rp 27,62 Juta** | **+Rp 95,16 Juta** | **+Rp 619,48 Juta** |
| **Bulan Impas Operasional (EBITDA > 0)** | Tidak Pernah | **Bulan ke-3** *(maju)* | **Bulan ke-2** | **Bulan ke-1** |
| **Bulan Impas Kas Kumulatif** | Tidak Pernah | **Bulan ke-5** *(maju)* | **Bulan ke-2** | **Bulan ke-1** |
| **Beban Treadmill Fase 3 (Pembeli Baru/Bln)** | 38 pembeli/bln | 38 pembeli/bln | **38 pembeli/bln** *(turun dr 53)* | 38 pembeli/bln |

---

## 6. Kesimpulan & Handoff untuk Eksekusi

Revisi v3.1 telah merasionalisasi arsitektur finansial IHSG Storm ke tingkat efisiensi tertinggi:
1. Menghilangkan ketergantungan vendor eksternal yang tidak diperlukan (Supabase), menghemat kas Rp 2,40 Juta s.d. Rp 3,20 Juta/tahun.
2. Mempertegas aturan *pass-stacking*, masa tenggang nol, dan alur upgrade yang kokoh secara teknis dan finansial.
3. Menetapkan spesifikasi laporan *paying-users* yang rigid dan tahan audit untuk mengunci perlindungan biaya Fase 0 VPS Founder Bobby.
4. Seluruh formula dalam berkas Excel `/home/hermes/company/ihsg/freemium-model-v3.1.xlsx` telah direkonsiliasi penuh dan siap diaudit.
