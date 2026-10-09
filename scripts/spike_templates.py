"""scripts/spike_templates.py — HTML and XML templates for SEO spike pre-rendering."""
import html
import json
from pathlib import Path


def format_number(num: int) -> str:
    """Format integer with Indonesian dot thousands separator."""
    return f"{num:,}".replace(",", ".")


def format_percent(val: float) -> str:
    """Format float percentage with Indonesian comma separator."""
    return f"{val:.2f}%".replace(".", ",")


def render_head_tags(title: str, description: str, canonical_url: str, site_url: str, json_ld: dict) -> str:
    """Render SEO head metadata tags."""
    json_ld_str = json.dumps(json_ld, ensure_ascii=False, indent=2)
    return (
        f'  <meta charset="utf-8">\n'
        f'  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f'  <title>{html.escape(title)}</title>\n'
        f'  <meta name="description" content="{html.escape(description)}">\n'
        f'  <meta name="robots" content="index, follow">\n'
        f'  <link rel="canonical" href="{html.escape(canonical_url)}">\n'
        f'  <link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
        f'  <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">\n'
        f'  <link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
        f'  <meta property="og:type" content="website">\n'
        f'  <meta property="og:url" content="{html.escape(canonical_url)}">\n'
        f'  <meta property="og:title" content="{html.escape(title)}">\n'
        f'  <meta property="og:description" content="{html.escape(description)}">\n'
        f'  <meta property="og:image" content="{site_url}/og-image.png">\n'
        f'  <meta property="og:image:width" content="1200">\n'
        f'  <meta property="og:image:height" content="630">\n'
        f'  <meta name="twitter:card" content="summary_large_image">\n'
        f'  <meta name="twitter:title" content="{html.escape(title)}">\n'
        f'  <meta name="twitter:description" content="{html.escape(description)}">\n'
        f'  <meta name="twitter:image" content="{site_url}/og-image.png">\n'
        f'  <link rel="stylesheet" href="/assets/css/style.css">\n'
        f'  <script type="application/ld+json">\n{json_ld_str}\n  </script>'
    )


