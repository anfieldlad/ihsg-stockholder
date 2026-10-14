// Copy strings for IHSG Storm (from Andy's copy-strings.json + Oscar's freemium v2 + Pam's ui-spec v2)

export const FAQ_ITEMS = [
  // --- Kategori ksei (5: K1-K5) ---
  {
    id: "K1",
    cat: "ksei",
    q: "Apa itu IHSG Storm dan dari mana sumber datanya?",
    a: "IHSG Storm adalah alat bantu independen untuk melihat struktur kepemilikan saham emiten BEI. Data kepemilikan bersumber dari arsip resmi KSEI posisi akhir bulan. Data harga bursa diperbarui dari Yahoo Finance dengan jeda waktu sekitar 15 menit."
  },
  {
    id: "K2",
    cat: "ksei",
    q: "Mengapa memakai ambang kepemilikan ≥1%, bukan 5%?",
    a: "Regulasi POJK mewajibkan keterbukaan publik untuk kepemilikan saham mulai dari 5%. Namun, dokumen KSEI mencatat pemegang efek mulai dari ambang 1%. Dengan menampilkan data ≥1%, Anda dapat memantau pergerakan investor institusi, sindikasi, dan pemegang tier-dua sebelum mereka mencapai batas 5%."
  },
  {
    id: "K3",
    cat: "ksei",
    q: "Apa arti label Domestik, Asing, dan Warkat/Scrip?",
    a: "<b>Domestik</b> menandakan perorangan WNI atau badan hukum yang berdomisili di Indonesia. <b>Asing</b> adalah perorangan atau badan hukum internasional. <b>Warkat / Scrip</b> merujuk pada saham berbentuk sertifikat fisik di luar sistem penyimpanan elektronik (scripless) C-BEST KSEI."
  },
  {
    id: "K4",
    cat: "ksei",
    q: "Kalau seseorang tidak muncul di daftar, berarti dia tidak punya saham itu?",
    a: "Belum tentu. Daftar ini hanya memuat pemegang saham dengan kepemilikan mulai dari 1% (≥1%). Pemegang dengan porsi di bawah 1% tidak dipublikasikan dalam dokumen resmi KSEI sehingga tidak tampil di aplikasi. Porsi saham yang tersisa dimiliki oleh pemegang saham di bawah 1% dan publik (free float)."
  },
  {
    id: "K5",
    cat: "ksei",
    q: "Seberapa akurat datanya? Apa batasnya?",
    a: "Kami menyajikan data resmi KSEI dengan penyeragaman penulisan nama entitas (seperti \"PT\", \"TBK\", dan tanda baca) agar kepemilikan yang sama tidak terpecah. Batasnya, perubahan nama total dapat terbaca sebagai entitas berbeda, dan satu pemegang bisa terdaftar melalui beberapa kustodian terpisah. Data ini merupakan potret posisi penutupan akhir bulan, bukan riwayat transaksi harian. Jika menemukan ketidaksesuaian, Anda dapat melaporkannya melalui tombol Laporkan Kesalahan Data."
  },

  // --- Kategori jadwal (4: J1-J4) ---
  {
    id: "J1",
    cat: "jadwal",
    q: "Seberapa sering data kepemilikan diperbarui?",
    a: "Data kepemilikan diperbarui sebulan sekali mengikuti rilis arsip resmi penutupan buku KSEI. Tanggal posisi data yang sedang ditampilkan selalu dicantumkan di aplikasi, misalnya \"per 30 September 2026\"."
  },
  {
    id: "J2",
    cat: "jadwal",
    q: "Kenapa data bulan terbaru belum ada?",
    a: "KSEI umumnya merilis arsip data kepemilikan beberapa hari kerja setelah penutupan akhir bulan. Begitu dokumen resmi terbit, data langsung kami verifikasi dan muat ke dalam sistem. Oleh karena itu, posisi kepemilikan selalu mencerminkan akhir bulan sebelumnya dan memiliki jeda dari transaksi hari ini."
  },
  {
    id: "J3",
    cat: "jadwal",
    q: "Mengapa harga saham tertunda sekitar 15 menit?",
    a: "Feed harga pasar bursa disediakan melalui feed publik dengan jeda waktu sekitar 15 menit sesuai ketentuan bursa. IHSG Storm dirancang untuk menganalisis struktur kepemilikan dan pergerakan investor strategis, bukan sebagai platform eksekusi perdagangan harian."
  },
  {
    id: "J4",
    cat: "jadwal",
    q: "Kenapa perbandingan antar-bulan kadang menyebut \"4 bulan lalu\"?",
    a: "Perbandingan antar-bulan membandingkan data dengan posisi bulan rilis sebelumnya yang tersedia di sistem. Jika terdapat jeda bulan yang belum terbit dari KSEI, rentang waktu tersebut dicantumkan secara transparan di atas daftar (misalnya \"4 bulan lalu\"). Perubahan tetap dihitung secara akurat, namun mencerminkan akumulasi selama periode tersebut, bukan perubahan satu bulan kalender."
  },

  // --- Kategori baca (5: B1-B5) ---
  {
    id: "B1",
    cat: "baca",
    q: "Bagaimana cara membaca daftar Pemegang Saham (Top Holders)?",
    a: "Setiap baris menampilkan satu pemegang saham ≥1% yang diurutkan dari porsi kepemilikan terbesar. Informasi yang disajikan meliputi nama, jenis investor, label Domestik/Asing, persentase dari seluruh saham beredar, dan jumlah lembar. Pengguna paket Gratis dapat melihat 5 pemegang teratas, sedangkan pengguna Pro dapat melihat seluruh pemegang saham terdaftar."
  },
  {
    id: "B2",
    cat: "baca",
    q: "Apa arti diagram lingkaran (donut) struktur kepemilikan?",
    a: "Diagram lingkaran menggambarkan proporsi kepemilikan masing-masing pemegang saham ≥1% terhadap seluruh saham beredar emiten. Bagian porsi sisa mewakili kepemilikan gabungan investor di bawah 1% dan publik (free float). Diagram ini menyajikan gambaran distribusi modal, bukan penentu mutlak kendali operasional perseroan."
  },
  {
    id: "B3",
    cat: "baca",
    q: "Apa itu Peta Relasi Pemegang dan Peta Portofolio Konglomerasi?",
    a: "<b>Peta Relasi Pemegang</b> di halaman saham menampilkan pemegang saham signifikan beserta hubungan kepemilikan antar-entitas. <b>Peta Portofolio Konglomerasi</b> di halaman investor merangkum seluruh emiten yang dimiliki oleh investor atau grup yang sama. Garis penghubung pada peta murni menunjukkan pencatatan kepemilikan efek resmi, bukan bukti adanya afiliasi atau kerja sama bisnis di antara pihak terkait."
  },
  {
    id: "B4",
    cat: "baca",
    q: "Apa bedanya persentase dan jumlah lembar saham?",
    a: "Jumlah lembar mencerminkan kuantitas unit saham yang dimiliki secara fisik atau tercatat di kustodian. Persentase diperoleh dari jumlah lembar tersebut dibagi total seluruh saham beredar emiten. Dua emiten dengan jumlah lembar kepemilikan yang sama dapat memiliki nilai persentase yang jauh berbeda tergantung modal disetor perseroan."
  },
  {
    id: "B5",
    cat: "baca",
    q: "Apa arti Peringkat Investor dan portofolio per investor?",
    a: "Peringkat Investor mengurutkan pemegang saham berdasarkan kepemilikan efek ≥1% terbanyak di berbagai emiten BEI. Portofolio investor menampilkan daftar emiten yang dimiliki oleh investor tersebut beserta porsi lembarnya. Pengguna paket Gratis dapat melihat 20 investor teratas dan 8 emiten per investor, sedangkan pengguna Pro dapat mengakses seluruh portofolio secara lengkap."
  },

  // --- Kategori fitur (8: F1-F8) ---
  {
    id: "F1",
    cat: "fitur",
    q: "Apa itu Perubahan Antar-Bulan?",
    a: "Fitur ini membandingkan data kepemilikan saham ≥1% antara dua periode rilis bulanan KSEI untuk melacak siapa yang menambah, mengurangi, baru masuk, atau keluar. Pengguna paket Gratis dapat melihat ringkasan 5 emiten teratas untuk kategori akumulasi dan distribusi. Daftar perubahan lengkap seluruh emiten serta Riwayat Perubahan per saham dapat diakses khusus oleh pengguna Pro."
  },
  {
    id: "F2",
    cat: "fitur",
    q: "Apa arti label Naik, Turun, Masuk >1%, dan Keluar >1%?",
    a: "<b>Naik</b> menunjukkan penambahan jumlah lembar saham dibanding periode sebelumnya, sedangkan <b>Turun</b> menunjukkan pengurangan lembar. <b>Masuk >1%</b> menandai pemegang saham yang baru melampaui ambang batas kepemilikan 1%, dan <b>Keluar >1%</b> menandai pemegang yang porsinya turun di bawah 1% sehingga tidak lagi tercatat. Label Masuk dan Keluar hanya menandai perlintasan ambang 1%, bukan berarti membeli dari nol atau menjual seluruh kepemilikannya."
  },
  {
    id: "F3",
    cat: "fitur",
    q: "Apa arti Pindah nama?",
    a: "<b>Pindah nama</b> menandakan jumlah lembar dan persentase saham sama persis dengan bulan sebelumnya, namun tercatat dengan nama entitas berbeda pada dokumen KSEI. Sistem kami menandai kejadian ini secara khusus dan tidak menghitungnya sebagai Masuk atau Keluar. Hal ini umumnya disebabkan oleh perubahan nama resmi badan hukum, restrukturisasi korporasi, atau pemindahan rekening kustodian."
  },
  {
    id: "F4",
    cat: "fitur",
    q: "Apa arti Turun <1% (Terdilusi)?",
    a: "Label <b>Turun <1%</b> diberikan jika persentase pemegang saham turun ke bawah 1% semata-mata karena emiten menambah total saham beredar (misalnya lewat rights issue atau penambahan modal), bukan karena penjualan saham. Baris kepemilikan ini tidak dihitung sebagai transaksi Keluar, serta tidak dimasukkan ke dalam daftar peringkat akumulasi maupun distribusi."
  },
  {
    id: "F5",
    cat: "fitur",
    q: "Bagaimana perubahan dihitung, dan apa batasnya?",
    a: "Perhitungan dilakukan secara otomatis dengan mencocokkan identitas pemegang saham menggunakan nama yang diseragamkan, lalu membandingkan selisih jumlah lembar saham antar-bulan. Karena menggunakan aturan heuristik, terdapat batasan: dua penulisan nama yang berbeda dari pihak yang sama berpotensi tidak terhubung, atau sebaliknya. Perubahan volume juga dapat bersumber dari aksi korporasi emiten atau transfer antar-rekening, bukan transaksi beli-jual di pasar reguler. Analisis ini hanya mencakup pemegang saham yang tercatat di atas ambang 1%."
  },
  {
    id: "F6",
    cat: "fitur",
    q: "Apakah \"akumulasi\" berarti pemegang itu membeli di pasar?",
    a: "Tidak selalu. Angka akumulasi menunjukkan penambahan bersih lembar saham di antara pemegang saham ≥1% yang tercatat dalam arsip bulanan. Selisih tersebut dapat bersumber dari pembelian di pasar modal, pelaksanaan aksi korporasi, maupun transfer efek antar-pemegang. Kasus transfer terindikasi dan aksi korporasi besar secara otomatis diberi tanda khusus dan dikeluarkan dari peringkat akumulasi utama. Data ini murni bersifat informatif, bukan sinyal rekomendasi beli atau jual."
  },
  {
    id: "F7",
    cat: "fitur",
    q: "Apa itu Screener Saham dan apa saja filternya?",
    a: "Screener Saham menyaring seluruh 961 saham BEI secara instan berdasarkan kriteria kepemilikan institusional. Filter yang tersedia meliputi <b>Kepemilikan asing</b> (≥20%, ≥50%, ≥70%), <b>Konsentrasi</b> pemegang Top 1 atau Top 3 (≥50%, ≥70%, ≥85%), <b>Jumlah pemegang</b> (1–2, 3–5, >5), dan <b>Jenis pemegang</b> (BUMN/Sovereign, Dapen/Asuransi, Institusi asing, Mayoritas individu). Semua filter yang aktif digabungkan menggunakan logika DAN, dan fitur ini dapat diakses khusus oleh pengguna Pro."
  },
  {
    id: "F8",
    cat: "fitur",
    q: "Bagaimana Screener menentukan jenis pemegang?",
    a: "Penentuan jenis pemegang dilakukan berdasarkan klasifikasi tipe investor resmi yang tercatat pada dokumen KSEI. Pengelompokan ini bersifat indikatif dan heuristik, sehingga pemegang dengan data tipe kosong atau format nonstandar mungkin belum masuk ke dalam kelompok yang diharapkan. Hasil penyaringan Screener murni merupakan alat bantu riset kuantitatif, bukan rekomendasi investasi saham."
  },

  // --- Kategori akun-pro (4: A1-A4) ---
  {
    id: "A1",
    cat: "akun-pro",
    q: "Apa beda paket Gratis dan Pro?",
    a: "Platform kami hanya menyediakan dua tingkatan paket. Paket <b>Gratis</b> mencakup pencarian emiten dan investor, 5 pemegang teratas per saham, 8 emiten per portofolio investor, 20 peringkat investor teratas, serta ringkasan 5 teratas Perubahan Antar-Bulan. Paket <b>Pro</b> membuka seluruh pemegang saham, portofolio dan peringkat lengkap, tabel Perubahan Antar-Bulan lengkap beserta riwayat per emiten, dan fitur Screener Saham. Fitur daftar pantau saham dan notifikasi pembaruan KSEI akan menyusul kemudian untuk pengguna Pro."
  },
  {
    id: "A2",
    cat: "akun-pro",
    q: "Apakah Pro sudah dibuka untuk umum?",
    a: "Belum. Saat ini akses Pro baru tersedia secara terbatas melalui program akses awal (early access). Jadwal peluncuran resmi serta skema biaya berlangganan publik belum diumumkan."
  },
  {
    id: "A3",
    cat: "akun-pro",
    q: "Bagaimana cara masuk, dan apa itu akses awal?",
    a: "Anda dapat masuk dengan mudah menggunakan akun Google melalui tombol <b>Masuk</b>. Selama program akses awal, kuota terbatas (5 pendaftar baru pertama) yang masuk dengan Google otomatis mendapatkan akses Pro gratis. Informasi sisa kursi akses awal yang tersedia ditampilkan secara langsung pada lembar informasi Pro. Akun yang telah terdaftar sebelum periode kuota dibuka tidak memperoleh upgrade otomatis."
  },
  {
    id: "A4",
    cat: "akun-pro",
    q: "Bagaimana saya tahu Pro saya aktif, dan sampai kapan?",
    a: "Buka menu <b>Akun</b> pada bilah navigasi untuk melihat status paket aktif serta tanggal masa berlaku akses Pro Anda. Setelah masa berlaku akses awal berakhir, status akun akan bertransisi kembali ke paket Gratis secara otomatis. Data akun Google dan preferensi Anda tidak akan dihapus saat masa aktif berakhir."
  },

  // --- Kategori legal (4: L1-L4) ---
  {
    id: "L1",
    cat: "legal",
    q: "Apakah IHSG Storm memberi saran investasi?",
    a: "Tidak. Seluruh data yang disajikan pada IHSG Storm bersumber dari publikasi resmi KSEI dan bursa untuk tujuan riset informasi publik serta edukasi. Data ini bukan merupakan rekomendasi investasi, anjuran beli atau jual saham, maupun penawaran produk keuangan apapun. Keputusan investasi sepenuhnya menjadi tanggung jawab mandiri masing-masing pemodal (Do Your Own Research / DYOR)."
  },
  {
    id: "L2",
    cat: "legal",
    q: "Data pribadi apa yang dikumpulkan?",
    a: "Anda dapat menggunakan sebagian besar fitur eksplorasi saham tanpa perlu masuk atau mendaftar akun. Jika masuk menggunakan Google, kami hanya mencatat data profil Google dasar untuk mengidentifikasi kepemilikan akun dan hak akses paket Anda. Kami tidak memasang pelacak analitik pihak ketiga yang invasif maupun cookie periklanan. Token autentikasi hanya disimpan di memori peramban, dan preferensi penyaringan Screener hanya disimpan di sesi browser (sessionStorage) Anda."
  },
  {
    id: "L3",
    cat: "legal",
    q: "Apakah data saya dijual atau dibagikan?",
    a: "Tidak. Kami tidak pernah menjual, menyewakan, atau membagikan data identitas pengguna kepada pihak ketiga mana pun. Layanan ini sepenuhnya bersih dari iklan komersial maupun monetisasi data pribadi."
  },
  {
    id: "L4",
    cat: "legal",
    q: "Bagaimana cara melaporkan data yang tidak sesuai?",
    a: "Anda dapat menekan tombol <b>Laporkan Kesalahan Data</b> di bagian bawah halaman atau menggunakan tombol lapor di dalam kartu detail saham. Tim kami akan meninjau dan memverifikasi setiap laporan terhadap rujukan pengumuman resmi bursa dan arsip KSEI dalam kurun 1–2 hari kerja (24–48 jam kerja)."
  }
];

