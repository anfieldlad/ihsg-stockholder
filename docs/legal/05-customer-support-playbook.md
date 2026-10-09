# Customer Support Playbook & SOP Penanganan Tiket — IHSG Storm
## Panduan Operasional Tim Client Success (Erin & Bobby)

**Status Dokumen:** DRAFT (Menunggu Tinjauan Toby & Persetujuan Bobby)  
**Terakhir Diperbarui:** 8 Oktober 2026  
**Versi:** 1.0.0-DRAFT  
**Penyusun:** Erin (Client Success & Delivery PM)  
**Pemberitahuan:** *Dokumen operasional internal One-Person Company (OPC) BAD.AI.*

---

## 1. Filosofi & Nada Komunikasi Dukungan (Brand Voice)

Sebagai garda terdepan layanan IHSG Storm (`ihsg.badai.tech`), komunikasi dukungan pelanggan harus mencerminkan karakter:
- **Hangat & Ramah (Warm):** Menyapa pengguna dengan santun dan bersahabat.
- **Empatis (Empathetic):** Memahami kebingungan atau kekhawatiran pengguna, terutama menyangkut kendala pembayaran atau validitas data.
- **Jelas & Transparan (Clear):** Menjelaskan fakta teknis (sifat data bulanan KSEI, jeda gateway) dengan bahasa Indonesia yang sederhana tanpa jargon rumit.
- **Solutif & Cepat (Action-Oriented):** Tidak berbelit-belit, langsung menawarkan solusi konkret atau langkah tindak lanjut.

---

## 2. Matriks SLA Triase untuk One-Person Company (OPC)

| Kategori Masalah | Prioritas | SLA Respon Pertama | Target Penyelesaian | PIC Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Akses Belum Aktif Pasca-Bayar** | **P1 (Kritis)** | **< 2 Jam Kerja** | < 4 Jam Kerja | Erin (Manual Check) / Bobby |
| **Klaim Pembayaran Ganda / Refund** | **P1 (Kritis)** | **< 4 Jam Kerja** | < 24 Jam Kerja | Erin & Bobby (Xendit Verify) |
| **Permohonan Hapus Akun (UU PDP)** | **P2 (Tinggi)** | **< 12 Jam Kerja** | < 24 Jam Kerja | Erin / Script Deletion |
| **Laporan Data Salah (Glued Token)** | **P3 (Sedang)** | **< 24 Jam Kerja** | Rilis update bulanan | Erin (Triase) -> Dwight |
| **Pertanyaan Umum / Saran Fitur** | **P4 (Rendah)** | **< 48 Jam Kerja** | Roadmap bulanan | Erin |

---

## 3. Template Balasan Standar (Standard Reply Templates)

---

### SKENARIO 1: Laporan Data Salah / Ketidaksesuaian Data (Wrong Data / Glued Token)

#### Kasus 1A: Kesalahan Terkait Format PDF KSEI (Glued Token / Nama Terpotong)
```text
Halo Kak [Nama Pengguna],

Terima kasih banyak telah meluangkan waktu untuk mengabarkan ketidaksesuaian data pada emiten [Kode Saham, misal: BBCA]!

Kami telah memeriksa laporan Kakak mengenai nama investor [Nama Terlapor] yang terlihat terpotong / menempel. Hal ini terjadi karena dokumen resmi PDF KSEI memiliki format tabel tanpa sekat kolom rapat sehingga skrip ekstraksi otomatis kami mengalami kendala pemisahan kata (glued token) pada emiten tersebut.

Kabar baiknya, kami telah mencatat pola teks ini ke dalam daftar perbaikan (parser overrides) kami. Tim pengembang kami akan menyertakan perbaikan ini pada rilis pembaruan data bulanan berikutnya agar nama pemegang saham ditampilkan dengan rapi dan akurat.

Laporan teliti dari pengguna seperti Kakak sangat berharga untuk meningkatkan kualitas IHSG Storm. Jika ada data lain yang terlihat janggal, jangan ragu untuk kembali mengabari kami ya!

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

#### Kasus 1B: Kebingungan Mengenai Tanggal Data (Data Lag / Snapshot KSEI)
```text
Halo Kak [Nama Pengguna],