def render_stock_page(
    code: str,
    summary: dict,
    holders: list,
    as_of_label: str,
    site_url: str,
    slug_map: dict,
) -> str:
    """Render static pre-rendered HTML for a single stock page."""
    issuer = summary.get("issuer") or code
    total_holders = summary.get("total_holders", len(holders))
    hidden_count = max(0, total_holders - len(holders))
    canonical_url = f"{site_url}/saham/{code.lower()}/"
    page_title = f"Pemegang Saham {code} — {issuer[:35]} | IHSG Storm"
    meta_desc = (
        f"Daftar 5 pemegang saham terbesar {issuer} ({code}) per {as_of_label}. "
        f"Total {total_holders} pemegang saham di atas batas pelaporan KSEI."
    )

    json_ld = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": f"Pemegang Saham {code} - {issuer}",
        "url": canonical_url,
        "description": meta_desc,
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Beranda", "item": f"{site_url}/"},
                {"@type": "ListItem", "position": 2, "name": "Saham", "item": f"{site_url}/saham/"},
                {"@type": "ListItem", "position": 3, "name": code, "item": canonical_url},
            ],
        },
    }

    table_rows = []
    for h in holders:
        rank = h.get("rank", 1)
        inv_name = h.get("investor", "")
        can_key = h.get("investor_canonical", "")
        shares_str = format_number(h.get("shares", 0))
        pct_str = format_percent(h.get("percentage", 0.0))
        origin = "Domestik" if h.get("local_foreign") == "L" else "Asing"
        inv_type = h.get("investor_type") or origin

        if can_key in slug_map:
            slug = slug_map[can_key]
            inv_cell = f'<a href="/investor/{slug}/" class="text-link" style="color:var(--brand,#0b6e5f);font-weight:600">{html.escape(inv_name)}</a>'
        else:
            inv_cell = f'<span style="font-weight:600">{html.escape(inv_name)}</span>'

        table_rows.append(
            f'        <tr style="border-bottom:1px solid var(--line,#e2e8f0)">\n'
            f'          <td style="padding:10px 12px;text-align:center;font-weight:700;color:var(--muted,#64748b)">#{rank}</td>\n'
            f'          <td style="padding:10px 12px">{inv_cell}<br><small style="color:var(--muted,#64748b);font-size:11px">{html.escape(inv_type)}</small></td>\n'
            f'          <td style="padding:10px 12px;text-align:right;font-family:monospace">{shares_str}</td>\n'
            f'          <td style="padding:10px 12px;text-align:right;font-weight:700;color:var(--ink,#0f172a)">{pct_str}</td>\n'
            f'        </tr>'
        )
    rows_html = "\n".join(table_rows)

    lock_card = ""
    if hidden_count > 0:
        lock_card = f"""      <div class="lock-card" style="margin-top:20px;padding:18px;border-radius:10px;background:var(--subtle,#f8fafc);border:1px dashed var(--line,#cbd5e1);text-align:center">
        <div style="font-weight:700;color:var(--ink,#0f172a);margin-bottom:6px">🔒 Lihat {hidden_count} Pemegang Saham Lainnya</div>
        <p style="font-size:13px;color:var(--muted,#64748b);margin:0 0 12px">Tier gratis dibatasi hingga 5 pemegang saham teratas per emiten sesuai ketentuan D10.</p>
        <a href="/" class="btn" style="display:inline-block;padding:8px 16px;border-radius:6px;background:var(--brand,#0b6e5f);color:#fff;text-decoration:none;font-size:13px;font-weight:700">Buka di Aplikasi IHSG Storm</a>
      </div>"""

    return f"""<!doctype html>
<html lang="id">
<head>
{render_head_tags(page_title, meta_desc, canonical_url, site_url, json_ld)}
</head>
<body style="background:var(--bg,#f5f4ef);color:var(--ink,#15181d);margin:0;font-family:system-ui,-apple-system,sans-serif">
  <header style="background:#fff;border-bottom:1px solid var(--line,#e2e8f0);padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
    <a href="/" style="font-weight:800;color:var(--ink,#0f172a);text-decoration:none;font-size:18px">IHSG Storm <span style="font-size:11px;font-weight:400;color:var(--muted,#64748b)">by BAD.AI</span></a>
    <nav style="display:flex;gap:16px;font-size:14px">
      <a href="/saham/" style="color:var(--brand,#0b6e5f);text-decoration:none;font-weight:600">Daftar Saham</a>
      <a href="/investor/" style="color:var(--muted,#64748b);text-decoration:none">Daftar Investor</a>
      <a href="/" style="color:var(--muted,#64748b);text-decoration:none">Beranda</a>
    </nav>
  </header>
  <main style="max-width:860px;margin:30px auto;padding:0 20px" data-page="saham" data-code="{code}">
    <nav aria-label="Breadcrumb" style="font-size:13px;color:var(--muted,#64748b);margin-bottom:16px">
      <a href="/" style="color:inherit;text-decoration:none">Beranda</a> &rsaquo;
      <a href="/saham/" style="color:inherit;text-decoration:none">Saham</a> &rsaquo;
      <span style="color:var(--ink,#0f172a);font-weight:700">{code}</span>
    </nav>
    <div style="background:#fff;border-radius:12px;border:1px solid var(--line,#e2e8f0);padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--line,#e2e8f0);padding-bottom:16px;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div>
          <h1 style="margin:0 0 6px;font-size:24px;font-weight:800">{code} — {html.escape(issuer)}</h1>
          <div style="font-size:13px;color:var(--muted,#64748b)">Snapshot KSEI: <b>{as_of_label}</b> &bull; Total Tercatat: <b>{total_holders} Pemegang Saham</b></div>
        </div>
        <a href="/#/{code}" style="font-size:13px;color:var(--brand,#0b6e5f);text-decoration:none;font-weight:600">Buka Interaktif &rarr;</a>
      </div>
      <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:var(--ink,#0f172a)">5 Pemegang Saham Terbesar</h2>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px;text-align:left">
          <thead>
            <tr style="background:var(--subtle,#f8fafc);border-bottom:2px solid var(--line,#cbd5e1);color:var(--muted,#64748b);font-size:12px;text-transform:uppercase">
              <th style="padding:10px 12px;text-align:center;width:48px">No</th>
              <th style="padding:10px 12px">Pemegang Saham</th>
              <th style="padding:10px 12px;text-align:right">Lembar Saham</th>
              <th style="padding:10px 12px;text-align:right;width:90px">Porsi</th>
            </tr>
          </thead>
          <tbody>
{rows_html}
          </tbody>
        </table>
      </div>
{lock_card}
      <footer style="margin-top:24px;padding-top:16px;border-top:1px solid var(--line,#e2e8f0);font-size:12px;color:var(--muted,#64748b);display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span>Sumber: KSEI per {as_of_label}. Data faktual, bukan nasihat investasi.</span>
        <a href="/saham/" style="color:var(--brand,#0b6e5f);text-decoration:none">Kembali ke Indeks Saham &uarr;</a>
      </footer>
    </div>
  </main>
</body>
</html>"""


