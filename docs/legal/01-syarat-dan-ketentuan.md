# Syarat dan Ketentuan Layanan (Terms of Service) — IHSG Storm

**Status Dokumen:** DRAFT (Menunggu Tinjauan Toby & Persetujuan Bobby / Konsultan Hukum)  
**Terakhir Diperbarui:** 8 Oktober 2026  
**Versi:** 1.0.0-DRAFT  
**Penyusun:** Erin (Client Success & Delivery PM)  
**Pemberitahuan:** *Dokumen ini merupakan draf operasional dan BUKAN merupakan nasihat hukum formal (not legal advice).*

---

## 1. Pendahuluan dan Penerimaan Ketentuan

Selamat datang di **IHSG Storm** (`ihsg.badai.tech`), platform perangkat lunak analitik dan visualisasi data keterbukaan kepemilikan saham publik di Indonesia yang dikembangkan dan dioperasikan oleh **BAD.AI** di bawah pengawasan Founder Bobby Dioriza ("Kami", "Pengelola", atau "IHSG Storm").

Dengan mengakses situs web, mendaftarkan akun melalui Google OAuth/Firebase Authentication, atau membeli pass akses berbayar, Anda ("Pengguna" atau "Pelanggan") menyatakan bahwa Anda telah membaca, memahami, dan menyetujui untuk terikat secara hukum oleh Syarat dan Ketentuan ini ("Ketentuan"). Apabila Anda tidak menyetujui salah satu bagian dari Ketentuan ini, Anda tidak diperkenankan mengakses atau menggunakan Layanan IHSG Storm.

---

## 2. Definisi Layanan dan Sifat Informasi Publik

1. **Layanan:** Dashboard web interaktif, alat visualisasi grafik kepemilikan saham, detektor perubahan kepemilikan antar-bulan (Month-on-Month diffs), bot notifikasi Telegram, dan antarmuka ekspor data yang disediakan oleh IHSG Storm.
2. **Sumber Data KSEI & BEI:** Seluruh data pemegang saham di atas 1% (>1%) bersumber langsung dari publikasi keterbukaan informasi berkala PT Kustodian Sentral Efek Indonesia (KSEI) dan PT Bursa Efek Indonesia (BEI) yang bersifat publik.
3. **Data Historis (Snapshot):** Data kepemilikan saham disediakan dalam bentuk rekaman historis bulanan (*snapshot as-of date*) per tanggal penutupan buku KSEI, bukan aliran data transaksi per detik (*real-time tick-by-tick feed*).
4. **Data Harga Saham:** Harga saham yang ditampilkan bersumber dari penyedia data pasar pihak ketiga (Yahoo Finance / EOD feed) dengan jeda waktu (*delayed price*) sekitar 15 menit atau diperbarui pada penutupan hari bursa (End-of-Day / EOD).

---

## 3. Penafian Investasi Mutlak (OJK Statutory Disclaimer)

1. **BUKAN PENASIHAT INVESTASI:** IHSG STORM BUKAN MERUPAKAN PERUSAHAAN EFEK, MANAJER INVESTASI, PENASIHAT INVESTASI, ATAU LEMBAGA KEUANGAN BERLISENSI OTORITAS JASA KEUANGAN (OJK).
2. **Kepatuhan POJK No. 6/2026 & UU P2SK No. 4/2023:** Berdasarkan POJK No. 6 Tahun 2026 tentang Perilaku Penyampai Informasi Sektor Jasa Keuangan jo UU No. 4 Tahun 2023 (UU P2SK) Pasal 237, seluruh fitur, grafik, metrik akumulasi/distribusi, dan informasi yang disajikan murni ditujukan untuk **tujuan edukasi, penelitian independen, dan transparansi data publik**.
3. **Bukan Rekomendasi Jual/Beli:** Tidak ada konten di IHSG Storm yang dapat ditafsirkan sebagai sinyal trading (*trading signals*), anjuran, rekomendasi beli/jual (*buy/sell recommendations*), panduan masuk/keluar pasar, atau proyeksi target harga saham.
4. **Tanggung Jawab Pribadi (DYOR):** Seluruh keputusan investasi dan risiko keuntungan maupun kerugian finansial yang timbul adalah tanggung jawab mutlak pribadi Pengguna (*Do Your Own Research*). Pengelola tidak bertanggung jawab atas kerugian langsung maupun tidak langsung akibat keputusan yang diambil berdasarkan data di platform ini.

---

## 4. Akun Pengguna, Keamanan, dan Akses