Terima kasih atas pertanyaannya mengenai tanggal data kepemilikan saham di IHSG Storm.

Kami ingin menjelaskan bahwa data pemegang saham di atas 1% bersumber langsung dari dokumen resmi bulanan yang dirilis oleh KSEI dan Bursa Efek Indonesia (BEI). Dokumen ini diterbitkan oleh regulator sebagai rekaman historis (snapshot) per tanggal penutupan buku setiap akhir bulan (bukan aliran data real-time detik per detik).

Oleh karena itu, tanggal data yang tertera (misalnya per akhir bulan lalu) mencerminkan posisi kepemilikan resmi terakhir yang dipublikasikan oleh kustodian bursa. Begitu KSEI merilis dokumen penutupan bulan baru, sistem kami akan langsung melakukan pembaruan dataset.

Sementara itu, untuk harga saham yang ditampilkan, kami memperbaruinya secara harian pada penutupan bursa (atau jeda 15 menit) guna membantu mengestimasi valuasi nilai pasar portofolio.

Semoga penjelasan ini membantu ya, Kak. Sukses selalu untuk aktivitas riset investasinya!

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

---

### SKENARIO 2: Akses Belum Aktif Setelah Bayar (Pending Access After Payment)

#### Kasus 2A: Verifikasi ID Transaksi & Solusi Cepat (Email Cocok)
```text
Halo Kak [Nama Pengguna],

Mohon maaf sekali atas ketidaknyamanan yang Kakak alami perihal pass akses yang belum langsung aktif setelah pembayaran. Kami siap membantu menyelesaikan ini segera!

Berdasarkan pengecekan kami pada sistem gerbang pembayaran Xendit dengan ID Transaksi [Nomor Invoice/Xendit ID], pembayaran Kakak untuk [Pass Investor / Pakar 1-Bulan] sebenarnya telah sukses diterima. Keterlambatan aktivasi ini disebabkan oleh jeda sesaat pada penerimaan sinyal webhook ke server kami.

Kami telah mengaktifkan pass akses Kakak secara manual sekarang juga. 

Silakan ikuti langkah singkat ini untuk menyegarkan sesi:
1. Buka kembali ihsg.badai.tech
2. Lakukan 'Logout' lalu 'Login' kembali menggunakan akun Google yang sama: [Email Terdaftar]
3. Sekarang seluruh fitur berbayar (analisis MoM, filter akumulasi, dan kuota ekspor) sudah dapat digunakan penuh.

Sebagai bentuk kompensasi atas keterlambatan ini, kami telah menambahkan masa aktif ekstra selama 2 hari ke akun Kakak.

Mohon kabari kami jika masih menemui kendala ya, Kak. Selamat menjelajahi data!

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

#### Kasus 2B: Meminta Bukti Pembayaran (Data Transaksi Belum Ditemukan)
```text
Halo Kak [Nama Pengguna],

Terima kasih telah menghubungi kami. Kami mohon maaf mendengar akses Kakak belum aktif setelah melakukan pembayaran.

Setelah kami memeriksa sistem kami dengan email [Email Akun], kami belum menemukan riwayat transaksi yang terhubung. Hal ini terkadang terjadi apabila pembayaran dilakukan menggunakan email atau metode yang berbeda saat di halaman checkout.

Agar kami dapat langsung melacak dan mengaktifkan akses Kakak secara manual, mohon bantu kami dengan mengirimkan:
1. Tangkapan layar (screenshot) bukti transfer sukses dari m-banking / e-wallet Kakak (yang menampilkan jam, nominal, dan Nomor Referensi Bank/RRN).
2. Kode faktur / Invoice ID Xendit (jika tercantum pada layar pembayaran).
3. Alamat email Google yang Kakak gunakan saat login di IHSG Storm.

Segera setelah kami menerima bukti tersebut, kami akan segera mencocokkan ke dashboard gateway dan langsung menyalakan akses pass Kakak dalam waktu kurang dari 1 jam.

Terima kasih atas kerja sama dan kesabaran Kakak!

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