def render_investor_page(
    canonical_key: str, holdings: list, as_of_label: str, site_url: str, slug: str
) -> str:
    """Render static pre-rendered HTML for a single investor profile page."""
    display_name = holdings[0].get("raw_name") or holdings[0].get("investor") or canonical_key
    canonical_url = f"{site_url}/investor/{slug}/"
    page_title = f"Portofolio Top Saham {display_name[:40]} | IHSG Storm"
    meta_desc = (
        f"Daftar kepemilikan top-5 {display_name} di {len(holdings)} emiten IHSG per {as_of_label} "
        f"berdasarkan data resmi KSEI."
    )

    json_ld = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": f"Portofolio Saham {display_name}",
        "url": canonical_url,
        "description": meta_desc,
        "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Beranda", "item": f"{site_url}/"},
                {"@type": "ListItem", "position": 2, "name": "Investor", "item": f"{site_url}/investor/"},
                {"@type": "ListItem", "position": 3, "name": display_name[:30], "item": canonical_url},
            ],
        },
    }

    rows = []
    for rank, h in enumerate(holdings, 1):
        code = h["code"]
        issuer = h.get("issuer", code)
        shares_str = format_number(h.get("shares", 0))
        pct_str = format_percent(h.get("percentage", 0.0))
        holder_rank = h.get("rank", 1)
        rows.append(
            f'        <tr style="border-bottom:1px solid var(--line,#e2e8f0)">\n'
            f'          <td style="padding:10px 12px;text-align:center;font-weight:700;color:var(--muted,#64748b)">#{rank}</td>\n'
            f'          <td style="padding:10px 12px"><a href="/saham/{code.lower()}/" style="color:var(--brand,#0b6e5f);font-weight:700;text-decoration:none">{code}</a><br><small style="color:var(--muted,#64748b);font-size:11px">{html.escape(issuer)}</small></td>\n'
            f'          <td style="padding:10px 12px;text-align:center"><span style="background:var(--subtle,#f1f5f9);padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">Peringkat #{holder_rank}</span></td>\n'
            f'          <td style="padding:10px 12px;text-align:right;font-family:monospace">{shares_str}</td>\n'
            f'          <td style="padding:10px 12px;text-align:right;font-weight:700;color:var(--ink,#0f172a)">{pct_str}</td>\n'
            f'        </tr>'
        )
    rows_html = "\n".join(rows)

    return f"""<!doctype html>
<html lang="id">
<head>
{render_head_tags(page_title, meta_desc, canonical_url, site_url, json_ld)}
</head>
<body style="background:var(--bg,#f5f4ef);color:var(--ink,#15181d);margin:0;font-family:system-ui,-apple-system,sans-serif">
  <header style="background:#fff;border-bottom:1px solid var(--line,#e2e8f0);padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
    <a href="/" style="font-weight:800;color:var(--ink,#0f172a);text-decoration:none;font-size:18px">IHSG Storm <span style="font-size:11px;font-weight:400;color:var(--muted,#64748b)">by BAD.AI</span></a>
    <nav style="display:flex;gap:16px;font-size:14px">
      <a href="/saham/" style="color:var(--muted,#64748b);text-decoration:none">Daftar Saham</a>
      <a href="/investor/" style="color:var(--brand,#0b6e5f);text-decoration:none;font-weight:600">Daftar Investor</a>
      <a href="/" style="color:var(--muted,#64748b);text-decoration:none">Beranda</a>
    </nav>
  </header>
  <main style="max-width:860px;margin:30px auto;padding:0 20px" data-page="investor" data-slug="{slug}">
    <nav aria-label="Breadcrumb" style="font-size:13px;color:var(--muted,#64748b);margin-bottom:16px">
      <a href="/" style="color:inherit;text-decoration:none">Beranda</a> &rsaquo;
      <a href="/investor/" style="color:inherit;text-decoration:none">Investor</a> &rsaquo;
      <span style="color:var(--ink,#0f172a);font-weight:700">{html.escape(display_name[:25])}</span>
    </nav>
    <div style="background:#fff;border-radius:12px;border:1px solid var(--line,#e2e8f0);padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800">Portofolio Top Saham — {html.escape(display_name)}</h1>
      <div style="font-size:13px;color:var(--muted,#64748b);margin-bottom:20px">Tercatat di 5 pemegang saham terbesar pada <b>{len(holdings)} emiten</b> (KSEI {as_of_label})</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:14px;text-align:left">
          <thead>
            <tr style="background:var(--subtle,#f8fafc);border-bottom:2px solid var(--line,#cbd5e1);color:var(--muted,#64748b);font-size:12px;text-transform:uppercase">
              <th style="padding:10px 12px;text-align:center;width:48px">No</th>
              <th style="padding:10px 12px">Emiten</th>
              <th style="padding:10px 12px;text-align:center">Posisi</th>
              <th style="padding:10px 12px;text-align:right">Lembar Saham</th>
              <th style="padding:10px 12px;text-align:right;width:90px">Porsi</th>
            </tr>
          </thead>
          <tbody>
{rows_html}
          </tbody>
        </table>
      </div>
      <div style="margin-top:20px;padding:14px;border-radius:8px;background:var(--subtle,#f8fafc);border:1px solid var(--line,#e2e8f0);font-size:13px;color:var(--muted,#64748b)">
        💡 <b>Catatan Tier Publik:</b> Halaman ini hanya merangkum kepemilikan di mana investor menduduki peringkat 1&ndash;5 pemegang saham terbesar. Portofolio komprehensif tersedia di IHSG Storm Pro.
      </div>
      <footer style="margin-top:20px;padding-top:14px;border-top:1px solid var(--line,#e2e8f0);font-size:12px;color:var(--muted,#64748b);display:flex;justify-content:space-between">
        <span>Sumber: KSEI per {as_of_label}. Bukan nasihat investasi.</span>
        <a href="/investor/" style="color:var(--brand,#0b6e5f);text-decoration:none">Indeks Investor &uarr;</a>
      </footer>
    </div>
  </main>
</body>
</html>"""


