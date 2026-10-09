"""site_config.py — Single source of truth for site host and URLs.

CEO DECISION (Michael):
Bobby is dropping the domain badai.tech and moving to bad.ai.id.
The production host will change. Never hardcode the host in more than ONE place.

To migrate to the new production host:
1. Update SITE_URL below (or set the SITE_URL environment variable).
2. Run `python scripts/build_site_metadata.py`.
All tags (canonical, og:url, og:image, twitter:image, JSON-LD), sitemap,
robots.txt, and client config will be updated automatically.
"""
import os

# SINGLE CONSTANT: Production site base URL
SITE_URL = os.environ.get("SITE_URL", "https://ihsg.badai.tech").rstrip("/")

# Company website base URL
COMPANY_URL = os.environ.get("COMPANY_URL", "https://badai.tech").rstrip("/")