---

### SKENARIO 3: Permohonan Pengembalian Dana (Refund Request)

#### Kasus 3A: Refund DISETUJUI (Transaksi Ganda / Double Charge Terverifikasi)
```text
Halo Kak [Nama Pengguna],

Terima kasih telah menunggu dan mengonfirmasi bukti transaksi kepada kami.

Setelah dilakukan pengecekan mendalam pada log pembayaran Xendit, kami mengonfirmasi bahwa memang telah terjadi pemotongan saldo ganda (double charge) untuk invoice [Nomor Invoice] akibat gangguan jaringan perbankan saat pemindaian QRIS.

Permohonan pengembalian dana (refund) Kakak sebesar [Nomor Nominal, misal: Rp 19.000 / Rp 49.000] telah kami SETUJUI 100%.

Berikut detail proses pengembalian dana:
- Metode Refund: Transfer Bank / Pembalikan QRIS
- Bank Tujuan: [Nama Bank & Nomor Rekening Pelanggan]
- Estimasi Dana Masuk: 1 - 3 hari kerja bank (tergantung kliring bank terkait)

Sementara itu, satu pass akses aktif tetap menyala di akun Kakak dan dapat digunakan seperti biasa.

Kami memohon maaf atas kendala perbankan yang sempat terjadi. Terima kasih banyak atas pengertian dan kerja sama Kakak!

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

#### Kasus 3B: Refund DITOLAK Secara Sopan (Sesuai Kebijakan: Akses Sudah Dikonsumsi / Buyer Remorse)
```text
Halo Kak [Nama Pengguna],

Terima kasih telah menghubungi kami mengenai permohonan pengembalian dana untuk pembelian [Pass Investor / Pakar].

Kami sangat menghargai masukan yang Kakak sampaikan. Namun, mohon maaf yang sebesar-besarnya, sesuai dengan Kebijakan Pengembalian Dana (Refund Policy) dan Syarat Layanan yang disetujui saat checkout, pembelian pass akses digital di IHSG Storm bersifat final (tidak dapat dikembalikan) setelah akun berhasil login dan data telah dikonsumsi.

IHSG Storm menyediakan akses digital seketika ke ribuan baris data publik historis KSEI yang dapat langsung dianalisis dan diunduh. Pengembalian dana hanya dapat diberikan apabila terjadi pembayaran ganda oleh sistem gateway atau kendala teknis total di mana sistem kami gagal memberikan hak akses dalam 2x24 jam.

Kami juga ingin menegaskan kembali bahwa IHSG Storm adalah alat analisis data independen dan bukan penyedia rekomendasi atau sinyal trading saham.

Masa aktif pass Kakak masih berlaku hingga tanggal [Tanggal Kedaluwarsa]. Kami sangat menyarankan Kakak untuk memaksimalkan fitur pemantauan pergerakan pemegang saham besar (Whale Radar) dan ekspor data selama periode ini.

Apabila ada kesulitan atau panduan dalam menggunakan fitur analisis kami, saya dengan senang hati siap memandu Kakak langkah demi langkah.

Terima kasih atas pengertian dan dukungan Kakak terhadap pengembangan IHSG Storm.

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

---

### SKENARIO 4: Permohonan Hapus Akun & Hak Ekspor Data (UU PDP)

#### Kasus 4A: Konfirmasi Permohonan Hapus Akun (Right to Erasure)
```text
Halo Kak [Nama Pengguna],

Kami telah menerima permohonan Kakak untuk menghapus akun dan seluruh data pribadi yang terdaftar pada layanan IHSG Storm dengan email [Email Akun].

Sesuai komitmen kami terhadap Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP), kami menghormati sepenuhnya hak privasi Kakak.

Sebelum kami mengeksekusi penghapusan permanen, mohon konfirmasi kembali bahwa Kakak memahami konsekuensi berikut:
1. Seluruh data preferensi, daftar pantauan saham (watchlists), dan penautan bot Telegram Kakak akan dihapus secara permanen (hard-delete).
2. Sisa masa aktif pass berbayar (jika ada) akan hangus seketika dan tidak dapat dipulihkan atau di-refund.
3. Alamat email dan identitas profil Kakak akan dianonimkan secara total di basis data kami, serta akun Google Kakak akan dihapus dari Firebase Auth.

Jika Kakak tetap ingin melanjutkan, silakan balas pesan ini dengan kalimat:  
"SAYA SETUJU MENGHAPUS AKUN SECARA PERMANEN"

Setelah konfirmasi balasan diterima, proses penghapusan dan anonimisasi akan kami tuntaskan dalam waktu maksimal 1x24 jam kerja.

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

#### Kasus 4B: Pemberitahuan Akun Telah Dihapus dan Dianonimkan (Erasure Completed)
```text
Halo,