def render_saham_index(emitens: list, as_of_label: str, site_url: str) -> str:
    """Render /saham/ index page linking to all 961 stock pages."""
    canonical_url = f"{site_url}/saham/"
    page_title = "Daftar Pemegang Saham 961 Emiten IHSG | IHSG Storm"
    meta_desc = f"Indeks lengkap data pemegang saham 961 emiten Bursa Efek Indonesia (BEI) per {as_of_label} bersumber dari KSEI."

    json_ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Daftar Emiten Saham IHSG",
        "url": canonical_url,
        "description": meta_desc,
    }

    links = []
    for e in emitens:
        c = e["code"]
        links.append(
            f'      <a href="/saham/{c.lower()}/" style="display:block;padding:10px 14px;background:#fff;border:1px solid var(--line,#e2e8f0);border-radius:8px;text-decoration:none;color:inherit">\n'
            f'        <b style="color:var(--brand,#0b6e5f);font-size:15px">{c}</b>\n'
            f'        <div style="font-size:12px;color:var(--muted,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{html.escape(e.get("issuer",""))}</div>\n'
            f'      </a>'
        )
    links_html = "\n".join(links)

    return f"""<!doctype html>
<html lang="id">
<head>
{render_head_tags(page_title, meta_desc, canonical_url, site_url, json_ld)}
</head>
<body style="background:var(--bg,#f5f4ef);color:var(--ink,#15181d);margin:0;font-family:system-ui,-apple-system,sans-serif">
  <header style="background:#fff;border-bottom:1px solid var(--line,#e2e8f0);padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
    <a href="/" style="font-weight:800;color:var(--ink,#0f172a);text-decoration:none;font-size:18px">IHSG Storm <span style="font-size:11px;font-weight:400;color:var(--muted,#64748b)">by BAD.AI</span></a>
    <nav style="display:flex;gap:16px;font-size:14px">
      <a href="/saham/" style="color:var(--brand,#0b6e5f);text-decoration:none;font-weight:700">Daftar Saham</a>
      <a href="/investor/" style="color:var(--muted,#64748b);text-decoration:none">Daftar Investor</a>
      <a href="/" style="color:var(--muted,#64748b);text-decoration:none">Beranda</a>
    </nav>
  </header>
  <main style="max-width:1100px;margin:30px auto;padding:0 20px">
    <h1 style="font-size:24px;font-weight:800;margin:0 0 8px">Daftar Pemegang Saham 961 Emiten IHSG</h1>
    <p style="color:var(--muted,#64748b);font-size:14px;margin:0 0 24px">Arsip kepemilikan saham publik KSEI per {as_of_label}. Pilih kode emiten untuk melihat rincian pemegang saham terbesar.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
{links_html}
    </div>
  </main>
</body>
</html>"""


