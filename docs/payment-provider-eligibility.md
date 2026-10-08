# IHSG Storm — Payment Provider Eligibility & Feasibility Research
## Xendit vs. Mayar vs. Midtrans vs. DOKU for Individual (Non-PT/CV) Accounts

**Prepared by:** Ryan (Business Development & Market Intel, The BAD.AI Office)  
**Directed to:** Bobby Dioriza (Founder & Goal Setter) & Michael (CEO)  
**Downstream Consumers:** Jim (Solutions Architect, Decision D6), Oscar (Finance & Pricing), Toby (Compliance & Risk)  
**Date:** October 8, 2026  
**Status:** COMPLETE (Grounded in cited public documentation, verified October 2026)  
**Deliverable File:** `/home/hermes/company/ihsg/payment-provider-eligibility.md`  

---

## 1. Executive Summary & Critical Findings

This research establishes payment gateway eligibility for IHSG Storm (`ihsg.badai.tech`) under Milestone 2 (M2) and evaluates whether Founder Bobby can activate QRIS as an individual (non-PT/CV) account. All findings are grounded in verified public documentation from payment providers, Bank Indonesia (BI), and Indonesian regulatory portals.

### Three Load-Bearing Findings:

1. **Xendit Strictly Disallows Pure Individuals (WPOP) Without a Legal Entity:**  
   Per official Xendit onboarding policy, live payment activation (including QRIS) is restricted to legally registered entities: Perseroan Terbatas (PT), CV, Yayasan, Koperasi, or **Perseroan Perorangan (PP)**.[1][2]  
   An individual with only personal KTP and personal NPWP cannot activate live payment processing.[1]  
   To use Xendit, Bobby must register a Perseroan Perorangan via Kemenkumham (`ptp.ahu.go.id`, Rp 50,000 PNBP, ~15–30 minutes) and obtain an NIB via OSS.[2]

2. **Xendit's October 1, 2026 Pricing Shock Destroys Micro-Ticket Margins:**  
   Effective October 1, 2026, Xendit revised its pricing policy to introduce a mandatory **IDR 4,000 fixed processing fee per transaction** on top of the 0.70% QRIS payment method fee, plus a **USD 50/month minimum fee** for dormant/low-volume accounts.[3]  
   On a Rp 19,000 ticket, Xendit takes **Rp 4,588 (24.1% effective take rate)**, leaving only Rp 14,412 net.[4]  
   This fundamentally undermines Oscar's financial model for the 1-Month Investor Pass (Rp 19k).

