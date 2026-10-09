// Copy strings for IHSG Storm (from Andy's copy-strings.json + Oscar's freemium v2 + Pam's ui-spec v2)

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
    bar_placeholder: "Cari kode saham atau investor...",
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
    col_top_name: "Pemegang Saham Terbesar",
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
    card_conc_desc: "Sebaran emiten berdasarkan porsi kepemilikan pemegang saham terbesar.",
    card_delta_title: "Perubahan Kepemilikan Antar-Bulan",
    card_delta_desc: "Pantau siapa yang akumulasi atau melepas saham besar setiap bulan."
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
  pro_gates: {
    badge: "FITUR PRO",
    btn_pro: "Buka Akses Pro",
    btn_open: "Buka",
    freshness: {
      title: "Pembaruan Otomatis Bulanan",
      benefit: "Dapatkan notifikasi dan data instan setiap kali KSEI merilis arsip baru.",
      cta: "Lihat Paket Pro"
    },
    screener: {
      title: "Screener Pemegang Saham",
      benefit: "Filter saham berdasarkan pengendali, porsi asing, akumulasi, dan free float.",
      cta: "Buka Screener Pro"
    },
    investor_rank: {
      title: "Peringkat Lengkap 5.000+ Investor",
      benefit: "Akses seluruh pemegang saham kakap di BEI dan unduh dataset ke Excel/CSV.",
      cta: "Buka Akses Pro"
    },
    delta: {
      title: "Perubahan Kepemilikan Antar-Bulan",
      benefit: "Pantau investor kakap yang menambah atau melepas posisi dari bulan ke bulan.",
      cta: "Buka Fitur Pro"
    },
    stock_holders: {
      title: "Semua {count} Pemegang Saham & Riwayat",
      benefit: "Buka seluruh daftar pemegang saham ≥1% beserta histori tren kepemilikan bulanan.",
      cta: "Buka Akses Pro"
    },
    investor_portfolio: {
      title: "Portofolio Lengkap & Riwayat Akumulasi",
      benefit: "Lihat seluruh emiten yang dikoleksi investor ini beserta riwayat pergerakan porsinya.",
      cta: "Buka Akses Pro"
    },
    relation_map: {
      title: "Peta Relasi & Kepemilikan Silang",
      benefit: "Visualisasikan jejaring konglomerasi dan hubungan kepemilikan antar-perusahaan.",
      cta: "Tampilkan Peta"
    },
    csv_export: {
      title: "Ekspor Data ke Excel & CSV",
      benefit: "Unduh data mentah kepemilikan untuk analisis mendalam di spreadsheet Anda.",
      cta: "Buka Ekspor Pro"
    }
  },
  pro_sheet: {
    mono_badge: "IHSG STORM PRO",
    title: "Investasi Lebih Percaya Diri dengan Data Investor Kakap",
    subtitle: "Ketahui langkah konglomerat, investor institusi, dan pengendali sebelum pasar bereaksi luas.",
    tier_free: "Gratis",
    tier_investor: "Investor",
    tier_trader: "Pakar / Trader",
    price_free: "Gratis",
    price_investor: "Segera hadir",
    price_trader: "Segera hadir",
    per_month: "",
    note_investor_annual: "Segera hadir",
    note_trader_annual: "Segera hadir",
    table_header_feature: "Fitur",
    table_header_free: "Gratis",
    table_header_investor: "Investor (Segera hadir)",
    table_header_trader: "Pakar (Segera hadir)",
    rows: [
      {
        feature: "Pencarian emiten & investor",
        free: "Semua",
        investor: "Semua",
        trader: "Semua"
      },
      {
        feature: "Daftar pemegang saham per saham",
        free: "5 teratas",
        investor: "Semua",
        trader: "Semua"
      },
      {
        feature: "Peringkat investor bursa",
        free: "20 teratas",
        investor: "5.000+ lengkap",
        trader: "5.000+ lengkap"
      },
      {
        feature: "Deteksi akumulasi / distribusi bulanan",
        free: "-",
        investor: "1 Bulan Terkini",
        trader: "Histori Penuh (Multi-Bulan)"
      },
      {
        feature: "Portofolio grup konglomerasi",
        free: "2 Grup Publik",
        investor: "20+ Konglomerasi & Paus",
        trader: "Lengkap + Valuasi Historis"
      },
      {
        feature: "Watchlist Saham Pintar",
        free: "-",
        investor: "Hingga 10 Saham",
        trader: "Hingga 50 Saham"
      },
      {
        feature: "Ekspor data CSV / Excel",
        free: "-",
        investor: "5x / bulan",
        trader: "50x / bulan"
      },
      {
        feature: "Notifikasi Telegram pemegang baru ≥1%",
        free: "-",
        investor: "Email Bulanan",
        trader: "Bot Telegram Real-time"
      },
      {
        feature: "Perbandingan Multi-Emiten (F7)",
        free: "-",
        investor: "-",
        trader: "Hingga 4 Emiten Sekaligus"
      }
    ],
    btn_waitlist: "Segera Hadir",
    pricing_note: "Layanan akun berbayar sedang disiapkan dan belum dibuka untuk umum."
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
  mock_extras: {
    paneEmpty: "Pilih saham atau investor untuk melihat detail.",
    paneKeys: "↑ ↓ navigasi · Enter buka · Ctrl K cari · Esc tutup"
  }
};