Pemberitahuan resmi bahwa permohonan penghapusan akun untuk identitas [Email Akun Terkait] telah SELESAI diproses secara tuntas sesuai Pasal 8 UU PDP No. 27/2022.

Tindakan teknis yang telah dijalankan oleh sistem kami:
1. Seluruh daftar pantauan saham (watchlists) dan penautan bot Telegram telah dihapus permanen dari server.
2. Identitas profil pengguna telah dianonimkan sepenuhnya (email dan nama dihapus, Google UID dienkripsi satu arah SHA-256).
3. Identitas autentikasi telah dihapus permanen dari direktori Google Firebase Authentication.
4. Hash anonim telah dicatat pada log pemusnahan (deletion_log) guna memastikan data tidak akan pernah dipulihkan saat pemulihan cadangan data darurat.
*Catatan hukum: Catatan faktur transaksi finansial disimpan secara terbatas sesuai kewajiban hukum perundang-undangan pembukuan keuangan (UU Dokumen Perusahaan).

Terima kasih telah sempat menjadi bagian dari perjalanan IHSG Storm. Pintu kami selalu terbuka apabila di masa depan Anda memutuskan untuk kembali menggunakan layanan kami.

Salam hormat,  
Tim Pelindungan Data Pribadi — BAD.AI (IHSG Storm)
```

#### Kasus 4C: Pengiriman Berkas Ekspor Data Portabilitas (Right to Data Portability)
```text
Halo Kak [Nama Pengguna],

Memenuhi permohonan Kakak sesuai hak portabilitas data Subjek Data (Pasal 7 UU PDP No. 27/2022), terlampir kami sediakan salinan berkas data pribadi Kakak dalam format terstruktur (JSON).

Berkas ini memuat:
- Informasi profil akun terdaftar (email dan nama tampilan Google).
- Riwayat transaksi pembelian pass akses dan referensi faktur.
- Daftar emiten pada daftar pantauan (watchlists) yang tersimpan.
- Catatan tiket umpan balik yang pernah Kakak kirimkan.

Untuk keamanan data, tautan unduhan ini hanya dapat diakses dalam kurun waktu 7 hari ke depan. Kakak juga dapat mengunduh berkas ini secara mandiri kapan saja melalui menu pengaturan profil akun di dashboard.

Jika ada informasi yang memerlukan penjelasan lebih lanjut, silakan beri tahu kami ya Kak.

Salam hangat,  
Erin — Client Success IHSG Storm (BAD.AI)
```

---

## 4. Panduan Eskalasi Masalah (Escalation Path)

1. **Kendala Sistemik / Gateway Down (Xendit Webhook Error):**
   - Jika >2 pengguna melaporkan akses tertunda dalam 1 jam, eskalasikan langsung ke Dwight (Engineering) dan Bobby (Founder) untuk memeriksa status koneksi API/server.
2. **Pertanyaan Nasihat Saham / Pom-Pom:**
   - Apabila ada pengguna mendesak meminta rekomendasi beli saham ("Min, saham X besok bakal terbang gak?"), tegaskan secara sopan bahwa tim IHSG Storm adalah penyedia data independen, bukan penasihat investasi OJK, dan arahkan membaca halaman `/legal/disclaimer`.
3. **Ancaman Hukum / Sengketa Finansial:**
   - Eskalasikan langsung ke Toby (Risk & Compliance) dan Bobby untuk peninjauan legal formal.