export const FAQ = FAQ_ITEMS;

export function filterFaq(items = FAQ_ITEMS, category = 'all', search = '') {
  const cat = (category || 'all').trim().toLowerCase();
  const q = (search || '').trim().toLowerCase();
  return (items || []).filter(item => {
    const matchCat = cat === 'all' || item.cat.toLowerCase() === cat;
    if (!matchCat) return false;
    if (!q) return true;
    const inQ = (item.q || '').toLowerCase().includes(q);
    const inA = (item.a || '').toLowerCase().includes(q);
    return inQ || inA;
  });
}

export const COPY = {
  app: {
    name: "IHSG Storm",
    credit: "by BAD.AI",
    tagline: "Pantau Kepemilikan Saham & Pergerakan Investor Kakap",
    meta_title: "IHSG Storm — Data Kepemilikan Saham KSEI ≥1% & Harga Bursa",
    meta_description: "Pantau data kepemilikan saham emiten BEI di atas 1% dari KSEI. Lacak portofolio konglomerat, investor institusi, dan harga bursa terkini.",
    meta_keywords: "IHSG, saham Indonesia, kepemilikan saham, KSEI, pemegang saham, investor kakap, BEI, IDX, bandarmologi, smart money, free float"
  },
  nav: {
    stocks: "Saham",
    investors: "Investor",
    analytics: "Analitik",
    faq: "Bantuan & FAQ",
    search: "Cari",
    help: "Bantuan",
    pro_pill: "PRO",
    aria_main_nav: "Navigasi utama"
  },
  freshness: {
    normal: "Data KSEI per {date} · Harga bursa tertunda 15 mnt",
    stale: "Data KSEI per {date} (pembaruan berkala) · Harga bursa tertunda 15 mnt",
    action_info: "Info Pembaruan",
    tooltip: "Data kepemilikan efek bersumber dari publikasi berkala KSEI (posisi akhir bulan). Harga bursa diperbarui dengan jeda 15 menit."
  },
  search: {
    bar_placeholder: "Cari saham atau investor...",
    overlay_input_placeholder: "Ketik kode saham (misal: BBCA) atau nama investor",
    shortcut: "Ctrl K",
    btn_cancel: "Batal",
    recent_title: "Pencarian Terakhir",
    section_stocks: "Saham Tercatat",
    section_investors: "Investor Terdaftar",
    empty_title: "Tidak Ditemukan",
    empty_desc: "Tidak ada saham atau investor yang cocok dengan \"{query}\".",
    empty_hint: "Pastikan ejaan 4 huruf kode saham (misal: BMRI) atau nama investor sudah tepat.",
    btn_report_missing: "Emiten atau investor belum ada? Laporkan di sini",
    aria_search: "Cari kode saham atau nama investor"
  },
  stocks: {
    title: "Saham",
    subtitle: "{count} emiten dengan pemegang saham ≥1%",
    filter_all: "Semua",
    filter_foreign_dom: "Dominasi Asing",
    filter_top_holders: "Pemegang Terbanyak",
    filter_scrip: "Warkat / Scrip",
    filter_screener: "Screener",
    sort_label: "Urutkan",
    sort_code: "Kode (A-Z)",
    sort_top_pct: "Porsi Terbesar",
    sort_holders: "Jumlah Pemegang",
    col_code: "Kode",
    col_issuer: "Emiten",
    col_price: "Harga",
    col_change: "+/-",
    col_holders: "Pemegang ≥1%",
    col_top_pct: "Porsi Terbesar",
    col_top_name: "Pemegang Terbesar",
    col_local_pct: "Porsi Domestik",
    row_top_holder: "Pemegang terbesar {pct} · {name}",
    btn_load_more: "Muat Lebih Banyak",
    demo_note: "Menampilkan {visible} dari {total} emiten tercatat di Bursa Efek Indonesia."
  },
  investors: {
    title: "Investor",
    subtitle: "Daftar pemegang saham ≥1% di seluruh emiten BEI",
    filter_all: "Semua",
    filter_individual: "Individu",
    filter_corporate: "Korporasi",
    filter_foreign: "Asing",
    filter_scrip: "Warkat",
    col_rank: "#",
    col_investor: "Investor",
    col_type: "Tipe",
    col_stock_count: "Jml Emiten",
    col_portfolio: "Portofolio Saham",
    row_holdings_count: "{count}+ emiten",
    row_largest_stake: "terbesar {pct}",
    btn_load_more: "Muat Lebih Banyak",
    demo_note: "Menampilkan {visible} dari {total} investor terdaftar di KSEI."
  },
  analytics: {
    title: "Analitik",
    subtitle: "Ringkasan struktur kepemilikan efek KSEI per {date}",
    card_lf_title: "Investor Domestik vs Asing vs Warkat",
    card_lf_desc: "Berdasarkan catatan kepemilikan saham ≥1%, bukan volume transaksi harian.",
    legend_local: "Domestik (Lokal)",
    legend_foreign: "Asing",
    legend_scrip: "Warkat / Scrip",
    card_type_title: "Klasifikasi Tipe Investor",
    card_type_desc: "Distribusi kelompok investor pemegang efek tercatat.",
    card_top15_title: "15 Emiten dengan Pemegang Saham Terbanyak",
    card_top15_desc: "Emiten dengan jumlah entitas pemegang saham ≥1% terbanyak.",
    card_conc_title: "Konsentrasi Kepemilikan Pengendali",
    card_conc_desc: "Sebaran emiten berdasarkan porsi kepemilikan pemegang saham terbesar."
  },
  sheet_stock: {
    title: "Detail Saham",
    btn_back: "Kembali",
    btn_close: "Tutup",
    price_delayed_note: "Harga bursa tertunda ±15 mnt",
    stat_holders: "Pemegang ≥1%",
    stat_top_holder: "Porsi Terbesar",
    stat_foreign: "Porsi Asing (Top {n})",
    stat_public_rest: "Publik & Lainnya (<1%)",
    structure_title: "Struktur Kepemilikan",
    structure_desc: "{count} pemegang terbesar (warna selaras daftar di bawah)",
    donut_aria: "Diagram struktur kepemilikan {code}",
    donut_rest_note: "Sisa {pct} dimiliki pemegang saham di bawah 1% dan publik.",
    holders_title: "Daftar Pemegang Saham",
    col_investor: "Investor",
    col_type: "Tipe",
    col_origin: "Asal",
    col_shares: "Lembar",
    col_pct: "Porsi (%)",
    shares_unit: "lbr",
    btn_relation_map: "Peta Relasi Pemegang",
    btn_report_stock: "Laporkan Ketidaksesuaian Saham Ini"
  },
  sheet_investor: {
    title: "Profil Investor",
    btn_back: "Kembali",
    btn_close: "Tutup",
    stat_issuers: "Emiten Dimiliki",
    stat_largest: "Porsi Terbesar",
    stat_total_shares: "Total Lembar",
    stat_est_valuation: "Estimasi Valuasi Portofolio",
    valuation_calculating: "Menghitung...",
    portfolio_title: "Portofolio Saham ≥1%",
    col_code: "Kode",
    col_issuer: "Emiten",
    col_shares: "Lembar",
    col_pct: "Porsi (%)",
    col_price: "Harga",
    col_valuation: "Valuasi",
    btn_relation_map: "Peta Portofolio Konglomerasi",
    btn_report_investor: "Laporkan Ketidaksesuaian Investor Ini",
    demo_note: "Menampilkan portofolio investor terdaftar di KSEI."
  },
  akun: {
    title: "Akun",
    label_status: "Status",
    label_validity: "Masa berlaku",
    status_pro: "Pro",
    status_free: "Gratis",
    lifetime: "Seumur hidup",
    btn_logout: "Keluar"
  },
  info_sheet: {
    title: "Tentang Data",
    ksei_head: "Data kepemilikan",
    ksei_body: "Diambil dari data bulanan KSEI, posisi akhir bulan. Data yang tampil sekarang per {date}. Data baru masuk setelah KSEI merilisnya.",
    price_head: "Harga saham",
    price_body: "Harga dari bursa dan tertunda sekitar 15 menit.",
    btn_close: "Tutup"
  },
  pro_gates: {
    btn_see: "Lihat Fitur Pro",
    investor_rank: {
      title: "Semua {count} investor",
      benefit: "Lihat seluruh peringkat investor, bukan hanya 20 teratas."
    },
    stock_holders: {
      title: "Semua {count} pemegang saham",
      benefit: "Lihat seluruh pemegang saham ≥1%, bukan hanya 5 teratas."
    },
    investor_portfolio: {
      title: "Portofolio lengkap",
      benefit: "Lihat semua saham yang dimiliki investor ini, bukan hanya 8 teratas."
    },
    screener: {
      title: "Screener saham",
      benefit: "Saring 961 saham berdasarkan porsi asing, konsentrasi, jumlah pemegang, dan jenis pemegang."
    }
  },
  pro_sheet: {
    bar_title: "IHSG Storm Pro",
    title: "Gratis dan Pro",
    subtitle: "Pro menambah data yang lebih lengkap dan fitur yang sedang disiapkan.",
    col_feature: "Fitur",
    col_free: "Gratis",
    col_pro: "Pro",
    rows: [
      { feature: "Cari saham dan investor", free: "Ya", pro: "Ya", soon: false },
      { feature: "Pemegang saham per saham (≥1%)", free: "5 teratas", pro: "Semua", soon: false },
      { feature: "Portofolio per investor", free: "8 teratas", pro: "Semua", soon: false },
      { feature: "Peringkat investor", free: "20 teratas", pro: "Semua", soon: false },
      { feature: "Perubahan antar-bulan", free: "Ringkasan 5 teratas", pro: "Lengkap", soon: false },
      { feature: "Screener saham", free: "–", pro: "Ya", soon: false },
      { feature: "Daftar pantau saham", free: "–", pro: "Segera", soon: true },
      { feature: "Pengingat saat data KSEI diperbarui", free: "–", pro: "Segera", soon: true }
    ],
    cta_disabled: "Pro belum dibuka untuk umum",
    cta_early_access: "Masuk dengan Google",
    ea_open: "Pro belum dibuka untuk umum. {total}pendaftar baru pertama yang masuk dengan Google otomatis dapat Pro (sisa {n} kursi).",
    ea_full: "Kursi akses awal sudah penuh.",
    btn_close: "Tutup"
  },
  feedback: {
    btn_open: "Bantuan & Lapor",
    badge: "Audit Data & Masukan Pengguna",
    title: "Laporkan Kesalahan Data atau Saran",
    desc: "Bantu kami memverifikasi tabel KSEI, teks terpotong, atau usulkan fitur baru.",
    tab_data_error: "Kesalahan Data",
    tab_feature_request: "Saran Fitur",
    tab_question: "Pertanyaan",
    context_label: "Konteks Terpilih:",
    btn_clear_context: "Hapus Konteks",
    label_code: "Kode Saham (Opsional)",
    placeholder_code: "Misal: BBCA",
    label_name: "Nama Emiten / Investor (Opsional)",
    placeholder_name: "Misal: BANK CENTRAL ASIA",
    label_error_type: "Tipe Kendala Data",
    opt_glued: "Teks menempel / terpotong (misal: TbkDRS...)",
    opt_shares: "Jumlah lembar saham keliru / beda dengan laporan resmi",
    opt_pct: "Persentase kepemilikan keliru",
    opt_class: "Klasifikasi investor (Domestik/Asing) tertukar",
    opt_missing: "Pemegang saham ≥1% belum tercantum",
    opt_price: "Harga bursa terkendala / deviasi data",
    opt_other: "Kendala lainnya",
    label_desc: "Deskripsi Kendala / Saran *",
    placeholder_desc: "Jelaskan ketidaksesuaian angka atau usulan fitur yang Anda butuhkan...",
    label_url: "Tautan Rujukan Resmi (Opsional)",
    placeholder_url: "https://www.idx.co.id/... atau tautan pengumuman KSEI",
    label_contact: "Email atau Telegram (Opsional)",
    placeholder_contact: "investor@example.com atau @username",
    contact_hint: "Hanya dihubungi jika tim audit membutuhkan klarifikasi dokumen rujukan.",
    sla_note: "Waktu peninjauan audit: 1x24–48 jam kerja",
    btn_cancel: "Batal",
    btn_submit: "Kirim Laporan",
    btn_submitting: "Mengirim...",
    success_title: "Laporan Berhasil Terkirim!",
    ticket_label: "Nomor Tiket:",
    success_desc: "Terima kasih atas ketelitian Anda. Laporan ini telah masuk ke antrean audit data tim kami untuk diverifikasi terhadap dokumen resmi KSEI.",
    btn_done: "Selesai & Tutup"
  },
  states: {
    loading: "Memuat data kepemilikan saham...",
    loading_prices: "Memperbarui harga saham...",
    error_load: "Data belum bisa dimuat",
    btn_retry: "Coba Lagi",
    price_loading: "-",
    price_unavailable: "-",
    no_change: "0,00%",
    empty_search: "Tidak ada hasil yang sesuai.",
    offline_notice: "Koneksi terputus. Menampilkan data tersimpan di perangkat Anda."
  },
  disclaimer: {
    banner: "Disclaimer: Seluruh data disajikan untuk tujuan riset dan edukasi informasi publik, bukan rekomendasi beli atau jual saham. Keputusan investasi sepenuhnya menjadi tanggung jawab mandiri masing-masing investor (DYOR — Do Your Own Research).",
    footer_text: "Data bersumber dari publikasi resmi KSEI dan bursa dengan harga tertunda (delayed feed). Bukan merupakan nasihat keuangan atau anjuran transaksi.",
    footer_copy: "© 2026 IHSG Storm · by BAD.AI",
    footer_privacy: "Bebas pelacak & tanpa cookie iklan",
    footer_disc: "Bukan saran investasi",
    footer_faq: "Pusat Bantuan & FAQ",
    footer_report: "Laporkan Kesalahan Data",
    privacy_faq: "IHSG Storm mengutamakan privasi pengguna. Layanan ini sepenuhnya cookieless (tanpa cookie pelacak), tidak mengumpulkan Data Pribadi (PII), menghormati sinyal Do-Not-Track (DNT), dan bebas dari pelacak iklan pihak ketiga sesuai prinsip UU PDP."
  },
  investor_types: {
    CP: "Korporasi",
    ID: "Individu",
    MF: "Reksa Dana",
    SC: "Perusahaan Efek",
    IS: "Asuransi",
    PF: "Dana Pensiun",
    IB: "Bank Investasi",
    FD: "Yayasan",
    YY: "Yayasan",
    OT: "Lainnya",
    "": "Warkat / Tidak Terklasifikasi",
    UNKNOWN: "Warkat / Tidak Terklasifikasi"
  },
  origin_types: {
    L: "Domestik",
    F: "Asing",
    A: "Asing",
    W: "Warkat / Scrip",
    "": "Warkat / Scrip"
  },
  units: {
    shares: "lbr",
    thousand: "Rb",
    million: "Jt",
    billion: "M",
    trillion: "T",
    currency_prefix: "Rp ",
    percent_suffix: "%",
    page_info: "Hal {page} dari {total}"
  },
  diff: {
    title: "Perubahan Kepemilikan Bulanan",
    sheet_title: "Semua Perubahan Kepemilikan",
    period: "{to} dibanding {from}",
    period_gap: "{to} dibanding {from} ({n} bulan lalu)",
    seg_aria: "Daftar peringkat",
    seg_acc: "Akumulasi",
    seg_dist: "Distribusi",
    holders_changed: "{n} pemegang berubah",
    shares_unit: "lembar",
    gap_banner: "Selisih {n} bulan. Data bulan di antaranya belum tersedia, jadi perubahan ini gabungan beberapa bulan.",
    lock_counts: "{new} investor baru masuk >1%, {exit} keluar, {inc} posisi naik, {dec} turun.",
    lock_sub: "Pro membuka daftar lengkap beserta nama investor dan jumlah lembar.",
    lock_btn: "Lihat Fitur Pro",
    caveat: "Berdasarkan data pemegang saham >1% KSEI. Masuk/Keluar berarti melewati batas 1%, bukan pasti beli atau jual. “Pemegang berubah” dan pp menghitung semua yang naik, turun, masuk, dan keluar. pp = poin persentase, rb = ribu, jt = juta, mlr = miliar.",
    source: "Sumber: KSEI via IDX. Posisi per {from} dan {to}. Informasi umum, bukan nasihat investasi dan bukan penasihat berlisensi OJK.",
    indicative: "Penandaan aksi korporasi dan transfer bersifat indikatif (perkiraan otomatis dari data bulanan), bukan konfirmasi.",
    excluded: "{n} saham baru/keluar bursa tidak masuk peringkat.",
    not_counted: "Tidak dihitung di empat angka ini: {entity} pindah nama dan {diluted} turun <1% karena aksi korporasi.",
    open_all: "Lihat semua perubahan",
    change_period: "Ubah",
    tile_up: "Posisi naik", tile_down: "Posisi turun", tile_new: "Masuk >1%", tile_exit: "Keluar >1%",
    tile_aria_up: "Lihat {n} posisi naik", tile_aria_down: "Lihat {n} posisi turun",
    tile_aria_new: "Lihat {n} investor masuk di atas 1%", tile_aria_exit: "Lihat {n} investor keluar dari 1%",
    chips_aria: "Filter perubahan",
    chip_all: "Semua", chip_up: "Naik", chip_down: "Turun", chip_new: "Investor Baru", chip_exit: "Keluar ≥1%",
    chip_corp: "Aksi korporasi", chip_transfer: "Transfer", chip_entity: "Pindah nama",
    f_type: "Jenis", f_origin: "Asal", o_all: "Semua", o_local: "Lokal", o_foreign: "Asing", t_all: "Semua jenis",
    search_ph: "Cari kode saham atau investor", search_aria: "Cari kode saham atau investor",
    label_to: "Bulan", label_from: "Dibanding",
    results: "{n} hasil",
    status_inc: "Naik", status_dec: "Turun", status_new: "Masuk >1%", status_exit: "Keluar >1%",
    status_entity: "Pindah nama", status_diluted: "Turun <1%", status_same: "Tidak berubah",
    tag_corp: "Aksi korporasi", tag_transfer: "Transfer", tag_indicative: "Indikatif",
    pct_new: "baru",
    val_not_counted: "tidak dihitung", val_zero_shares: "0 lembar", val_diluted: "turun <1%", val_entity_shares: "tetap (hanya ganti nama)",
    extra_prev_name: "sebelumnya {name}",
    extra_diluted: "karena aksi korporasi, bukan dijual",
    extra_corp: "karena aksi korporasi",
    extra_transfer: "transfer antar pemegang",
    prev_shares: "Lembar sebelumnya", curr_shares: "Lembar sekarang", delta_shares: "Selisih lembar",
    exact_entity_delta: "0 (jumlah lembar tetap, hanya ganti nama)",
    exact_exit_curr: "<1% (turun di bawah batas lapor 1% \u00b7 kepemilikan tidak dipublikasikan, belum tentu 0)",
    exact_exit_delta: "Turun <1% (kepemilikan tidak dipublikasikan)",
    see_stock: "Lihat saham {code}",
    has_note: "ada catatan",
    note_corp: "Perubahan lembar besar tapi persentase kecil; mungkin aksi korporasi (split/rights).",
    note_merge: "Data investor ini digabung dari beberapa baris; selisih bisa dipengaruhi penggabungan.",
    note_type: "Jenis investor berubah dari {prev}.",
    note_entity: "Jumlah lembar dan persentase sama dengan bulan lalu; hanya nama pemegang yang berbeda (sebelumnya {name}). Tidak dihitung sebagai Masuk atau Keluar.",
    note_exit: "Persentase turun di bawah batas lapor 1%. Kepemilikan tidak dipublikasikan dan belum tentu 0 lembar.",
    note_diluted: "Persentase turun di bawah 1% karena emiten menerbitkan saham baru (aksi korporasi). Ini bukan penjualan dan bukan transaksi pemegang.",
    note_corp_event: "Jumlah saham beredar {code} {dir} {pct}% (rights issue atau penerbitan saham). Selisih lembar ini hasil aksi korporasi, bukan pembelian di pasar.",
    note_transfer: "Pemegang di saham ini saling berpindah porsi; selisih bersih kecil dibanding jumlah yang berpindah, jadi bukan akumulasi.",
    dir_up: "naik", dir_down: "turun",
    aria_up: "naik", aria_down: "turun", aria_pp: "poin persentase",
    empty_t: "Tidak ada hasil", empty_p: "Coba filter atau kata kunci lain.", reset: "Atur ulang filter",
    err_t: "Daftar perubahan gagal dimuat", err_p: "Periksa koneksi lalu coba lagi.", err_btn: "Coba Lagi",
    expired: "Sesi berakhir. Masuk lagi untuk melihat daftar lengkap.",
    login: "Masuk dengan Google",
    too_far: "Periode ini terlalu jauh untuk dibandingkan.",
    na_t: "Perbandingan belum tersedia",
    na_p: "Kami butuh data dua bulan. Data bulan sebelumnya sedang disiapkan.",
    not_active_t: "Daftar lengkap belum aktif untuk akunmu",
    not_active_p: "Fitur ini masih dibuka bertahap. Kabari kami lewat Bantuan jika kamu butuh.",
    more: "Muat Lebih Banyak", more_loading: "Memuat...",
    close: "Tutup",
    hist_seg_now: "Pemegang Saat Ini",
    hist_seg_chg: "Riwayat Perubahan",
    hist_seg_chg_pro: "Riwayat Perubahan (Fitur Pro)",
    hist_group: "Tampilan",
    hist_empty: "Tidak ada perubahan pemegang >1% untuk saham ini pada periode ini.",
    hist_lock: "Lihat perubahan pemegang saham ini dari bulan ke bulan.",
    hist_lock_sub: "Riwayat Perubahan adalah Fitur Pro. Daftar pemegang di atas tidak berubah.",
    stk_header: "{to} dibanding {from} · {n} pemegang berubah",
    stk_entity: " · {k} pindah nama (tidak dihitung)"
  },
  mock_extras: {
    paneEmpty: "Pilih saham atau investor untuk melihat detail.",
    paneKeys: "↑ ↓ navigasi · Enter buka · Ctrl K cari · Esc tutup"
  },
  screener: {
    title: "Screener Saham",
    chip: "Screener",
    foreign: "Kepemilikan asing",
    foreign_hint: "Total porsi pemegang asing",
    conc: "Konsentrasi",
    conc_hint: "Porsi gabungan",
    conc_basis: "Hitung dari",
    holders: "Jumlah pemegang",
    holders_hint: "Pemegang ≥1%",
    types: "Jenis pemegang",
    types_hint: "Boleh pilih lebih dari satu",
    tags: {
      b: "Ada BUMN / Sovereign",
      d: "Ada Dapen / Asuransi",
      x: "Institusi asing",
      m: "Mayoritas individu"
    },
    count: "Menampilkan {n} dari {total} saham",
    none: "Tidak ada saham yang cocok. Longgarkan satu filter.",
    empty_t: "Tidak ada saham yang cocok",
    empty_p: "Kombinasi filter ini tidak menghasilkan saham. Coba longgarkan satu filter.",
    apply: "Terapkan Filter",
    reset: "Reset",
    clear: "Hapus semua filter",
    note: "Klasifikasi berdasarkan tipe investor KSEI. Informasi umum, bukan nasihat investasi.",
    opt_all: "Semua",
    sub_top1: "Top 1",
    sub_top3: "Top 3",
    holders_6plus: "> 5",
    edit: "Ubah"
  },
  faq: {
    title: "Pusat Bantuan & FAQ",
    subtitle: "Pertanyaan umum seputar data kepemilikan efek KSEI dan keterbukaan publik IHSG Storm",
    empty: "Tidak ada pertanyaan yang sesuai.",
    empty_desc: "Coba gunakan kata kunci lain atau pilih topik Semua Topik.",
    items: FAQ_ITEMS
  },
  faq_items: FAQ_ITEMS
};