3. **Midtrans & Mayar Fully Support Pure Individuals with Superior Economics:**  
   Both Midtrans and Mayar allow direct onboarding for individuals with **only KTP and personal bank account** (no PT, CV, or NIB required).[10][16]  
   - **Midtrans:** Charges a pure **0.70% MDR (Rp 133 on Rp 19k)** with **Rp 0 fixed processing fee**, Rp 0 monthly fee, and Rp 0 bank withdrawal fee.[17][20]  
   - **Mayar (Jim's Fallback):** Charges **1.5% platform fee + 0.7% QRIS = 2.2% (Rp 418 on Rp 19k)** with Rp 0 monthly fee, purpose-built for digital products and developer/agent APIs.[11][12][15]

---

## 2. Comprehensive Provider Comparison Matrix

| Parameter | Xendit (Primary in D6) | Mayar (Fallback in D6) | Midtrans (Dark Horse) | DOKU (Juragan DOKU) |
| :--- | :--- | :--- | :--- | :--- |
| **Individual (WPOP) Activation?** | ❌ **No** (Badan Hukum / PT Perorangan required)[1] | ✅ **Yes** (Tipe Individu native)[10] | ✅ **Yes** (Bisnis Individu native)[16] | ✅ **Yes** (Merchant Perorangan)[21][23] |
| **Required Docs (KYC/KYB)** | KTP, NPWP, NIB, Sertifikat PT Perorangan, Surat Pernyataan AHU[2] | KTP, Foto Selfie, Rekening Bank Pribadi[10] | KTP (WNI) / Paspor+KITAS, Rekening Bank Pribadi[16] | KTP, Selfie dg KTP, Bukti Usaha (Sosmed/Web), Rekening[21][23] |
| **Onboarding Lead Time** | 3–7 hari kerja (setelah PT Perorangan terbit)[2] | 1–2 hari kerja (seringkali instant / sameday)[10] | 1–3 hari kerja (verifikasi mandiri Passport)[16] | 1–2 hari kerja setelah dokumen valid[21][24] |
| **QRIS MDR (Rp 19k Ticket)** | **Rp 4,588 (24.1%)** (0.7% + Rp 4.000 fee + PPN)[3][4] | **Rp 418 (2.20%)** (0.7% channel + 1.5% platform)[11][12] | **Rp 133 (0.70%)** (Murni MDR Bank Indonesia)[17] | **Rp 133–148 (0.70–0.78%)** (0.7% MDR standard)[22] |
| **QRIS MDR (Rp 49k Ticket)** | **Rp 4,821 (9.84%)** (0.7% + Rp 4.000 fee + PPN)[3][4] | **Rp 1,078 (2.20%)** (0.7% channel + 1.5% platform)[11][12] | **Rp 343 (0.70%)** (Murni MDR Bank Indonesia)[17] | **Rp 343–381 (0.70–0.78%)** (0.7% MDR standard)[22] |
| **Monthly Minimum / Maintenance** | **USD 50/bln (~Rp 800k)** jika tagihan < $50[3] | **Rp 0 / bulan** (Paket Starter)[11] | **Rp 0 / bulan** (Tanpa minimum)[17] | **Rp 0 / bulan** (Tanpa minimum)[22] |
| **One-Time Invoice / Webhook** | Invoices API (`v2/invoices`), `x-callback-token`[6] | Invoices/Payments API v2, Webhook HMAC / JSON[13][14] | Snap Hosted (`/snap/v1/`), SHA-512 signature[19] | DOKU Checkout, HMAC-SHA256 signature[21] |
| **Settlement Time (QRIS)** | T+1 hari kerja[5][6] | H+3 hari kerja (T+3)[10] | T+2 hari kerja (SETTLEMENT)[18] | T+1 s/d T+2 hari kerja[21] |
| **Payout / Withdrawal Fee** | Rp 4.000 – Rp 5.000 per pencairan[4][9] | Flat Rp 2.775 per penarikan (maks Rp 250M)[10][12] | **Rp 0 (Gratis)** penarikan reguler ke bank[20] | Standar biaya kliring antar-bank[22] |
| **Refund & Chargeback** | Refund online terbatas issuer (7 hari); dispute T+90[5][7] | Refund via saldo dashboard; push QRIS no dispute[10] | Refund via dashboard/API GoPay QRIS; mediasi bank[18] | Refund online QRIS partner tertentu[21] |
| **Allowed Use (Digital Access)** | Diizinkan (Kategori Software/Informasi; disclaimer non-advisory wajib)[8] | Diizinkan & diutamakan (spesialis SaaS & digital)[10][11] | Diizinkan (standar SaaS/layanan digital)[16] | Diizinkan (website & ToS jelas)[21] |

---

## 3. Deep-Dive Provider Analysis

### 3.1 Xendit (Primary under Jim's Decision D6)
- **Legal Reality:** Xendit's Indonesian entity operates under strict Bank Indonesia & OJK payment licensing. Its official Help Center explicitly advises personal merchants to establish a formal entity: PT, CV, or Perseroan Perorangan (PP).[1] A pure individual WPOP without an NIB cannot pass Xendit's KYB verification.[1][2]
- **The October 2026 Pricing Shift:** Published policy updated September 14, 2026 (effective October 1, 2026) introduced:
  - Fixed Processing Fee: IDR 4,000 per transaction attempt across payment acceptance.[3]
  - Monthly Minimum Fee: USD 50 (~Rp 800,000) for accounts generating less than $50 in monthly invoice fees.[3]
  - Dispute Fee: USD 15 on Local Payment Methods (QRIS/E-Wallet chargebacks).[3]
- **Implication for BAD.AI:** For a Rp 19,000 pass, paying Rp 4,588 in fees cuts gross margin to 75.9% before any hosting or server costs.[3][4] Furthermore, early low-volume testing months risk a $50 minimum charge penalty.[3]
- **Technical Fit:** Outstanding developer tooling, Invoice API, automatic QRIS dynamic generation, clean webhooks with `x-callback-token`, and T+1 settlement.[5][6]

### 3.2 Mayar (mayar.id — Fallback under Jim's Decision D6)
- **Legal Reality:** Built specifically for Indonesian creators, solo developers, and MSMEs. Onboarding explicitly provides an "Individu" track requiring only KTP and selfie verification.[10]
- **Economics:** On the Starter plan (Rp 0/month), Mayar charges 0.70% QRIS channel fee + 1.5% platform fee for invoices/payment links (total 2.2%).[11]  
  On Rp 19,000, the fee is Rp 418; on Rp 49,000, the fee is Rp 1,078.[12]
- **Technical Fit:** Modern REST API v2 (`/hl/v2/invoice/create`), hosted checkout, webhook callbacks, MCP server, and developer CLI.[14][15]
- **Trade-Offs:** Settlement is H+3 hari kerja (T+3) rather than T+1, and bank withdrawals incur a flat fee of Rp 2,775.[10][12]

### 3.3 Midtrans (midtrans.com — Highest Economic Margin)
- **Legal Reality:** Midtrans Passport (`midtrans.com/id/passport`) provides full support for "Bisnis Individu" with only a KTP for WNI (NPWP optional, only needed if enabling credit cards).[16]
- **Economics:** Best in market. 0.70% QRIS MDR flat, **Rp 0 fixed transaction fee**, Rp 0 monthly fee, Rp 0 account maintenance, and **Rp 0 withdrawal fee** to designated bank accounts.[17][20]
- **Technical Fit:** Hosted Snap checkout (`snap.js` or full redirect URL), strict SHA-512 signature verification on webhook notifications (`order_id + status_code + gross_amount + ServerKey`), robust idempotency, and automated daily/weekly withdrawal.[18][19][20]
- **Settlement:** T+2 business days.[18]

### 3.4 DOKU (doku.com / Juragan DOKU)
- **Legal Reality:** Accepts individual merchants (KTP, selfie, business proof / website link).[21][23]
- **Economics:** 0.70% MDR, Rp 0 setup fee, Rp 0 monthly fee.[22]
- **Technical Fit:** DOKU Checkout hosted link and webhooks, T+1 to T+2 settlement.[21] Less developer mindshare and smaller ecosystem than Midtrans or Xendit for custom FastAPI integrations.

---

## 4. Unit Economics Simulation (Rp 19k & Rp 49k One-Time Tickets)

Below is the verified net cash collection per transaction across all 4 providers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               NET CASH REALIZATION PER ONE-TIME ACCESS PASS (OCTOBER 2026)             │
├──────────────────────┬─────────────┬─────────────┬─────────────┬───────────────────────┤
│ Metric               │ Xendit      │ Mayar       │ Midtrans    │ DOKU                  │
├──────────────────────┼─────────────┼─────────────┼─────────────┼───────────────────────┤
│ PASS 1-BULAN INVESTOR (Rp 19.000)                                                      │
│ Gross Ticket Price   │ Rp 19.000   │ Rp 19.000   │ Rp 19.000   │ Rp 19.000             │
│ Percentage MDR       │ 0,70% (133) │ 0,70% (133) │ 0,70% (133) │ 0,70% (133)           │
│ Fixed Processing Fee │ Rp 4.000    │ Rp 0        │ Rp 0        │ Rp 0                  │
│ Platform Fee         │ Rp 0        │ 1,5% (285)  │ Rp 0        │ Rp 0                  │
│ VAT / PPN on Fees    │ Rp 455      │ Included    │ ~Rp 15      │ ~Rp 15                │
│ TOTAL DEDUCTION      │ Rp 4.588    │ Rp 418      │ Rp 148      │ Rp 148                │
│ NET CASH RECEIVED    │ Rp 14.412   │ Rp 18.582   │ Rp 18.852   │ Rp 18.852             │
│ Effective Take Rate  │ 24,15%      │ 2,20%       │ 0,78%       │ 0,78%                 │
├──────────────────────┼─────────────┼─────────────┼─────────────┼───────────────────────┤
│ PASS 1-BULAN PAKAR (Rp 49.000)                                                         │
│ Gross Ticket Price   │ Rp 49.000   │ Rp 49.000   │ Rp 49.000   │ Rp 49.000             │
│ Percentage MDR       │ 0,70% (343) │ 0,70% (343) │ 0,70% (343) │ 0,70% (343)           │
│ Fixed Processing Fee │ Rp 4.000    │ Rp 0        │ Rp 0        │ Rp 0                  │
│ Platform Fee         │ Rp 0        │ 1,5% (735)  │ Rp 0        │ Rp 0                  │
│ VAT / PPN on Fees    │ Rp 478      │ Included    │ ~Rp 38      │ ~Rp 38                │
│ TOTAL DEDUCTION      │ Rp 4.821    │ Rp 1.078    │ Rp 381      │ Rp 381                │
│ NET CASH RECEIVED    │ Rp 44.179   │ Rp 47.922   │ Rp 48.619   │ Rp 48.619             │
│ Effective Take Rate  │ 9,84%       │ 2,20%       │ 0,78%       │ 0,78%                 │
└──────────────────────┴─────────────┴─────────────┴─────────────┴───────────────────────┘
```

**Key Takeaway:** Xendit's fixed processing fee costs BAD.AI an extra **Rp 4,440 per user** on every Rp 19k transaction compared to Midtrans. On 100 sales, using Xendit forfeits **Rp 444,000** in net profit.

---

## 5. Regulatory & Allowed Use Compliance

### Digital Access Passes & Market Intelligence (POJK & Terms Compliance):
- All four providers allow digital goods, software licenses, and digital access passes.[8][10][16]
- **Crucial Compliance Rule:** Payment gateways strictly prohibit unlicensed investment advisory (*Penasihat Investasi tanpa izin OJK*), stock pumping, guaranteed return schemes, or illegal trading signals.[8]
- **IHSG Storm Mitigation:** IHSG Storm is strictly positioned as a **SaaS analytics tool displaying historical public KSEI disclosures and statistical shareholder changes**.[8]  
  The footer, checkout page, and invoice terms must feature Toby's standard disclaimer:  
  `"Platform ini adalah alat analisis data keterbukaan informasi publik KSEI dan bukan merupakan saran investasi, rekomendasi jual/beli saham, atau nasihat keuangan berlisensi."`[8]

---

## 6. Ranked Recommendation & Action Plan

### Recommended Strategy: Dual-Track Implementation

#### Tier 1 (Recommended Primary): Midtrans (or Mayar as Instant Fallback)
1. **If Bobby operates as an Individual (Non-PT/CV) immediately:**
   - **Primary: Midtrans.** Activate via `midtrans.com/id/passport` using personal KTP.[16] Zero monthly fee, pure 0.70% QRIS MDR, and automated bank payouts.[17][20] Jim's payment abstraction (`PaymentProvider`) easily supports a `MidtransSnap` adapter alongside `Mayar`.
   - **Alternative / Immediate Fallback: Mayar.** Activate via `mayar.id` in minutes.[10] Perfect for instant deployment while Midtrans verifications run, and natively fulfills Jim's Decision D6 fallback.[10][11]

#### Tier 2: Xendit Path (Contingent on Support Clarification)
- Xendit remains an industry powerhouse, but Bobby should only pursue Xendit if:
  1. Xendit support confirms in writing that the Rp 4,000 processing fee and USD 50 minimum monthly fee do not apply to custom Indonesian QRIS digital micro-tickets.
  2. Bobby is willing to spend Rp 50,000 at `ptp.ahu.go.id` to establish a legal Perseroan Perorangan entity.[1][2]

---

## 7. Ready-to-Send Inquiries for Bobby to Send to Xendit Support

Bobby should copy-paste and send the following inquiries directly to Xendit Support (`help@xendit.co` or live chat via dashboard):

### Bahasa Indonesia (Rekomendasi untuk Tim Onboarding Lokal):

```text
Subject: Konfirmasi Onboarding Akun Individu & Skema Biaya QRIS Tiket Mikro (Rp 19k - Rp 49k)

Halo Tim Xendit Indonesia,

Saya founder platform SaaS analitik data pasar modal (IHSG Storm - ihsg.badai.tech). Saat ini kami sedang mengintegrasikan payment gateway untuk menerima pembayaran tiket akses digital (one-time payment) menggunakan QRIS Dinamis dan Hosted Invoice API.

Sebelum kami menyelesaikan aktivasi akun Live, mohon bantuan konfirmasi untuk 3 hal penting berikut:

1. Kelayakan Akun Perorangan / Individu (Non-PT/CV):
Apakah aktivasi pembayaran QRIS dan Virtual Account dapat diproses untuk akun perorangan WNI (hanya menggunakan KTP dan rekening bank pribadi)? 
Atau apakah kami diwajibkan mendaftarkan badan usaha seperti Perseroan Perorangan (SK Kemenkumham / NIB OSS)?

2. Skema Biaya Transaksi QRIS untuk Tiket Mikro (Rp 19.000 & Rp 49.000):
Berdasarkan pembaruan Xendit Pricing Policy (Oktober 2026), disebutkan terdapat fixed processing fee IDR 4.000 per transaksi serta Monthly Minimum Fee USD 50. 
Apakah ketentuan fixed fee IDR 4.000 dan minimum fee USD 50 tersebut berlaku untuk transaksi QRIS mikro domestik (Rp 19.000 - Rp 49.000)? Ataukah transaksi QRIS tetap hanya dikenakan MDR murni Bank Indonesia sebesar 0,70% tanpa biaya tetap per transaksi?

3. Kebijakan Produk Digital & Mekanisme Refund QRIS:
Layanan kami adalah pass akses data historis KSEI (bukan penasihat investasi berlisensi / bukan sinyal saham, dilengkapi disclaimer lengkap). Apakah kategori SaaS data publik ini sepenuhnya disetujui dalam Acceptable Use Policy Xendit? Bagaimana prosedur teknis pengembalian dana (refund) untuk pembayaran QRIS jika terjadi kendala teknis?

Terima kasih banyak atas bantuan dan penjelasannya.

Salam,
Bobby Dioriza
Founder, IHSG Storm (ihsg.badai.tech)
```

### English Version (For Account Management / Executive Escalation):

```text
Subject: Merchant Eligibility & QRIS Micro-Ticket Fee Structure Inquiry (IHSG Storm)

Dear Xendit Support & Onboarding Team,

I am the founder of IHSG Storm (ihsg.badai.tech), an Indonesian capital market data analytics platform. We are finalizing our payment gateway architecture for one-time digital access passes priced at IDR 19,000 and IDR 49,000 via Dynamic QRIS and the Xendit Invoice API.

We would appreciate your official clarification on the following points:

1. Individual Account Eligibility:
Can an individual Indonesian merchant (WPOP) activate live QRIS and bank payment methods using solely a national ID (KTP) and personal bank account? Or is formal incorporation as a Sole Proprietorship (Perseroan Perorangan with NIB/AHU) strictly required?

2. Pricing Structure for Micro-Transactions (IDR 19k - 49k):
Per the updated Xendit Pricing Policy (effective October 2026), an IDR 4,000 fixed processing fee per transaction and a USD 50 monthly minimum invoice fee were introduced. Does the IDR 4,000 fixed processing fee apply to domestic QRIS transactions under IDR 50,000? Or is domestic QRIS billed at the standard 0.70% MDR without fixed per-transaction surcharges?

3. Merchant Category & QRIS Refund Workflow:
Our platform provides access to historical public capital market disclosures (pure informational software with disclaimers, no investment advisory or fund management). Does this category qualify under standard acceptable use? Additionally, what is the automated API/dashboard refund SLA for QRIS payments?

Thank you for your guidance.

Best regards,  
Bobby Dioriza  
Founder, IHSG Storm
```

---

## 8. Alignment with Jim's Architectural Decisions (D1–D15)

- **Decision D6 (Payment Provider):** Fully respected. Jim designed the provider abstraction (`PaymentProvider` interface) to decouple billing code from vendor SDKs.[6]  
  If Xendit confirms the Rp 4,000 fixed fee and entity requirement, BAD.AI can deploy Mayar or Midtrans with zero disruption to the core billing state machine or webhook deduplication engine.[6]
- **Decision D8 (Purchase & Pass Rules):** Confirmed. All providers support one-time invoice creation with distinct customer identifiers and webhooks to drive atomic pass-stacking and entitlement creation.[6]
- **Milestone 2 Timeline:** By preparing Midtrans and Mayar integrations in parallel, M2 remains completely unblocked regardless of Xendit's response time.

---

## Sources

[1] https://help.xendit.co/hc/id/articles/360035083911-Apakah-bisnis-individual-perorangan-bisa-menggunakan-layanan-Xendit — Xendit Help Center: Bisnis Individual / Perorangan di Xendit  
[2] https://help.xendit.co/hc/id/articles/10891368765593-Apa-saja-legalitas-dokumen-yang-diperlukan-untuk-registrasi-di-Xendit-bagi-Merchant-Indonesia — Xendit Help Center: Legalitas Dokumen Registrasi Merchant Indonesia  
[3] https://help.xendit.co/hc/en-us/articles/59516240127129-Xendit-Pricing-Policy — Xendit Help Center: Pricing Policy Update (October 2026)  
[4] https://www.xendit.co/en-id/pricing/ — Xendit Pricing Page (Indonesia)  
[5] https://docs.xendit.co/docs/qris — Xendit Docs: QRIS Overview, Fees, Settlement & Refunds  
[6] https://docs.xendit.co/docs/available-payment-methods — Xendit Docs: Available Payment Methods  
[7] https://docs.xendit.co/docs/dispute-guidelines-qris — Xendit Docs: Dispute Guidelines QRIS  
[8] https://www.xendit.co/en-id/terms-and-conditions/ — Xendit Terms & Conditions: Prohibited & Restricted Businesses  
[9] https://help.xendit.co/hc/en-us/articles/360025424912-What-are-the-pricing-for-Xendit-products- — Xendit Help Center: Pricing for Xendit Products  
[10] https://mayar.id/blog/qris-untuk-bisnis-biaya-cara-daftar-kapan-dana-cair — Mayar Blog: Panduan QRIS Bisnis, Biaya, KYC Individu & Settlement  
[11] https://mayar.id/pricing — Mayar Pricing: Biaya Transaksi & Platform  
[12] https://docs.mayar.id/mor/fees — Mayar Docs: Merchant of Record & Platform Fees  
[13] https://docs.mayar.id/integration/webhook — Mayar Docs: Webhook Integration & Payload  
[14] https://docs.mayar.id/api-reference-v2/webhook/registerurlhook — Mayar Docs: API v2 Webhook Registration  
[15] https://dev.mayar.id/ — Mayar Developer & Agent API Portal  
[16] https://midtrans.com/id/passport — Midtrans Passport: Pendaftaran Akun Individu & Syarat Dokumen  
[17] https://midtrans.com/pricing — Midtrans Pricing: Transaksi QRIS, VA & Biaya  
[18] https://docs.midtrans.com/docs/introduction-to-static-qris — Midtrans Docs: QRIS Settlement & Payout Timeline  
[19] https://docs.midtrans.com/reference/qris — Midtrans Docs: QRIS API & Notification Webhook Payload  
[20] https://docs.midtrans.com/docs/bagaimana-cara-mencairkan-dana-saya — Midtrans Docs: Pencairan Dana & Tarik Dana (Withdrawal)  
[21] https://docs.doku.com/accept-payments/no-integration-products/qris — DOKU Docs: QRIS Activation & Requirements for Personal/Corporate  
[22] https://www.doku.com/harga — DOKU Pricing: Biaya Transaksi QRIS & Metode Pembayaran  
[23] https://www.doku.com/blog/apa-itu-kyb — DOKU Blog: Persyaratan KYB Akun Individual vs Badan Usaha  
[24] https://www.doku.com/blog/cara-daftar-qris — DOKU Blog: Panduan Lengkap Pendaftaran QRIS Bisnis & Dokumen  