1. **Pendaftaran Akun:** Akses terhadap fitur personalisasi dan berbayar mewajibkan autentikasi akun Google resmi melalui Firebase Authentication.
2. **Keaslian Identitas:** Pengguna wajib menggunakan akun Google yang valid milik sendiri. Pengguna bertanggung jawab penuh atas menjaga kerahasiaan perangkat dan sesi login masing-masing.
3. **Larangan Berbagi Akun:** Pass akses diberikan secara personal kepada Pengguna terdaftar. Pengguna dilarang membagikan kredensial akses, mendistribusikan token sesi, atau menyewakan akun kepada pihak ketiga atau grup komunitas publik.
4. **Pembatasan Sesi & Kuota (Rate Limiting):** Demi menjaga stabilitas peladen dan mencegah ekstraksi data massal yang melanggar hak, Pengelola menerapkan batasan laju permintaan (*rate limits*) dan kuota ekspor data CSV berkala (misal: maksimal 50 ekspor berkas/bulan untuk tier Pro).

---

## 5. Model Pembayaran: One-Time Access Pass (Tanpa Auto-Renew)

Sesuai arahan arsitektur komersial (Keputusan D8 & Oscar-Jim Freemium v3), IHSG Storm menerapkan **Model Akses Sekali Bayar Berjangka (Fixed-Term One-Time Passes)**:

1. **Tanpa Perpanjangan Otomatis (No Auto-Renew):**
   - Layanan TIDAK mendebet rekening bank, e-wallet, atau kartu kredit Pengguna secara otomatis pada akhir masa berlaku pass (*no silent recurring auto-debit*).
   - Pengguna memiliki kendali penuh untuk memperpanjang pass secara manual sesuai kebutuhan.
2. **Tingkat Akses (Tiers) dan Durasi:**
   - **Paket Gratis (Pemula):** Akses Rp 0 permanen. Menampilkan data snapshot bulan terakhir, limit pencarian dasar, tanpa histori MoM.
   - **Paket Investor (Ritel):**
     - Pass 1-Bulan (30 Hari): Rp 19.000 sekali bayar.
     - Pass 12-Bulan (365 Hari): Rp 190.000 sekali bayar (hemat 2 bulan).
   - **Paket Pakar / Trader (Pro):**
     - Pass 1-Bulan (30 Hari): Rp 49.000 sekali bayar.
     - Pass 12-Bulan (365 Hari): Rp 490.000 sekali bayar (hemat 2 bulan).
   - **Founder Pass (Lifetime Pro - Terbatas):** Rp 599.000 sekali bayar, dibatasi ketat maksimal 50 kursi pertama di platform.
3. **Mata Uang & Pajak:** Seluruh tarif tercantum dalam Rupiah (IDR). Sesuai regulasi perpajakan UMKM (PP 55/2022) dan status non-PKP pengelola, harga yang tercantum adalah harga bersih final tanpa pungutan PPN 11%.

---

## 6. Aturan Penumpukan Pass (Stacking) dan Peningkatan Paket (Upgrade)

Sesuai Keputusan Jim D8 dan Oscar-Jim v3, sistem mengatur hak akses sebagai berikut:

1. **Penumpukan Pass Sejenis (Same-Tier Stacking):**
   - Pembelian pass tambahan pada tier yang sama sebelum masa aktif berakhir akan **menambah (memperpanjang) masa berlaku** secara kumulatif dari tanggal kedaluwarsa terakhir.
2. **Pemblokiran Pembelian Tier Lebih Rendah (Lower-Tier Block):**
   - Pengguna dengan pass aktif tier lebih tinggi (Pakar) tidak dapat membeli pass tier lebih rendah (Investor) hingga masa aktif tier Pakar berakhir, guna mencegah konflik hak akses (*entitlement collision*).
3. **Peningkatan Paket (Upgrade Flow — Pay-the-Difference):**
   - **Pass 1-Bulan (Dalam 7 Hari Pertama):** Pengguna Investor dapat beralih ke Pakar dengan membayar selisih harga sebesar **Rp 30.000** (Rp 49.000 - Rp 19.000). Masa berlaku di-reset menjadi 30 hari penuh tier Pakar sejak tanggal transaksi upgrade berhasil.
   - **Pass 12-Bulan (Tahunan):** Pengguna Investor Tahunan dapat upgrade ke Pakar Tahunan dengan membayar prorata sisa bulan penuh dikalikan **Rp 25.000 / bulan**. Tanggal jatuh tempo akhir tetap sinkron dengan pass awal.