def render_investor_index(
    sample_investors: list, slug_map: dict, as_of_label: str, site_url: str
) -> str:
    """Render /investor/ index page linking to sample investor pages."""
    canonical_url = f"{site_url}/investor/"
    page_title = "Daftar Investor Terbesar Bursa Efek Indonesia | IHSG Storm"
    meta_desc = f"Indeks investor kakap dan pemegang saham pengendali di emiten Bursa Efek Indonesia per {as_of_label}."

    json_ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Daftar Investor Terbesar IHSG",
        "url": canonical_url,
        "description": meta_desc,
    }

    links = []
    for inv in sample_investors:
        key = inv["canonical_key"]
        slug = slug_map.get(key, key.lower())
        name = inv["name"]
        cnt = inv["count"]
        links.append(
            f'      <a href="/investor/{slug}/" style="display:block;padding:12px 16px;background:#fff;border:1px solid var(--line,#e2e8f0);border-radius:8px;text-decoration:none;color:inherit">\n'
            f'        <b style="color:var(--brand,#0b6e5f);font-size:15px">{html.escape(name)}</b>\n'
            f'        <div style="font-size:12px;color:var(--muted,#64748b);margin-top:4px">Top-5 di {cnt} emiten tercatat</div>\n'
            f'      </a>'
        )
    links_html = "\n".join(links)

    return f"""<!doctype html>
<html lang="id">
<head>
{render_head_tags(page_title, meta_desc, canonical_url, site_url, json_ld)}
</head>
<body style="background:var(--bg,#f5f4ef);color:var(--ink,#15181d);margin:0;font-family:system-ui,-apple-system,sans-serif">
  <header style="background:#fff;border-bottom:1px solid var(--line,#e2e8f0);padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
    <a href="/" style="font-weight:800;color:var(--ink,#0f172a);text-decoration:none;font-size:18px">IHSG Storm <span style="font-size:11px;font-weight:400;color:var(--muted,#64748b)">by BAD.AI</span></a>
    <nav style="display:flex;gap:16px;font-size:14px">
      <a href="/saham/" style="color:var(--muted,#64748b);text-decoration:none">Daftar Saham</a>
      <a href="/investor/" style="color:var(--brand,#0b6e5f);text-decoration:none;font-weight:700">Daftar Investor</a>
      <a href="/" style="color:var(--muted,#64748b);text-decoration:none">Beranda</a>
    </nav>
  </header>
  <main style="max-width:960px;margin:30px auto;padding:0 20px">
    <h1 style="font-size:24px;font-weight:800;margin:0 0 8px">Daftar Investor Terbesar Bursa Efek Indonesia</h1>
    <p style="color:var(--muted,#64748b);font-size:14px;margin:0 0 24px">Menampilkan investor yang menduduki 5 posisi pemegang saham terbesar di emiten IHSG per {as_of_label}.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
{links_html}
    </div>
  </main>
</body>
</html>"""


def generate_sitemaps(emitens: list, sample_investors: list, slug_map: dict, site_url: str, out_dir: Path, lastmod: str = "2026-09-30"):
    """Generate sitemap index and sub-sitemaps for saham, investor, and static pages."""
    s_urls = [f"  <url><loc>{site_url}/saham/</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq></url>"]
    for e in emitens:
        s_urls.append(f"  <url><loc>{site_url}/saham/{e['code'].lower()}/</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq></url>")
    (out_dir / "sitemap-saham.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(s_urls) + "\n</urlset>\n", encoding="utf-8")

    i_urls = [f"  <url><loc>{site_url}/investor/</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq></url>"]
    for inv in sample_investors:
        k = inv["canonical_key"]
        slug = slug_map.get(k, k.lower())
        i_urls.append(f"  <url><loc>{site_url}/investor/{slug}/</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq></url>")
    (out_dir / "sitemap-investor.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(i_urls) + "\n</urlset>\n", encoding="utf-8")

    stat_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>{site_url}/</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq></url>\n</urlset>\n'
    (out_dir / "sitemap-static.xml").write_text(stat_xml, encoding="utf-8")

    index_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>{site_url}/sitemap-saham.xml</loc><lastmod>{lastmod}</lastmod></sitemap>\n  <sitemap><loc>{site_url}/sitemap-investor.xml</loc><lastmod>{lastmod}</lastmod></sitemap>\n  <sitemap><loc>{site_url}/sitemap-static.xml</loc><lastmod>{lastmod}</lastmod></sitemap>\n</sitemapindex>\n'
    (out_dir / "sitemap.xml").write_text(index_xml, encoding="utf-8")