4. **Kedaluwarsa Akses (GRACE_DAYS = 0):**
   - Pada saat tanggal masa aktif berakhir ($H+0$), akses ke fitur berbayar (histori MoM, filter akumulasi, alert Telegram, kuota ekspor) seketika dinonaktifkan.
   - Akun Pengguna otomatis kembali ke tier **Gratis (Pemula)**. Data riwayat watchlist yang tersimpan tidak akan dihapus.
5. **Diskon Loyalitas Perpanjangan Cepat (Loyalty Renewal):**
   - Pembelian pass baru dalam kurun waktu $\le 7$ hari pasca-kedaluwarsa berhak atas potongan harga loyalitas (diskon Rp 5.000 untuk pass 1-bulan atau 10% untuk pass 12-bulan).

---

## 7. Ketentuan Akun Pemasaran (Marketing Comp Accounts)

1. Pengelola berhak memberikan akses gratis khusus (Akun Comp Pakar, 90 hari) kepada maksimal 5 perwakilan komunitas/mitra ulasan terpilih (Keputusan D9).
2. Akun Comp diberikan secara administratif (*bypass payment gateway*) dan tunduk pada batas anti-penyalahgunaan (kuota ekspor 50 berkas/bulan dan pemantauan aktivitas wajar).
3. Pengelola berhak mencabut akses Comp sewaktu-waktu apabila ditemukan indikasi penyalahgunaan atau pelanggaran Ketentuan ini.

---

## 8. Larangan Penggunaan (Acceptable Use Policy)

Pengguna dilarang keras untuk:
1. Melakukan web scraping, crawling, pengikisan otomatis, atau ekstraksi massal terhadap API, database, atau aset internal IHSG Storm tanpa izin tertulis resmi Pengelola.
2. Merekayasa balik (*reverse engineering*), membongkar, mendekompilasi, atau mendistribusikan ulang kode sumber aplikasi atau dataset internal.
3. Menyalahgunakan platform untuk mempublikasikan klaim palsu, pom-pom saham, manipulasi pasar bursa, atau menyebarkan hoaks pasar modal.
4. Melakukan tindakan apapun yang membebani infrastruktur server secara berlebihan (misal: serangan DDoS, flooding request).

---

## 9. Hak Kekayaan Intelektual

Seluruh hak cipta, merek dagang, desain tata letak UI, kode pemrograman, arsitektur skrip normalisasi data, dan visualisasi grafik adalah milik sah BAD.AI dan Founder Bobby Dioriza. Data mentah keterbukaan informasi KSEI/BEI tetap merupakan data milik publik sesuai ketentuan regulator terkait.

---

## 10. Pengakhiran dan Penangguhan Layanan

Pengelola berhak menangguhkan atau menghentikan akses Pengguna secara sepihak dan seketika tanpa kompensasi apabila Pengguna terbukti melanggar Ketentuan Layanan ini, melakukan kecurangan pembayaran, atau melakukan tindakan melawan hukum yang merugikan ekosistem IHSG Storm.

---

## 11. Perubahan Ketentuan Layanan

Pengelola berhak memperbarui atau memodifikasi Ketentuan Layanan ini sewaktu-waktu. Perubahan material akan diumumkan melalui pengumuman di situs web atau email terdaftar minimal 7 (tujuh) hari sebelum diberlakukan. Penggunaan Layanan yang berkelanjutan setelah tanggal efektif perubahan menandakan persetujuan Anda terhadap Ketentuan yang diperbarui.

---

## 12. Hukum yang Berlaku dan Penyelesaian Sengketa

Ketentuan ini diatur dan ditafsirkan sesuai dengan hukum Republik Indonesia. Segala perselisihan yang timbul sehubungan dengan pelaksanaan Ketentuan ini diselesaikan terlebih dahulu melalui musyawarah untuk mufakat. Apabila kesepakatan tidak tercapai dalam waktu 30 (tiga puluh) hari kalender, sengketa akan diselesaikan melalui yurisdiksi Pengadilan Negeri Jakarta Selatan.

---

## 13. Kontak dan Saluran Bantuan

Untuk pertanyaan, bantuan teknis, atau permintaan klarifikasi terkait Ketentuan Layanan ini, silakan menghubungi Tim Client Success kami:
- **Email:** `support@badai.tech`
- **Help Center & Formulir In-App:** `ihsg.badai.tech/#/faq`
- **Alamat Operasional:** BAD.AI Office, Jakarta, Indonesia
